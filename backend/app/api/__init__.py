"""v1 API routers."""
from fastapi import APIRouter

from app.api import courses, lounge, map_annotations, notes, races, sessions, settings, time_attack, vr_accounts

api_router = APIRouter()
api_router.include_router(settings.router)
api_router.include_router(vr_accounts.router)
api_router.include_router(courses.router)
api_router.include_router(sessions.router)
api_router.include_router(races.router)
api_router.include_router(notes.router)
api_router.include_router(map_annotations.router)
api_router.include_router(lounge.router)
api_router.include_router(time_attack.router)
