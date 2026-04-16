import pytest
from httpx import AsyncClient, ASGITransport

from api.dependencies import get_db, get_storage
from api.main import app

# --- GET /glossary ---


@pytest.mark.asyncio
async def test_list_glossary_empty(auth_client):
    resp = await auth_client.get("/api/v1/glossary")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_glossary_requires_auth(client):
    resp = await client.get("/api/v1/glossary")
    assert resp.status_code == 403


# --- POST /glossary ---


@pytest.mark.asyncio
async def test_create_glossary_term(auth_client):
    resp = await auth_client.post(
        "/api/v1/glossary",
        json={"source_term": "plaintiff", "target_term": "autor"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["source_term"] == "plaintiff"
    assert data["target_term"] == "autor"
    assert data["domain"] == "legal"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_glossary_term_custom_domain(auth_client):
    resp = await auth_client.post(
        "/api/v1/glossary",
        json={"source_term": "bond", "target_term": "título", "domain": "finance"},
    )
    assert resp.status_code == 201
    assert resp.json()["domain"] == "finance"


@pytest.mark.asyncio
async def test_create_duplicate_term_returns_409(auth_client):
    body = {"source_term": "defendant", "target_term": "réu"}
    await auth_client.post("/api/v1/glossary", json=body)
    resp = await auth_client.post("/api/v1/glossary", json=body)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_list_glossary_after_create(auth_client):
    await auth_client.post(
        "/api/v1/glossary",
        json={"source_term": "court", "target_term": "tribunal"},
    )
    resp = await auth_client.get("/api/v1/glossary")
    assert resp.status_code == 200
    terms = resp.json()
    assert len(terms) >= 1
    assert any(t["source_term"] == "court" for t in terms)


# --- PUT /glossary/{id} ---


@pytest.mark.asyncio
async def test_update_glossary_term(auth_client):
    create_resp = await auth_client.post(
        "/api/v1/glossary",
        json={"source_term": "judge", "target_term": "juiz"},
    )
    term_id = create_resp.json()["id"]

    resp = await auth_client.put(
        f"/api/v1/glossary/{term_id}",
        json={"target_term": "magistrado"},
    )
    assert resp.status_code == 200
    assert resp.json()["target_term"] == "magistrado"
    assert resp.json()["source_term"] == "judge"


@pytest.mark.asyncio
async def test_update_nonexistent_term_returns_404(auth_client):
    resp = await auth_client.put(
        "/api/v1/glossary/nonexistent",
        json={"target_term": "something"},
    )
    assert resp.status_code == 404


# --- DELETE /glossary/{id} ---


@pytest.mark.asyncio
async def test_delete_glossary_term(auth_client):
    create_resp = await auth_client.post(
        "/api/v1/glossary",
        json={"source_term": "witness", "target_term": "testemunha"},
    )
    term_id = create_resp.json()["id"]

    resp = await auth_client.delete(f"/api/v1/glossary/{term_id}")
    assert resp.status_code == 204

    # Confirm it's gone
    resp = await auth_client.get("/api/v1/glossary")
    terms = resp.json()
    assert not any(t["id"] == term_id for t in terms)


@pytest.mark.asyncio
async def test_delete_nonexistent_term_returns_404(auth_client):
    resp = await auth_client.delete("/api/v1/glossary/nonexistent")
    assert resp.status_code == 404


# --- POST /glossary/import ---


@pytest.mark.asyncio
async def test_import_glossary_terms(auth_client):
    resp = await auth_client.post(
        "/api/v1/glossary/import",
        json={
            "terms": [
                {"source_term": "liability", "target_term": "responsabilidade"},
                {"source_term": "damages", "target_term": "danos"},
            ]
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["imported"] == 2
    assert data["skipped"] == 0


@pytest.mark.asyncio
async def test_import_glossary_skips_duplicates(auth_client):
    await auth_client.post(
        "/api/v1/glossary",
        json={"source_term": "contract", "target_term": "contrato"},
    )
    resp = await auth_client.post(
        "/api/v1/glossary/import",
        json={
            "terms": [
                {"source_term": "contract", "target_term": "contrato"},
                {"source_term": "clause", "target_term": "cláusula"},
            ]
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["imported"] == 1
    assert data["skipped"] == 1


@pytest.mark.asyncio
async def test_import_empty_list(auth_client):
    resp = await auth_client.post(
        "/api/v1/glossary/import",
        json={"terms": []},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["imported"] == 0
    assert data["skipped"] == 0


# --- org isolation ---


@pytest.mark.asyncio
async def test_glossary_org_isolation(auth_client, client, db, mock_storage):
    """Org A's glossary terms are not visible to org B."""
    async def override_db():
        yield db

    def override_storage():
        return mock_storage

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_storage] = override_storage

    # Create a term as org A
    await auth_client.post(
        "/api/v1/glossary",
        json={"source_term": "secret-term", "target_term": "termo-secreto"},
    )

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
        resp = await c2.get("/api/v1/glossary")
    assert resp.status_code == 200
    assert not any(t["source_term"] == "secret-term" for t in resp.json())
