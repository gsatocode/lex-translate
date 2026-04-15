import json
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user, get_db, get_storage
from api.models.job import Job
from api.models.translation import OutputDocument, TranslationChunk
from api.models.user import User
from api.models.validation import ValidationReport
from api.schemas.translation import (
    ChunkPair,
    DownloadResponse,
    SideBySideEntry,
    SideBySideResponse,
    TranslationResponse,
    ValidationIssue,
    ValidationReportResponse,
)
from storage.base import StorageAdapter

router = APIRouter()


async def _get_job_or_404(
    job_id: str, org_id: str, db: AsyncSession
) -> Job:
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.org_id == org_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _normalize_validation_issue(payload: dict) -> ValidationIssue:
    return ValidationIssue(
        type=payload.get("type", "validation_issue"),
        message=payload.get("message") or payload.get("description") or "Validation issue",
        severity=payload.get("severity"),
        chunk_index=payload.get("chunk_index"),
    )


@router.get("/{job_id}", response_model=TranslationResponse)
async def get_translation(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = await _get_job_or_404(job_id, current_user.org_id, db)

    result = await db.execute(
        select(TranslationChunk)
        .where(TranslationChunk.job_id == job_id)
        .order_by(TranslationChunk.chunk_index)
    )
    chunks = result.scalars().all()

    return TranslationResponse(
        job_id=job.id,
        status=job.status,
        chunks=[ChunkPair.model_validate(c) for c in chunks],
    )


@router.get("/{job_id}/sidebyside", response_model=SideBySideResponse)
async def get_side_by_side(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_job_or_404(job_id, current_user.org_id, db)

    result = await db.execute(
        select(TranslationChunk)
        .where(TranslationChunk.job_id == job_id)
        .order_by(TranslationChunk.chunk_index)
    )
    chunks = result.scalars().all()

    entries = [
        SideBySideEntry(
            chunk_index=c.chunk_index,
            original_text=c.original_text,
            translated_text=c.translated_text,
        )
        for c in chunks
    ]
    return SideBySideResponse(job_id=job_id, entries=entries)


@router.get("/{job_id}/download", response_model=DownloadResponse)
async def download_translation(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageAdapter = Depends(get_storage),
    format: Literal["pdf", "docx"] = Query(default="pdf"),
):
    await _get_job_or_404(job_id, current_user.org_id, db)

    result = await db.execute(
        select(OutputDocument).where(
            OutputDocument.job_id == job_id,
            OutputDocument.output_format == format,
        )
    )
    output_doc = result.scalar_one_or_none()
    if not output_doc:
        raise HTTPException(
            status_code=404,
            detail=f"Output document not ready for format '{format}'",
        )

    url = storage.presigned_url(output_doc.storage_key, expires_in=3600)
    return DownloadResponse(job_id=job_id, url=url, expires_in=3600)


@router.get("/{job_id}/validation", response_model=ValidationReportResponse)
async def get_validation_report(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_job_or_404(job_id, current_user.org_id, db)

    result = await db.execute(
        select(ValidationReport).where(ValidationReport.job_id == job_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Validation report not found")

    issues = [_normalize_validation_issue(i) for i in json.loads(report.issues)]
    return ValidationReportResponse(
        job_id=job_id,
        passed=report.passed,
        issues=issues,
        created_at=report.created_at,
    )
