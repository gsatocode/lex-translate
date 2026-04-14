from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from api.limiter import limiter
from api.routers import auth, documents, glossary, jobs, translations, usage

app = FastAPI(title="Lex Translate API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["jobs"])
app.include_router(translations.router, prefix="/api/v1/translations", tags=["translations"])
app.include_router(glossary.router, prefix="/api/v1/glossary", tags=["glossary"])
app.include_router(usage.router, prefix="/api/v1/usage", tags=["usage"])


@app.get("/health")
async def health():
    return {"status": "ok"}
