"""v1 API routers."""
from fastapi import APIRouter

from app.api import courses, races, sessions, settings, vr_accounts

api_router = APIRouter()
api_router.include_router(settings.router)
api_router.include_router(vr_accounts.router)
api_router.include_router(courses.router)
api_router.include_router(sessions.router)
api_router.include_router(races.router)
