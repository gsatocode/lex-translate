import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from storage.base import StorageError


@pytest.mark.asyncio
async def test_upload_pdf_returns_document_and_job_ids(auth_client, mock_storage):
    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        resp = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("contract.pdf", b"%PDF-1.4 content here", "application/pdf")},
        )
    assert resp.status_code == 201
    data = resp.json()
    assert "document_id" in data
    assert "job_id" in data


@pytest.mark.asyncio
async def test_upload_unsupported_type_returns_400(auth_client):
    with patch("api.routers.documents.process_document_task"):
        resp = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("notes.txt", b"text content", "text/plain")},
        )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_requires_authentication(client):
    resp = await client.post(
        "/api/v1/documents/upload",
        files={"file": ("test.pdf", b"content", "application/pdf")},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_documents_returns_empty_for_new_org(auth_client):
    resp = await auth_client.get("/api/v1/documents")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_documents_returns_uploaded_document(auth_client, mock_storage):
    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("doc.pdf", b"%PDF content", "application/pdf")},
        )
    resp = await auth_client.get("/api/v1/documents")
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) == 1
    assert docs[0]["filename"] == "doc.pdf"


@pytest.mark.asyncio
async def test_get_document_not_found_returns_404(auth_client):
    resp = await auth_client.get("/api/v1/documents/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_document_removes_it(auth_client, mock_storage):
    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        upload_resp = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("del.pdf", b"%PDF", "application/pdf")},
        )
    doc_id = upload_resp.json()["document_id"]
    del_resp = await auth_client.delete(f"/api/v1/documents/{doc_id}")
    assert del_resp.status_code == 204
    get_resp = await auth_client.get(f"/api/v1/documents/{doc_id}")
    assert get_resp.status_code == 404


# ── CRITICAL: file size limit ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_oversized_file_returns_413(auth_client):
    big_file = b"%PDF" + b"x" * (51 * 1024 * 1024)
    with patch("api.routers.documents.process_document_task"):
        resp = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("big.pdf", big_file, "application/pdf")},
        )
    assert resp.status_code == 413


# ── CRITICAL: Celery dispatch failure ────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_returns_503_when_task_queue_unavailable(auth_client, mock_storage, db):
    def raise_broker_error(_job_id):
        raise RuntimeError("Redis connection refused")

    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = raise_broker_error
        resp = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("q.pdf", b"%PDF-1.4", "application/pdf")},
        )
    assert resp.status_code == 503

    # Job must be marked failed — not silently stuck as "queued"
    from sqlalchemy import select
    from api.models.job import Job
    result = await db.execute(select(Job))
    jobs = result.scalars().all()
    assert len(jobs) == 1
    assert jobs[0].status == "failed"


# ── CRITICAL: list pagination ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_documents_pagination(auth_client, mock_storage):
    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        for i in range(3):
            await auth_client.post(
                "/api/v1/documents/upload",
                files={"file": (f"doc{i}.pdf", b"%PDF", "application/pdf")},
            )

    resp = await auth_client.get("/api/v1/documents?limit=2&offset=0")
    assert resp.status_code == 200
    assert len(resp.json()) == 2

    resp2 = await auth_client.get("/api/v1/documents?limit=2&offset=2")
    assert resp2.status_code == 200
    assert len(resp2.json()) == 1


# ── HIGH: path traversal in filename ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_path_traversal_filename_is_sanitized(auth_client, mock_storage):
    captured_keys = []

    async def capture_upload(key, data, content_type):
        captured_keys.append(key)

    mock_storage.upload = capture_upload

    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        resp = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("../../etc/passwd.pdf", b"%PDF", "application/pdf")},
        )
    assert resp.status_code == 201
    assert len(captured_keys) == 1
    # Storage key must not contain ".." — path traversal stripped
    assert ".." not in captured_keys[0]
    assert "passwd.pdf" in captured_keys[0]


# ── HIGH: delete — DB committed even if storage deletion fails ────────────────

@pytest.mark.asyncio
async def test_delete_succeeds_even_if_storage_delete_fails(auth_client, mock_storage):
    with patch("api.routers.documents.process_document_task") as mock_task:
        mock_task.delay = lambda job_id: None
        upload_resp = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("gone.pdf", b"%PDF", "application/pdf")},
        )
    doc_id = upload_resp.json()["document_id"]

    # Simulate R2 being unavailable during delete
    mock_storage.delete = AsyncMock(side_effect=StorageError("R2 unavailable"))

    del_resp = await auth_client.delete(f"/api/v1/documents/{doc_id}")
    assert del_resp.status_code == 204  # DB deletion committed regardless

    get_resp = await auth_client.get(f"/api/v1/documents/{doc_id}")
    assert get_resp.status_code == 404  # record is gone from DB


# ── MEDIUM: missing filename ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_without_filename_returns_400(auth_client):
    with patch("api.routers.documents.process_document_task"):
        resp = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("", b"%PDF", "application/pdf")},
        )
    # 422 from FastAPI's multipart layer or 400 from our explicit check — both reject
    assert resp.status_code in (400, 422)


# ── MEDIUM: extension / content-type mismatch ────────────────────────────────

@pytest.mark.asyncio
async def test_upload_extension_content_type_mismatch_returns_400(auth_client):
    with patch("api.routers.documents.process_document_task"):
        resp = await auth_client.post(
            "/api/v1/documents/upload",
            files={"file": ("malware.exe", b"MZ content", "application/pdf")},
        )
    assert resp.status_code == 400
