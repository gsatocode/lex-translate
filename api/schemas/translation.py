from datetime import datetime

from pydantic import BaseModel


class ChunkPair(BaseModel):
    chunk_index: int
    original_text: str
    translated_text: str
    source_lang: str | None
    tokens_used: int | None
    llm_provider: str | None

    model_config = {"from_attributes": True}


class TranslationResponse(BaseModel):
    job_id: str
    status: str
    chunks: list[ChunkPair]

    model_config = {"from_attributes": True}


class SideBySideEntry(BaseModel):
    chunk_index: int
    original: str
    translated: str


class SideBySideResponse(BaseModel):
    job_id: str
    entries: list[SideBySideEntry]


class DownloadResponse(BaseModel):
    job_id: str
    url: str
    expires_in: int


class ValidationIssue(BaseModel):
    type: str
    message: str


class ValidationReportResponse(BaseModel):
    job_id: str
    passed: bool
    issues: list[ValidationIssue]
    created_at: datetime
