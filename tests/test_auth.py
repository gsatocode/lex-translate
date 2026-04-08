import pytest


@pytest.mark.asyncio
async def test_register_creates_org_and_returns_token(client):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"org_name": "My Law Firm", "email": "lawyer@firm.com", "password": "secure123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_400(client):
    payload = {"org_name": "Firm", "email": "dup@firm.com", "password": "pass1234"}
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_valid_credentials_returns_token(client):
    await client.post(
        "/api/v1/auth/register",
        json={"org_name": "Firm", "email": "user@firm.com", "password": "pass1234"},
    )
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "user@firm.com", "password": "pass1234"}
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client):
    await client.post(
        "/api/v1/auth/register",
        json={"org_name": "Firm", "email": "user2@firm.com", "password": "correct1"},
    )
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "user2@firm.com", "password": "wrong"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(client):
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "ghost@firm.com", "password": "pass"}
    )
    assert resp.status_code == 401
