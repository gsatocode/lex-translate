import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user, get_db
from api.models.job import Job
from api.models.translation import TranslationChunk
from api.models.user import User
from api.schemas.job import ChunkResponse, JobResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Job).where(
            Job.id == job_id,
            Job.org_id == current_user.org_id,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/{job_id}/chunks", response_model=list[ChunkResponse])
async def get_job_chunks(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify org ownership first (opaque 404 to avoid info leak)
    result = await db.execute(
        select(Job).where(
            Job.id == job_id,
            Job.org_id == current_user.org_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Job not found")

    result = await db.execute(
        select(TranslationChunk)
        .where(TranslationChunk.job_id == job_id)
        .order_by(TranslationChunk.chunk_index)
    )
    return result.scalars().all()


@router.post("/{job_id}/retry", response_model=JobResponse)
async def retry_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Job).where(
            Job.id == job_id,
            Job.org_id == current_user.org_id,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "failed":
        raise HTTPException(
            status_code=400,
            detail=f"Only failed jobs can be retried (current status: {job.status!r})",
        )

    job.status = "queued"
    job.error_message = None
    job.current_stage = None
    job.progress = 0
    await db.commit()

    try:
        from worker.celery_app import process_document_task
        process_document_task.delay(job_id)
    except Exception as exc:
        logger.exception("Failed to enqueue retry for job %s", job_id)
        job.status = "failed"
        job.error_message = "Task queue unavailable"
        await db.commit()
        raise HTTPException(status_code=503, detail="Processing queue unavailable") from exc

    return job
