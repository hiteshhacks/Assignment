from fastapi import FastAPI

from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "CampusMind: an agentic campus assistant "
        "with GraphRAG, tools, live workflows, and self-evaluation."
    ),
)


@app.get("/")
async def root():
    return {
        "message": "Welcome to CampusMind",
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
    }
