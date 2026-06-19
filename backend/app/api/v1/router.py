from fastapi import APIRouter
from app.api.v1.endpoints import auth, oauth_meta, oauth_google, brands, dashboard, analytics, reports

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(oauth_meta.router)
api_router.include_router(oauth_google.router)
api_router.include_router(brands.router)
api_router.include_router(dashboard.router)
api_router.include_router(analytics.router)
api_router.include_router(reports.router)
