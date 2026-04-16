import io

import pytest
from httpx import AsyncClient, ASGITransport
from reportlab.pdfgen.canvas import Canvas
from unittest.mock import patch

from api.dependencies import get_db, get_storage
from api.main import app
from api.models.translation import TranslationChunk


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
    buf = io.BytesIO()
    c = Canvas(buf)
    c.drawString(72, 720, "Minimal test PDF content.")
    c.save()
    return buf.getvalue()


async def _seed_chunks(db, job_id, tokens_per_chunk=500, count=2):
    for i in range(count):
        chunk = TranslationChunk(
            job_id=job_id,
            chunk_index=i,
            original_text=f"original {i}",
            translated_text=f"translated {i}",
            source_lang="en",
            tokens_used=tokens_per_chunk,
            llm_provider="anthropic",
        )
        db.add(chunk)
    await db.commit()


# --- GET /usage ---


@pytest.mark.asyncio
async def test_usage_summary_no_jobs(auth_client):
    resp = await auth_client.get("/api/v1/usage")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_jobs"] == 0
    assert data["completed_jobs"] == 0
    assert data["total_tokens"] == 0
    assert data["estimated_cost_usd"] == 0.0


@pytest.mark.asyncio
async def test_usage_summary_with_tokens(auth_client, db, mock_storage):
    job_id = await _create_job(auth_client, mock_storage)
    await _seed_chunks(db, job_id, tokens_per_chunk=500, count=2)

    resp = await auth_client.get("/api/v1/usage")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_jobs"] == 1
    assert data["completed_jobs"] == 0
    assert data["total_tokens"] == 1000
    # $3/1M tokens * 1000 = 0.003
    assert data["estimated_cost_usd"] == 0.003


@pytest.mark.asyncio
async def test_usage_summary_requires_auth(client):
    resp = await client.get("/api/v1/usage")
    assert resp.status_code == 403


# --- GET /usage/jobs ---


@pytest.mark.asyncio
async def test_job_usage_empty(auth_client):
    resp = await auth_client.get("/api/v1/usage/jobs")
    assert resp.status_code == 200
    assert resp.json()["jobs"] == []


@pytest.mark.asyncio
async def test_job_usage_with_data(auth_client, db, mock_storage):
    job_id = await _create_job(auth_client, mock_storage)
    await _seed_chunks(db, job_id, tokens_per_chunk=1000, count=3)

    resp = await auth_client.get("/api/v1/usage/jobs")
    assert resp.status_code == 200
    jobs = resp.json()["jobs"]
    assert len(jobs) == 1
    assert jobs[0]["job_id"] == job_id
    assert jobs[0]["status"] == "queued"
    assert jobs[0]["tokens_used"] == 3000
    assert jobs[0]["estimated_cost_usd"] == 0.009


@pytest.mark.asyncio
async def test_job_usage_multiple_jobs(auth_client, db, mock_storage):
    job1 = await _create_job(auth_client, mock_storage)
    job2 = await _create_job(auth_client, mock_storage)
    await _seed_chunks(db, job1, tokens_per_chunk=100, count=1)
    await _seed_chunks(db, job2, tokens_per_chunk=200, count=1)

    resp = await auth_client.get("/api/v1/usage/jobs")
    assert resp.status_code == 200
    jobs = resp.json()["jobs"]
    assert len(jobs) == 2


@pytest.mark.asyncio
async def test_job_usage_pagination(auth_client, db, mock_storage):
    job1 = await _create_job(auth_client, mock_storage)
    job2 = await _create_job(auth_client, mock_storage)
    await _seed_chunks(db, job1, tokens_per_chunk=100, count=1)
    await _seed_chunks(db, job2, tokens_per_chunk=200, count=1)

    resp = await auth_client.get("/api/v1/usage/jobs?limit=1&offset=0")
    assert resp.status_code == 200
    assert len(resp.json()["jobs"]) == 1

    resp = await auth_client.get("/api/v1/usage/jobs?limit=1&offset=1")
    assert resp.status_code == 200
    assert len(resp.json()["jobs"]) == 1


@pytest.mark.asyncio
async def test_usage_org_isolation(auth_client, client, db, mock_storage):
    """Org B cannot see org A's usage."""
    async def override_db():
        yield db

    def override_storage():
        return mock_storage

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_storage] = override_storage

    # Org A creates a job with tokens
    job_id = await _create_job(auth_client, mock_storage)
    await _seed_chunks(db, job_id, tokens_per_chunk=500, count=2)

    # Register org B
    await client.post(
        "/api/v1/auth/register",
        json={"org_name": "Other Firm", "email": "other@firm.com", "password": "password123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "other@firm.com", "password": "password123"},
    )
    other_token = login_resp.json()["access_token"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c2:
        c2.headers["Authorization"] = f"Bearer {other_token}"
        resp = await c2.get("/api/v1/usage")
    assert resp.status_code == 200
    assert resp.json()["total_tokens"] == 0
