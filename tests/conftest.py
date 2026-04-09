import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from unittest.mock import MagicMock, AsyncMock

from api.models.base import Base
from storage.base import StorageAdapter

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
def mock_storage():
    storage = MagicMock(spec=StorageAdapter)
    storage.upload = AsyncMock()
    storage.download = AsyncMock(return_value=b"fake content")
    storage.delete = AsyncMock()
    storage.presigned_url = MagicMock(return_value="https://r2.example.com/key?sig=xxx")
    return storage


@pytest_asyncio.fixture
async def client(db, mock_storage):
    from api.main import app
    from api.dependencies import get_db, get_storage

    async def override_db():
        yield db

    def override_storage():
        return mock_storage

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_storage] = override_storage
    app.state.limiter.enabled = False

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
    app.state.limiter.enabled = True


@pytest_asyncio.fixture
async def auth_client(client):
    """Authenticated client — registers org+user and sets Authorization header."""
    await client.post(
        "/api/v1/auth/register",
        json={"org_name": "Test Agency", "email": "test@example.com", "password": "password123"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    token = resp.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
