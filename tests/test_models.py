import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from api.models import (
    Document,
    GlossaryTerm,
    Job,
    Organization,
    OutputDocument,
    TranslationChunk,
    User,
    ValidationReport,
)
from api.models.base import Base


def test_all_models_have_correct_tablenames():
    assert Organization.__tablename__ == "organizations"
    assert User.__tablename__ == "users"
    assert Document.__tablename__ == "documents"
    assert Job.__tablename__ == "jobs"
    assert TranslationChunk.__tablename__ == "translation_chunks"
    assert OutputDocument.__tablename__ == "output_documents"
    assert GlossaryTerm.__tablename__ == "glossary_terms"
    assert ValidationReport.__tablename__ == "validation_reports"


@pytest.fixture
async def sqlite_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_organization_uuid_and_timestamp_set_on_insert(sqlite_session):
    org = Organization(name="Test Firm", slug="test-firm")
    sqlite_session.add(org)
    await sqlite_session.flush()

    assert org.id is not None
    assert len(org.id) == 36
    assert org.id.count("-") == 4
    assert org.created_at is not None


@pytest.mark.asyncio
async def test_user_belongs_to_organization(sqlite_session):
    org = Organization(name="Firm", slug="firm")
    sqlite_session.add(org)
    await sqlite_session.flush()

    user = User(
        org_id=org.id,
        email="lawyer@firm.com",
        hashed_password="hashed",
        role="owner",
    )
    sqlite_session.add(user)
    await sqlite_session.flush()

    assert user.id is not None
    assert user.org_id == org.id
    assert user.role == "owner"


@pytest.mark.asyncio
async def test_all_tables_created_in_sqlite(sqlite_session):
    """Verify all models can create their tables — catches FK and constraint errors."""
    result = await sqlite_session.execute(
        select(Organization).limit(1)
    )
    assert result is not None
