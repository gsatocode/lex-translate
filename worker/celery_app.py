from celery import Celery

from api.config import settings
from worker.pipeline.orchestrator import run_pipeline

celery_app = Celery(
    "lex_translate",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(name="process_document")
def process_document_task(job_id: str) -> None:
    run_pipeline(job_id)
