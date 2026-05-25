import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import RaceCompleteLoungeRequest, RaceCompleteRankedRequest, RaceRecordRead, RaceUpdateRequest
from app.services import race_flow

router = APIRouter(prefix="/api/v1", tags=["race-records"])


@router.patch("/race-records/{race_id}/complete-ranked", response_model=RaceRecordRead)
def complete_ranked_race(
    race_id: uuid.UUID, payload: RaceCompleteRankedRequest, db: Session = Depends(get_db)
):
    return race_flow.complete_ranked(db, race_id, payload)


@router.patch("/race-records/{race_id}/complete-lounge", response_model=RaceRecordRead)
def complete_lounge_race(
    race_id: uuid.UUID, payload: RaceCompleteLoungeRequest, db: Session = Depends(get_db)
):
    return race_flow.complete_lounge(db, race_id, payload)


@router.patch("/race-records/{race_id}", response_model=RaceRecordRead)
def update_race_record(
    race_id: uuid.UUID, payload: RaceUpdateRequest, db: Session = Depends(get_db)
):
    return race_flow.update_race(db, race_id, payload)


@router.post("/race-records/{race_id}/cancel", response_model=RaceRecordRead)
def cancel_race_record(race_id: uuid.UUID, db: Session = Depends(get_db)):
    return race_flow.cancel_race(db, race_id)


@router.post("/race-records/{race_id}/hide", response_model=RaceRecordRead)
def hide_race_record(race_id: uuid.UUID, db: Session = Depends(get_db)):
    return race_flow.hide_race(db, race_id)
