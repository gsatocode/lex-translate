from datetime import datetime

from pydantic import BaseModel


class JobResponse(BaseModel):
    id: str
    document_id: str
    status: str
    current_stage: str | None
    progress: int
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChunkResponse(BaseModel):
    id: str
    chunk_index: int
    original_text: str
    translated_text: str
    source_lang: str | None
    tokens_used: int | None
    llm_provider: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
