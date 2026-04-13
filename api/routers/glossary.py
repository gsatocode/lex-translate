from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user, get_db
from api.models.glossary import GlossaryTerm
from api.models.user import User
from api.schemas.glossary import (
    GlossaryImportRequest,
    GlossaryImportResponse,
    GlossaryTermCreate,
    GlossaryTermResponse,
    GlossaryTermUpdate,
)

router = APIRouter()


@router.get("", response_model=list[GlossaryTermResponse])
async def list_glossary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(GlossaryTerm)
        .where(GlossaryTerm.org_id == current_user.org_id)
        .order_by(GlossaryTerm.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@router.post("", response_model=GlossaryTermResponse, status_code=201)
async def create_glossary_term(
    body: GlossaryTermCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check for duplicate source_term within the org
    existing = await db.execute(
        select(GlossaryTerm).where(
            GlossaryTerm.org_id == current_user.org_id,
            GlossaryTerm.source_term == body.source_term,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Source term already exists")

    term = GlossaryTerm(
        org_id=current_user.org_id,
        source_term=body.source_term,
        target_term=body.target_term,
        domain=body.domain,
    )
    db.add(term)
    await db.commit()
    await db.refresh(term)
    return term


@router.put("/{term_id}", response_model=GlossaryTermResponse)
async def update_glossary_term(
    term_id: str,
    body: GlossaryTermUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(GlossaryTerm).where(
            GlossaryTerm.id == term_id,
            GlossaryTerm.org_id == current_user.org_id,
        )
    )
    term = result.scalar_one_or_none()
    if not term:
        raise HTTPException(status_code=404, detail="Glossary term not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(term, field, value)

    await db.commit()
    await db.refresh(term)
    return term


@router.delete("/{term_id}", status_code=204)
async def delete_glossary_term(
    term_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(GlossaryTerm).where(
            GlossaryTerm.id == term_id,
            GlossaryTerm.org_id == current_user.org_id,
        )
    )
    term = result.scalar_one_or_none()
    if not term:
        raise HTTPException(status_code=404, detail="Glossary term not found")

    await db.delete(term)
    await db.commit()


@router.post("/import", response_model=GlossaryImportResponse)
async def import_glossary(
    body: GlossaryImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    imported = 0
    skipped = 0

    for item in body.terms:
        existing = await db.execute(
            select(GlossaryTerm).where(
                GlossaryTerm.org_id == current_user.org_id,
                GlossaryTerm.source_term == item.source_term,
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        term = GlossaryTerm(
            org_id=current_user.org_id,
            source_term=item.source_term,
            target_term=item.target_term,
            domain=item.domain,
        )
        db.add(term)
        imported += 1

    await db.commit()
    return GlossaryImportResponse(imported=imported, skipped=skipped)
