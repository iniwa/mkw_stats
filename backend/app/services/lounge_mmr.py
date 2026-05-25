"""Sync Lounge MMR from MKCentral public JSON API."""
import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import SessionStatus, SourceType
from app.models.sessions import PlaySession

MKCENTRAL_BASE = "https://lounge.mkcentral.com"
MMR_MATCH_WINDOW = timedelta(hours=2)
REQUEST_TIMEOUT = 10


def _fetch_player_details(player_id: str, season: int, game: str) -> dict:
    if player_id.isdigit():
        param_key = "mkcId"
    else:
        param_key = "name"

    params = urllib.parse.urlencode({param_key: player_id, "season": season, "game": game})
    url = f"{MKCENTRAL_BASE}/api/player/details?{params}"

    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"MKCentral HTTP error: {e.code}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"MKCentral unreachable: {e.reason}") from e


def _find_best_session(db: Session, change_time: datetime) -> PlaySession | None:
    lower = change_time - MMR_MATCH_WINDOW
    upper = change_time + MMR_MATCH_WINDOW

    candidates = db.scalars(
        select(PlaySession).where(
            PlaySession.source == SourceType.lounge,
            PlaySession.status == SessionStatus.completed,
            PlaySession.lounge_mmr_table_id.is_(None),
            PlaySession.completed_at.isnot(None),
            PlaySession.completed_at >= lower,
            PlaySession.completed_at <= upper,
        )
    ).all()

    if not candidates:
        return None

    def _delta(s: PlaySession) -> float:
        ct = s.completed_at
        if ct is None:
            return float("inf")
        if ct.tzinfo is None:
            ct = ct.replace(tzinfo=timezone.utc)
        return abs((ct - change_time).total_seconds())

    return min(candidates, key=_delta)


def sync_mmr(db: Session, player_id: str, season: int, game: str) -> dict:
    """Fetch the latest unsynced MMR change and attach it to the best-matching session.

    Returns dict with keys: current_mmr, updated_session, message.
    Raises RuntimeError on external API failures (caller converts to 502).
    """
    data = _fetch_player_details(player_id, season, game)
    current_mmr: int | None = data.get("mmr")
    changes: list = data.get("mmrChanges") or []

    if not changes:
        return {"current_mmr": current_mmr, "updated_session": None, "message": "MMRの変更履歴がありません"}

    changes_sorted = sorted(changes, key=lambda c: c["time"], reverse=True)

    existing_ids: set[str] = {
        row[0]
        for row in db.execute(
            select(PlaySession.lounge_mmr_table_id).where(PlaySession.lounge_mmr_table_id.isnot(None))
        ).all()
    }

    for change in changes_sorted:
        change_id = str(change["changeId"])
        if change_id in existing_ids:
            continue

        new_mmr: int = change["newMmr"]
        mmr_delta: int = change["mmrDelta"]
        mmr_before = new_mmr - mmr_delta
        change_time = datetime.fromisoformat(change["time"].replace("Z", "+00:00"))

        candidate = _find_best_session(db, change_time)
        if candidate is None:
            continue

        candidate.lounge_mmr_table_id = change_id
        candidate.lounge_mmr_before = mmr_before
        candidate.lounge_mmr_after = new_mmr
        candidate.lounge_mmr_delta = mmr_delta
        candidate.lounge_mmr_synced_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(candidate)
        return {
            "current_mmr": current_mmr,
            "updated_session": candidate,
            "message": f"セッションに MMR を同期しました（changeId={change_id}）",
        }

    return {
        "current_mmr": current_mmr,
        "updated_session": None,
        "message": "対応する完了済み Lounge セッションが見つかりませんでした",
    }
