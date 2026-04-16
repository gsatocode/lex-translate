import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from api.config import settings


def test_settings_load():
    assert settings.secret_key is not None
    assert settings.database_url.startswith("postgresql")
    assert settings.redis_url.startswith("redis")


@pytest.mark.asyncio
async def test_async_session_factory_pattern():
    """Verify the async session factory pattern works.
    Uses SQLite — asyncpg (PostgreSQL driver) requires a C compiler on Windows.
    The real AsyncSessionLocal from db.session is tested via Docker in Task 12."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        assert isinstance(session, AsyncSession)
    await engine.dispose()
