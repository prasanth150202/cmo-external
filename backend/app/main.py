from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.engine import engine
from app.services.scheduler import start_scheduler, stop_scheduler
import app.models  # noqa: F401 — ensure all models are registered with Base

app = FastAPI(
    title="CMO Dashboard External API",
    version="1.0.0",
    description="Multi-tenant ad operations SaaS — Phase 1 (Meta + Google)",
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
def on_startup():
    # Create all tables if they don't exist yet (dev convenience).
    # In production: use Alembic migrations only.
    Base.metadata.create_all(bind=engine)
    start_scheduler()


@app.on_event("shutdown")
def on_shutdown():
    stop_scheduler()


@app.get("/health")
def health():
    return {"status": "ok", "service": "cmo-external-api", "version": "1.0.0"}
