from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user, get_db
from api.models.job import Job
from api.models.translation import TranslationChunk
from api.models.user import User
from api.schemas.usage import JobUsageItem, JobUsageResponse, UsageSummaryResponse

COST_PER_MILLION_TOKENS = 3.0

router = APIRouter()


@router.get("", response_model=UsageSummaryResponse)
async def get_usage_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(
            func.count(func.distinct(Job.id)),
            func.coalesce(
                func.sum(case((Job.status == "completed", 1), else_=0)),
                0,
            ),
            func.coalesce(func.sum(TranslationChunk.tokens_used), 0),
        )
        .select_from(Job)
        .outerjoin(TranslationChunk, TranslationChunk.job_id == Job.id)
        .where(Job.org_id == current_user.org_id)
    )
    row = result.one()
    total_jobs = row[0]
    completed_jobs = int(row[1])
    total_tokens = int(row[2])
    estimated_cost = round(total_tokens * COST_PER_MILLION_TOKENS / 1_000_000, 4)

    return UsageSummaryResponse(
        total_jobs=total_jobs,
        completed_jobs=completed_jobs,
        total_tokens=total_tokens,
        estimated_cost_usd=estimated_cost,
    )


@router.get("/jobs", response_model=JobUsageResponse)
async def get_job_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(
            Job.id,
            Job.document_id,
            Job.status,
            func.coalesce(func.sum(TranslationChunk.tokens_used), 0).label("tokens_used"),
            Job.created_at,
        )
        .outerjoin(TranslationChunk, TranslationChunk.job_id == Job.id)
        .where(Job.org_id == current_user.org_id)
        .group_by(Job.id, Job.document_id, Job.status, Job.created_at)
        .order_by(Job.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()

    jobs = []
    for row in rows:
        tokens = int(row.tokens_used)
        cost = round(tokens * COST_PER_MILLION_TOKENS / 1_000_000, 4)
        jobs.append(
            JobUsageItem(
                job_id=row.id,
                document_id=row.document_id,
                status=row.status,
                tokens_used=tokens,
                estimated_cost_usd=cost,
                created_at=row.created_at.isoformat(),
            )
        )

    return JobUsageResponse(jobs=jobs)
