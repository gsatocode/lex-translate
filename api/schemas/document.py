from datetime import datetime

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    status: str
    source_lang: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    document_id: str
    job_id: str
