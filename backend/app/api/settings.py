from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import AppSettings, Character, Vehicle, VrAccount
from app.schemas import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/v1", tags=["settings"])

SETTINGS_ID = 1


def get_or_create_settings(db: Session) -> AppSettings:
    settings = db.get(AppSettings, SETTINGS_ID)
    if settings is None:
        settings = AppSettings(id=SETTINGS_ID)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/settings", response_model=SettingsRead)
def read_settings(db: Session = Depends(get_db)) -> AppSettings:
    return get_or_create_settings(db)


@router.patch("/settings", response_model=SettingsRead)
def update_settings(
    payload: SettingsUpdate, db: Session = Depends(get_db)
) -> AppSettings:
    settings = get_or_create_settings(db)
    changes = payload.model_dump(exclude_unset=True)

    if changes.get("selected_vr_account_id") is not None:
        if db.get(VrAccount, changes["selected_vr_account_id"]) is None:
            raise HTTPException(404, "selected_vr_account_id does not exist")
    if changes.get("selected_character_id") is not None:
        if db.get(Character, changes["selected_character_id"]) is None:
            raise HTTPException(404, "selected_character_id does not exist")
    if changes.get("selected_vehicle_id") is not None:
        if db.get(Vehicle, changes["selected_vehicle_id"]) is None:
            raise HTTPException(404, "selected_vehicle_id does not exist")

    for field, value in changes.items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
