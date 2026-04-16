import io
import json

import pytest
import pytest_asyncio
from reportlab.pdfgen.canvas import Canvas
from sqlalchemy import select
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from api.models.base import Base
from api.models.document import Document
from api.models.job import Job
from api.models.translation import OutputDocument, TranslationChunk
from api.models.user import Organization, User
from api.models.validation import ValidationReport
from worker.pipeline.orchestrator import _run_pipeline
from worker.pipeline.translation.base import TranslationResult

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session, factory
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


async def _seed_job(session, status="queued") -> tuple[str, str]:
    """Insert a Document + Job and return (doc_id, job_id)."""
    org = Organization(id="org-1", name="Test Org", slug="test-org")
    user = User(id="user-1", org_id="org-1", email="a@b.com", hashed_password="x", role="admin")
    doc = Document(
        id="doc-1",
        org_id="org-1",
        uploaded_by="user-1",
        filename="contract.pdf",
        file_type="pdf",
        storage_key="org-1/doc-1/contract.pdf",
        status="processing",
    )
    job = Job(id="job-1", document_id="doc-1", org_id="org-1", status=status)
    session.add_all([org, user, doc, job])
    await session.commit()
    return "doc-1", "job-1"


@pytest.mark.asyncio
async def test_pipeline_completes_job_successfully(db_session):
    session, factory = db_session
    await _seed_job(session)

    fake_storage = MagicMock()
    fake_storage.download = AsyncMock(return_value=_minimal_pdf())
    fake_storage.upload = AsyncMock()

    fake_llm = MagicMock()
    fake_llm.translate = AsyncMock(return_value=TranslationResult(
        translated_text="The applicant was born on 01/01/1990.",
        tokens_used=100,
        provider="mock",
    ))

    await _run_pipeline("job-1", _session_factory=factory, _storage=fake_storage, _llm=fake_llm)

    result = await session.execute(select(Job).where(Job.id == "job-1"))
    job = result.scalar_one()

    assert job.status == "completed"
    assert job.progress == 100
    assert job.completed_at is not None


@pytest.mark.asyncio
async def test_pipeline_marks_job_failed_on_storage_error(db_session):
    session, factory = db_session
    await _seed_job(session)

    fake_storage = MagicMock()
    fake_storage.download = AsyncMock(side_effect=Exception("R2 unavailable"))

    await _run_pipeline("job-1", _session_factory=factory, _storage=fake_storage, _llm=None)

    result = await session.execute(select(Job).where(Job.id == "job-1"))
    job = result.scalar_one()

    assert job.status == "failed"
    assert "R2 unavailable" in job.error_message


@pytest.mark.asyncio
async def test_pipeline_marks_job_failed_on_llm_error(db_session):
    session, factory = db_session
    await _seed_job(session)

    fake_storage = MagicMock()
    fake_storage.download = AsyncMock(return_value=_minimal_pdf())
    fake_storage.upload = AsyncMock()

    fake_llm = MagicMock()
    fake_llm.translate = AsyncMock(side_effect=Exception("LLM quota exceeded"))

    await _run_pipeline("job-1", _session_factory=factory, _storage=fake_storage, _llm=fake_llm)

    result = await session.execute(select(Job).where(Job.id == "job-1"))
    job = result.scalar_one()

    assert job.status == "failed"
    assert "LLM quota exceeded" in job.error_message


@pytest.mark.asyncio
async def test_pipeline_saves_translation_chunks(db_session):
    session, factory = db_session
    await _seed_job(session)

    fake_storage = MagicMock()
    fake_storage.download = AsyncMock(return_value=_minimal_pdf())
    fake_storage.upload = AsyncMock()

    fake_llm = MagicMock()
    fake_llm.translate = AsyncMock(return_value=TranslationResult(
        translated_text="Translated content.",
        tokens_used=50,
        provider="mock",
    ))

    await _run_pipeline("job-1", _session_factory=factory, _storage=fake_storage, _llm=fake_llm)

    result = await session.execute(
        select(TranslationChunk).where(TranslationChunk.job_id == "job-1")
    )
    chunks = result.scalars().all()
    assert len(chunks) >= 1
    assert chunks[0].tokens_used == 50
    assert chunks[0].llm_provider == "mock"


@pytest.mark.asyncio
async def test_pipeline_saves_validation_report(db_session):
    session, factory = db_session
    await _seed_job(session)

    fake_storage = MagicMock()
    fake_storage.download = AsyncMock(return_value=_minimal_pdf())
    fake_storage.upload = AsyncMock()

    fake_llm = MagicMock()
    fake_llm.translate = AsyncMock(return_value=TranslationResult(
        translated_text="Translated content.",
        tokens_used=10,
        provider="mock",
    ))

    await _run_pipeline("job-1", _session_factory=factory, _storage=fake_storage, _llm=fake_llm)

    result = await session.execute(
        select(ValidationReport).where(ValidationReport.job_id == "job-1")
    )
    report = result.scalar_one_or_none()
    assert report is not None
    issues = json.loads(report.issues)
    assert isinstance(issues, list)


@pytest.mark.asyncio
async def test_pipeline_saves_output_documents(db_session):
    session, factory = db_session
    await _seed_job(session)

    fake_storage = MagicMock()
    fake_storage.download = AsyncMock(return_value=_minimal_pdf())
    fake_storage.upload = AsyncMock()

    fake_llm = MagicMock()
    fake_llm.translate = AsyncMock(return_value=TranslationResult(
        translated_text="Translated.",
        tokens_used=10,
        provider="mock",
    ))

    await _run_pipeline("job-1", _session_factory=factory, _storage=fake_storage, _llm=fake_llm)

    result = await session.execute(
        select(OutputDocument).where(OutputDocument.job_id == "job-1")
    )
    outputs = result.scalars().all()
    formats = {o.output_format for o in outputs}
    assert "pdf" in formats
    assert "docx" in formats


@pytest.mark.asyncio
async def test_pipeline_no_ops_for_missing_job(db_session):
    _, factory = db_session
    fake_storage = MagicMock()
    # Should not raise
    await _run_pipeline("nonexistent-job", _session_factory=factory, _storage=fake_storage, _llm=None)


def _minimal_pdf() -> bytes:
    """Build a minimal real PDF with one sentence for testing."""
    buf = io.BytesIO()
    c = Canvas(buf)
    c.drawString(72, 720, "The applicant was born on 01/01/1990 in Lisbon, Portugal.")
    c.save()
    return buf.getvalue()
