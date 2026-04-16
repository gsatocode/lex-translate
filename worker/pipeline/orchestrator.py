import asyncio
import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from api.config import settings
from api.models.document import Document
from api.models.glossary import GlossaryTerm
from api.models.job import Job
from api.models.translation import OutputDocument, TranslationChunk
from api.models.validation import ValidationReport
from worker.pipeline.detect import detect_language
from worker.pipeline.glossary.enforcer import filter_glossary
from worker.pipeline.ocr.docx_adapter import DocxAdapter
from worker.pipeline.ocr.paddle_adapter import PaddleOCRAdapter
from worker.pipeline.ocr.pdf_adapter import PDFOCRAdapter
from worker.pipeline.segmentation.chunker import chunk_text
from worker.pipeline.translation.base import LLMAdapter, TranslationResult
from worker.pipeline.validation.checker import validate_translation

logger = logging.getLogger(__name__)

_STAGE_PROGRESS = {
    "ocr": 15,
    "detect": 20,
    "chunk": 25,
    "translate_done": 75,
    "validate": 85,
    "rebuild": 95,
}


def _resolve_ocr_adapter(file_type: str):
    if file_type == "pdf":
        return PDFOCRAdapter()
    if file_type == "docx":
        return DocxAdapter()
    return PaddleOCRAdapter()


def _get_default_llm() -> LLMAdapter:
    provider = settings.llm_provider.lower()
    if provider == "anthropic":
        from worker.pipeline.translation.anthropic import AnthropicAdapter
        return AnthropicAdapter()
    if provider == "openai":
        from worker.pipeline.translation.openai import OpenAIAdapter
        return OpenAIAdapter()
    if provider == "groq":
        from worker.pipeline.translation.groq import GroqAdapter
        return GroqAdapter()
    raise ValueError(f"Unknown LLM_PROVIDER: {provider!r}")


def _safe_error_message(exc: Exception) -> str:
    """Return a user-safe error string. Full detail is in the logs.

    LLM provider SDK exceptions include internal endpoint paths, request IDs,
    and response bodies that must not reach API callers in a multi-tenant service.
    """
    from anthropic import APIError as AnthropicAPIError
    from openai import APIError as OpenAIAPIError
    if isinstance(exc, (AnthropicAPIError, OpenAIAPIError)):
        return f"LLM provider error ({type(exc).__name__}). See job logs for details."
    return str(exc)[:200]


async def _set_job(db: AsyncSession, job: Job, **kwargs) -> None:
    """Apply kwargs as attributes on job and commit the session."""
    for k, v in kwargs.items():
        setattr(job, k, v)
    await db.commit()


