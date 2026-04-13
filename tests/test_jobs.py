import pytest
from unittest.mock import patch


@pytest.mark.asyncio
async def test_get_job_status_after_upload(auth_client, mock_storage):
    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        upload_resp = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("doc.pdf", b"%PDF-1.4", "application/pdf")},
        )
    job_id = upload_resp.json()["job_id"]

    resp = await auth_client.get(f"/api/v1/jobs/{job_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == job_id
    assert data["status"] == "queued"
    assert data["progress"] == 0
    assert data["current_stage"] is None


@pytest.mark.asyncio
async def test_get_job_not_found_returns_404(auth_client):
    resp = await auth_client.get("/api/v1/jobs/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_job_requires_authentication(client):
    resp = await client.get("/api/v1/jobs/some-id")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_cannot_access_other_orgs_job(auth_client, db, mock_storage):
    """A user from org A cannot see org B's job."""
    from httpx import AsyncClient, ASGITransport
    from api.main import app
    from api.dependencies import get_db, get_storage

    async def override_db():
        yield db

    def override_storage():
        return mock_storage

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_storage] = override_storage

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c2:
        await c2.post(
            "/api/v1/auth/register",
            json={"org_name": "Other Firm", "email": "other@firm.com", "password": "password99"},
        )
        login_resp = await c2.post(
            "/api/v1/auth/login",
            json={"email": "other@firm.com", "password": "password99"},
        )
        c2.headers["Authorization"] = f"Bearer {login_resp.json()['access_token']}"

        with patch("api.routers.documents.process_document_task") as mock_task:
            mock_task.delay = lambda job_id: None
            upload_resp = await c2.post(
                "/api/v1/documents/upload",
                files={"file": ("doc.pdf", b"%PDF", "application/pdf")},
            )
        other_job_id = upload_resp.json()["job_id"]

    # auth_client (org A) tries to access org B's job
    resp = await auth_client.get(f"/api/v1/jobs/{other_job_id}")
    assert resp.status_code == 404


# --- chunks endpoint ---


@pytest.mark.asyncio
async def test_get_chunks_returns_empty_for_queued_job(auth_client, mock_storage):
    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        upload = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("doc.pdf", _minimal_pdf(), "application/pdf")},
        )
    job_id = upload.json()["job_id"]
    resp = await auth_client.get(f"/api/v1/jobs/{job_id}/chunks")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_chunks_returns_404_for_unknown_job(auth_client):
    resp = await auth_client.get("/api/v1/jobs/nonexistent/chunks")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_chunks_forbidden_for_other_org(auth_client, client, db, mock_storage):
    from httpx import AsyncClient, ASGITransport
    from api.main import app
    from api.dependencies import get_db, get_storage

    async def override_db():
        yield db

    def override_storage():
        return mock_storage

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_storage] = override_storage

    # Register a second org
    await client.post(
        "/api/v1/auth/register",
        json={"org_name": "Other Agency", "email": "other@example.com", "password": "password123"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "other@example.com", "password": "password123"},
    )
    other_token = resp.json()["access_token"]

    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        upload = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("doc.pdf", _minimal_pdf(), "application/pdf")},
        )
    job_id = upload.json()["job_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c2:
        c2.headers["Authorization"] = f"Bearer {other_token}"
        resp = await c2.get(f"/api/v1/jobs/{job_id}/chunks")
    assert resp.status_code == 404  # opaque 404, not 403


# --- retry endpoint ---


@pytest.mark.asyncio
async def test_retry_queued_job_returns_400(auth_client, mock_storage):
    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        upload = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("doc.pdf", _minimal_pdf(), "application/pdf")},
        )
    job_id = upload.json()["job_id"]
    resp = await auth_client.post(f"/api/v1/jobs/{job_id}/retry")
    # queued job is not failed — retry should be rejected
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_retry_returns_404_for_unknown_job(auth_client):
    resp = await auth_client.post("/api/v1/jobs/nonexistent/retry")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_retry_failed_job_resets_to_queued(auth_client, db, mock_storage):
    """Happy path: a failed job is re-queued and all state fields are reset."""
    from unittest.mock import patch
    from sqlalchemy import update
    from api.models.job import Job

    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        upload = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("doc.pdf", _minimal_pdf(), "application/pdf")},
        )
    job_id = upload.json()["job_id"]

    # Manually place the job in a failed state with stale fields
    await db.execute(
        update(Job).where(Job.id == job_id).values(
            status="failed",
            error_message="previous error",
            progress=42,
            current_stage="translate",
        )
    )
    await db.commit()

    with patch("worker.celery_app.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        resp = await auth_client.post(f"/api/v1/jobs/{job_id}/retry")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "queued"
    assert data["progress"] == 0
    assert data["error_message"] is None
    assert data["current_stage"] is None


@pytest.mark.asyncio
async def test_retry_returns_503_when_queue_unavailable(auth_client, db, mock_storage):
    """If Celery is unreachable, the job is rolled back to failed and 503 is returned."""
    from unittest.mock import patch, MagicMock
    from sqlalchemy import update
    from api.models.job import Job

    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        upload = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("doc.pdf", _minimal_pdf(), "application/pdf")},
        )
    job_id = upload.json()["job_id"]

    await db.execute(
        update(Job).where(Job.id == job_id).values(status="failed", error_message="boom")
    )
    await db.commit()

    with patch("worker.celery_app.process_document_task") as mock_celery:
        mock_celery.delay.side_effect = Exception("Redis is down")
        resp = await auth_client.post(f"/api/v1/jobs/{job_id}/retry")

    assert resp.status_code == 503


def _minimal_pdf() -> bytes:
    import io
    from reportlab.pdfgen.canvas import Canvas
    buf = io.BytesIO()
    c = Canvas(buf)
    c.drawString(72, 720, "Minimal test PDF content.")
    c.save()
    return buf.getvalue()
