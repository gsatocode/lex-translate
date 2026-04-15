import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user, get_db, get_storage
from api.models.document import Document
from api.models.job import Job
from api.models.user import User
from api.schemas.document import DocumentResponse, UploadResponse
from storage.base import StorageAdapter, StorageError
from worker.celery_app import process_document_task

MAX_FILE_BYTES = 50 * 1024 * 1024  # 50 MB

ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "image/jpeg": "jpg",
    "image/png": "png",
}

VALID_EXTENSIONS: dict[str, str] = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".jpg": "jpg",
    ".jpeg": "jpg",
    ".png": "png",
}

router = APIRouter()


@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageAdapter = Depends(get_storage),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a filename")

    safe_name = Path(file.filename).name

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400, detail=f"Unsupported file type: {file.content_type}"
        )
    file_type = ALLOWED_CONTENT_TYPES[file.content_type]

    ext = Path(safe_name).suffix.lower()
    if VALID_EXTENSIONS.get(ext) != file_type:
        raise HTTPException(status_code=400, detail="File extension does not match content type")

    data = await file.read()
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    # Pre-generate IDs so no intermediate flush is needed
    doc_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    storage_key = f"{current_user.org_id}/{doc_id}/{safe_name}"

    doc = Document(
        id=doc_id,
        org_id=current_user.org_id,
        uploaded_by=current_user.id,
        filename=safe_name,
        file_type=file_type,
        storage_key=storage_key,
        status="queued",
    )
    db.add(doc)

    job = Job(
        id=job_id,
        document_id=doc_id,
        org_id=current_user.org_id,
        status="queued",
    )
    db.add(job)
    await db.commit()  # commit DB before touching external systems

    try:
        await storage.upload(storage_key, data, file.content_type)
    except StorageError:
        await db.execute(delete(Job).where(Job.id == job_id))
        await db.execute(delete(Document).where(Document.id == doc_id))
        await db.commit()
        raise HTTPException(status_code=502, detail="File storage unavailable")

    try:
        process_document_task.delay(job_id)
    except Exception:
        # Task queue unavailable — mark job failed so it doesn't silently hang
        await db.execute(
            update(Job).where(Job.id == job_id).values(
                status="failed", error_message="Task queue unavailable"
            )
        )
        await db.execute(
            update(Document).where(Document.id == doc_id).values(status="failed")
        )
        await db.commit()
        raise HTTPException(status_code=503, detail="Processing queue unavailable")

    return UploadResponse(document_id=doc_id, job_id=job_id)


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(Document)
        .where(Document.org_id == current_user.org_id)
        .order_by(Document.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.org_id == current_user.org_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageAdapter = Depends(get_storage),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.org_id == current_user.org_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    storage_key = doc.storage_key

    # Commit DB deletion first — R2 cleanup is best-effort
    await db.delete(doc)
    await db.commit()

    if storage_key:
        try:
            await storage.delete(storage_key)
        except StorageError:
            pass  # DB record is gone; orphan will be cleaned up by a background job
