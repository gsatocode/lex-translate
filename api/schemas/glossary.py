from datetime import datetime

from pydantic import BaseModel


class GlossaryTermCreate(BaseModel):
    source_term: str
    target_term: str
    domain: str = "legal"


class GlossaryTermUpdate(BaseModel):
    source_term: str | None = None
    target_term: str | None = None
    domain: str | None = None


class GlossaryTermResponse(BaseModel):
    id: str
    source_term: str
    target_term: str
    domain: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GlossaryImportItem(BaseModel):
    source_term: str
    target_term: str
    domain: str = "legal"


class GlossaryImportRequest(BaseModel):
    terms: list[GlossaryImportItem]


class GlossaryImportResponse(BaseModel):
    imported: int
    skipped: int
