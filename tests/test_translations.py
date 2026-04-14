import json

import pytest
from unittest.mock import patch

from api.models.translation import OutputDocument, TranslationChunk
from api.models.validation import ValidationReport


# --- helpers ---

async def _create_job(auth_client, mock_storage):
    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        resp = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("doc.pdf", _minimal_pdf(), "application/pdf")},
        )
    return resp.json()["job_id"]


def _minimal_pdf() -> bytes:
    import io
    from reportlab.pdfgen.canvas import Canvas
    buf = io.BytesIO()
    c = Canvas(buf)
    c.drawString(72, 720, "Minimal test PDF content.")
    c.save()
    return buf.getvalue()


async def _seed_chunks(db, job_id, count=2):
    for i in range(count):
        chunk = TranslationChunk(
            job_id=job_id,
            chunk_index=i,
            original_text=f"original {i}",
            translated_text=f"translated {i}",
            source_lang="en",
            tokens_used=100 + i,
            llm_provider="anthropic",
        )
        db.add(chunk)
    await db.commit()


# --- GET /{job_id} ---


@pytest.mark.asyncio
async def test_get_translation_returns_chunks(auth_client, db, mock_storage):
    job_id = await _create_job(auth_client, mock_storage)
    await _seed_chunks(db, job_id, count=3)

    resp = await auth_client.get(f"/api/v1/translations/{job_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == job_id
    assert data["status"] == "queued"
    assert len(data["chunks"]) == 3
    assert data["chunks"][0]["chunk_index"] == 0
    assert data["chunks"][0]["original_text"] == "original 0"


@pytest.mark.asyncio
async def test_get_translation_empty_chunks(auth_client, db, mock_storage):
    job_id = await _create_job(auth_client, mock_storage)
    resp = await auth_client.get(f"/api/v1/translations/{job_id}")
    assert resp.status_code == 200
    assert resp.json()["chunks"] == []


@pytest.mark.asyncio
async def test_get_translation_not_found(auth_client):
    resp = await auth_client.get("/api/v1/translations/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_translation_requires_auth(client):
    resp = await client.get("/api/v1/translations/some-id")
    assert resp.status_code == 403


# --- GET /{job_id}/sidebyside ---


@pytest.mark.asyncio
async def test_side_by_side_returns_entries(auth_client, db, mock_storage):
    job_id = await _create_job(auth_client, mock_storage)
    await _seed_chunks(db, job_id, count=2)

    resp = await auth_client.get(f"/api/v1/translations/{job_id}/sidebyside")
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == job_id
    assert len(data["entries"]) == 2
    assert data["entries"][0]["original"] == "original 0"
    assert data["entries"][0]["translated"] == "translated 0"


@pytest.mark.asyncio
async def test_side_by_side_not_found(auth_client):
    resp = await auth_client.get("/api/v1/translations/nonexistent/sidebyside")
    assert resp.status_code == 404


# --- GET /{job_id}/download ---


@pytest.mark.asyncio
async def test_download_returns_presigned_url(auth_client, db, mock_storage):
    job_id = await _create_job(auth_client, mock_storage)
    output = OutputDocument(
        job_id=job_id, output_format="pdf", storage_key=f"org/doc/output.pdf"
    )
    db.add(output)
    await db.commit()

    resp = await auth_client.get(f"/api/v1/translations/{job_id}/download")
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == job_id
    assert data["url"].startswith("https://")
    assert data["expires_in"] == 3600


@pytest.mark.asyncio
async def test_download_no_output_returns_404(auth_client, db, mock_storage):
    job_id = await _create_job(auth_client, mock_storage)
    resp = await auth_client.get(f"/api/v1/translations/{job_id}/download")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_download_unknown_job_returns_404(auth_client):
    resp = await auth_client.get("/api/v1/translations/nonexistent/download")
    assert resp.status_code == 404


# --- GET /{job_id}/validation ---


@pytest.mark.asyncio
async def test_validation_report_returns_issues(auth_client, db, mock_storage):
    job_id = await _create_job(auth_client, mock_storage)
    issues = [{"type": "spelling", "message": "Misspelled word: teh"}]
    report = ValidationReport(
        job_id=job_id, passed=False, issues=json.dumps(issues)
    )
    db.add(report)
    await db.commit()

    resp = await auth_client.get(f"/api/v1/translations/{job_id}/validation")
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == job_id
    assert data["passed"] is False
    assert len(data["issues"]) == 1
    assert data["issues"][0]["type"] == "spelling"


@pytest.mark.asyncio
async def test_translation_org_isolation(auth_client, client, db, mock_storage):
    """A user from org A cannot see org B's translation."""
    from httpx import AsyncClient, ASGITransport
    from api.main import app
    from api.dependencies import get_db, get_storage

    async def override_db():
        yield db

    def override_storage():
        return mock_storage

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_storage] = override_storage

    await client.post(
        "/api/v1/auth/register",
        json={"org_name": "Other Firm", "email": "other@firm.com", "password": "password123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "other@firm.com", "password": "password123"},
    )
    other_token = login_resp.json()["access_token"]

    job_id = await _create_job(auth_client, mock_storage)
    await _seed_chunks(db, job_id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c2:
        c2.headers["Authorization"] = f"Bearer {other_token}"
        resp = await c2.get(f"/api/v1/translations/{job_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_validation_report_not_found(auth_client, db, mock_storage):
    job_id = await _create_job(auth_client, mock_storage)
    resp = await auth_client.get(f"/api/v1/translations/{job_id}/validation")
    assert resp.status_code == 404
