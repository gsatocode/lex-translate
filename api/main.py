from fastapi import FastAPI

app = FastAPI(title="Lex Translate API", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


# Routers are registered after auth, documents, and jobs modules are created.
# They will be added in Tasks 8–10.
