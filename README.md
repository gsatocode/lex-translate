# lex-translate

Legal document translation API. Accepts PDF and DOCX files, extracts text via OCR, translates using a pluggable LLM provider (Anthropic, OpenAI, or Groq), validates translation quality via back-translation checks, and reconstructs the output in the original format.

## Requirements

- Python 3.12+
- Docker + Docker Compose (for Postgres and Redis)

## Local Setup

```bash
cp .env.example .env
# Fill in at minimum: SECRET_KEY, LLM_PROVIDER, and the matching *_API_KEY
docker compose up -d postgres redis
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn api.main:app --reload
```

## Running Tests

```bash
pytest tests/test_worker/
pytest tests/test_jobs.py
```

## Environment Variables

See `.env.example` for the full list. Required for the worker pipeline:

| Variable | Description |
|----------|-------------|
| `LLM_PROVIDER` | `anthropic` \| `openai` \| `groq` |
| `ANTHROPIC_API_KEY` | Required if `LLM_PROVIDER=anthropic` |
| `OPENAI_API_KEY` | Required if `LLM_PROVIDER=openai` |
| `GROQ_API_KEY` | Required if `LLM_PROVIDER=groq` |
| `SECRET_KEY` | JWT signing secret |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string (for Celery) |

## API Endpoints

FastAPI Swagger UI is available at `http://localhost:8000/docs` when running locally.

### Job Lifecycle

```
queued → processing → completed
                    ↘ failed
```

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/documents/upload` | Upload a PDF or DOCX; returns `job_id` |
| `GET /api/v1/jobs/{job_id}` | Poll job status and progress (0–100) |
| `GET /api/v1/jobs/{job_id}/chunks` | Retrieve translation chunks for a completed job |
| `POST /api/v1/jobs/{job_id}/retry` | Re-queue a `failed` job. Returns 400 if not in `failed` state. |

## OCR Adapters

| Adapter | Format | Notes |
|---------|--------|-------|
| PDFPlumber | PDF (text-layer) | Default for `.pdf` |
| python-docx | DOCX | Default for `.docx` |
| PaddleOCR | Scanned images | Optional — install separately: `pip install paddleocr` (requires CUDA for GPU acceleration) |
