from pydantic import BaseModel


class UsageSummaryResponse(BaseModel):
    total_jobs: int
    completed_jobs: int
    total_tokens: int
    estimated_cost_usd: float


class JobUsageItem(BaseModel):
    job_id: str
    document_id: str
    status: str
    tokens_used: int
    estimated_cost_usd: float
    created_at: str


class JobUsageResponse(BaseModel):
    jobs: list[JobUsageItem]