async def _run_pipeline(
    job_id: str,
    *,
    _session_factory: async_sessionmaker | None = None,
    _storage=None,
    _llm: LLMAdapter | None = None,
) -> None:
    """Core async pipeline. Keyword-only overrides are for testing."""
    if _session_factory is None:
        from db.session import AsyncSessionLocal
        session_factory = AsyncSessionLocal
    else:
        session_factory = _session_factory

    if _storage is None:
        from storage.r2 import R2Storage
        storage = R2Storage()
    else:
        storage = _storage

    async with session_factory() as db:
        # -- Load job --
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            logger.error("run_pipeline: job %s not found — skipping", job_id)
            return

        result = await db.execute(select(Document).where(Document.id == job.document_id))
        doc = result.scalar_one_or_none()
        if not doc or not doc.storage_key:
            if doc:
                doc.status = "failed"
            await _set_job(db, job, status="failed", error_message="Document record missing")
            return

        try:
            doc.status = "processing"
            await _set_job(
                db, job,
                status="processing",
                current_stage="ocr",
                progress=0,
                started_at=datetime.now(timezone.utc),
            )

            # -- OCR --
            file_data = await storage.download(doc.storage_key)
            ocr_adapter = _resolve_ocr_adapter(doc.file_type)
            ocr_result = await ocr_adapter.extract(file_data)
            if not ocr_result.text.strip():
                raise RuntimeError("No extractable text found in document")

            doc.page_count = ocr_result.page_count
            await _set_job(db, job, current_stage="ocr", progress=_STAGE_PROGRESS["ocr"])

            # -- Language detection --
            await _set_job(db, job, current_stage="detect", progress=_STAGE_PROGRESS["ocr"])
            source_lang = await detect_language(ocr_result.text)
            doc.source_lang = source_lang
            await db.commit()
            await _set_job(db, job, current_stage="detect", progress=_STAGE_PROGRESS["detect"])

            # -- Chunking --
            await _set_job(db, job, current_stage="chunk", progress=_STAGE_PROGRESS["detect"])
            chunks = chunk_text(ocr_result.text)
            await _set_job(db, job, current_stage="chunk", progress=_STAGE_PROGRESS["chunk"])

            # -- Load org glossary --
            glossary_rows = await db.execute(
                select(GlossaryTerm).where(GlossaryTerm.org_id == job.org_id)
            )
            glossary_map: dict[str, str] = {
                row.source_term: row.target_term
                for row in glossary_rows.scalars().all()
            }

            # -- Translation --
            await _set_job(db, job, current_stage="translate", progress=_STAGE_PROGRESS["chunk"])
            llm = _llm or _get_default_llm()
            translation_pairs: list[tuple[str, str]] = []
            total = max(len(chunks), 1)

            for chunk in chunks:
                filtered_glossary = filter_glossary(glossary_map, chunk.text)

                translation: TranslationResult | None = None
                last_exc: Exception | None = None
                for attempt in range(3):
                    try:
                        translation = await llm.translate(
                            text=chunk.text,
                            source_lang=source_lang,
                            context=chunk.context,
                            glossary_terms=filtered_glossary,
                        )
                        break
                    except Exception as exc:
                        last_exc = exc
                        logger.warning(
                            "Translation attempt %d/3 failed for chunk %d of job %s: %s",
                            attempt + 1, chunk.index, job_id, exc,
                        )

                if translation is None:
                    raise RuntimeError(
                        f"Translation failed after 3 attempts on chunk {chunk.index}: {last_exc}"
                    )

                db.add(TranslationChunk(
                    job_id=job_id,
                    chunk_index=chunk.index,
                    original_text=chunk.text,
                    translated_text=translation.translated_text,
                    source_lang=source_lang,
                    tokens_used=translation.tokens_used,
                    llm_provider=translation.provider,
                ))
                translation_pairs.append((chunk.text, translation.translated_text))

                chunk_progress = _STAGE_PROGRESS["chunk"] + int(
                    (chunk.index + 1) / total
                    * (_STAGE_PROGRESS["translate_done"] - _STAGE_PROGRESS["chunk"])
                )
                job.progress = chunk_progress

            await db.commit()
            await _set_job(db, job, current_stage="translate", progress=_STAGE_PROGRESS["translate_done"])

            # -- Validation --
            await _set_job(db, job, current_stage="validate", progress=_STAGE_PROGRESS["translate_done"])
            validation = validate_translation(translation_pairs)
            db.add(ValidationReport(
                job_id=job_id,
                passed=validation.passed,
                issues=json.dumps([
                    {
                        "type": iss.type,
                        "severity": iss.severity,
                        "description": iss.description,
                        "chunk_index": iss.chunk_index,
                    }
                    for iss in validation.issues
                ]),
            ))
            await db.commit()
            await _set_job(db, job, current_stage="validate", progress=_STAGE_PROGRESS["validate"])

            # -- Reconstruction --
            await _set_job(db, job, current_stage="rebuild", progress=_STAGE_PROGRESS["validate"])
            from worker.pipeline.reconstruction.docx_builder import build_docx
            from worker.pipeline.reconstruction.pdf_builder import build_pdf

            pdf_bytes = build_pdf(translation_pairs, doc.filename)
            docx_bytes = build_docx(translation_pairs, doc.filename)
            await _set_job(db, job, current_stage="rebuild", progress=_STAGE_PROGRESS["rebuild"])

            # -- Upload outputs --
            pdf_key = f"{job.org_id}/{job_id}/output.pdf"
            docx_key = f"{job.org_id}/{job_id}/output.docx"
            await storage.upload(pdf_key, pdf_bytes, "application/pdf")
            await storage.upload(
                docx_key,
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
            db.add(OutputDocument(job_id=job_id, output_format="pdf", storage_key=pdf_key))
            db.add(OutputDocument(job_id=job_id, output_format="docx", storage_key=docx_key))
            await db.commit()

            # -- Done --
            doc.status = "completed"
            await _set_job(
                db, job,
                status="completed",
                current_stage=None,
                progress=100,
                completed_at=datetime.now(timezone.utc),
            )
            logger.info("Job %s completed successfully", job_id)

        except Exception as exc:
            logger.exception("Pipeline failed for job %s", job_id)
            try:
                doc.status = "failed"
                await _set_job(
                    db, job,
                    status="failed",
                    error_message=_safe_error_message(exc),
                    completed_at=datetime.now(timezone.utc),
                )
            except Exception:
                logger.exception(
                    "Pipeline error-handler could not persist failed status for job %s — "
                    "job may be stuck in 'processing'",
                    job_id,
                )


def run_pipeline(job_id: str) -> None:
    """Sync entry point called from the Celery task."""
    asyncio.run(_run_pipeline(job_id))
