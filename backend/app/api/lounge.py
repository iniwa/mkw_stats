from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.settings import get_or_create_settings
from app.core.database import get_db
from app.schemas import MmrSyncResponse, PlaySessionRead
from app.services.lounge_mmr import sync_mmr

router = APIRouter(prefix="/api/v1/lounge", tags=["lounge"])


@router.post("/mmr-sync", response_model=MmrSyncResponse)
def mmr_sync(db: Session = Depends(get_db)) -> MmrSyncResponse:
    settings = get_or_create_settings(db)
    if not settings.lounge_player_id:
        raise HTTPException(
            400,
            "lounge_player_id が設定されていません。設定画面で MKCentral ID またはプレイヤー名を設定してください。",
        )
    try:
        result = sync_mmr(db, settings.lounge_player_id, settings.lounge_season)
    except RuntimeError as e:
        raise HTTPException(502, f"MKCentral API エラー: {e}") from e

    updated = None
    if result["updated_session"] is not None:
        updated = PlaySessionRead.model_validate(result["updated_session"])

    return MmrSyncResponse(
        current_mmr_12p=result["current_mmr_12p"],
        current_mmr_24p=result["current_mmr_24p"],
        updated_session=updated,
        updated_game=result["updated_game"],
        message=result["message"],
    )
