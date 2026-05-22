import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import (
    PlaySessionCreate,
    PlaySessionRead,
    RaceDraftRequest,
    RaceRecordRead,
    RaceResponse,
)
from app.services import race_flow

router = APIRouter(prefix="/api/v1", tags=["play-sessions"])


@router.post("/play-sessions", response_model=PlaySessionRead, status_code=status.HTTP_201_CREATED)
def create_play_session(
    payload: PlaySessionCreate, db: Session = Depends(get_db)
):
    return race_flow.create_session(db, payload)


@router.get("/play-sessions/active", response_model=list[PlaySessionRead])
def list_active_play_sessions(db: Session = Depends(get_db)):
    return race_flow.list_active_sessions(db)


@router.get("/play-sessions/{session_id}", response_model=PlaySessionRead)
def get_play_session(session_id: uuid.UUID, db: Session = Depends(get_db)):
    return race_flow.get_session(db, session_id)


@router.get(
    "/play-sessions/{session_id}/races", response_model=list[RaceRecordRead]
)
def list_play_session_races(
    session_id: uuid.UUID,
    include_cancelled: bool = Query(False),
    db: Session = Depends(get_db),
):
    return race_flow.list_session_races(db, session_id, include_cancelled)


@router.post("/play-sessions/{session_id}/finish", response_model=PlaySessionRead)
def finish_play_session(session_id: uuid.UUID, db: Session = Depends(get_db)):
    return race_flow.finish_session(db, session_id)


@router.post(
    "/play-sessions/{session_id}/races/draft",
    response_model=RaceResponse,
    status_code=status.HTTP_201_CREATED,
)
def draft_race(
    session_id: uuid.UUID, payload: RaceDraftRequest, db: Session = Depends(get_db)
) -> RaceResponse:
    race, warnings = race_flow.draft_race(db, session_id, payload)
    return RaceResponse(race=RaceRecordRead.model_validate(race), warnings=warnings)


@router.post("/play-sessions/{session_id}/undo-last-race", response_model=RaceRecordRead)
def undo_last_race(session_id: uuid.UUID, db: Session = Depends(get_db)):
    return race_flow.undo_last_race(db, session_id)
