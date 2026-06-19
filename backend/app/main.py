from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.db.base import Base
from app.db.engine import engine
import app.models  # noqa: F401 — ensure all models are registered with Base

app = FastAPI(
    title="CMO Dashboard External API",
    version="1.0.0",
    description="Multi-tenant ad operations SaaS — Phase 1 (Meta + Google)",
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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


@app.get("/health")
def health():
    return {"status": "ok", "service": "cmo-external-api", "version": "1.0.0"}
