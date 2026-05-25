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


def lounge_game_for_player_count(player_count: int | None, season: int) -> str | None:
    """Return the MKCentral game string for a given player count and season.

    Returns None for unsupported or missing player counts — callers should skip those sessions.
    """
    if player_count == 12:
        return "mkworld"
    if player_count == 24:
        return "mkworld" if season <= 1 else "mkworld24p"
    return None


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


def _find_best_session(
    db: Session, change_time: datetime, game: str, season: int
) -> PlaySession | None:
    lower = change_time - MMR_MATCH_WINDOW
    upper = change_time + MMR_MATCH_WINDOW

    # Determine which player_counts are valid for this game+season combination.
    if game == "mkworld24p":
        valid_counts = [24]
    elif game == "mkworld" and season >= 2:
        # Season 2+ mkworld is 12p only; 24p uses mkworld24p.
        valid_counts = [12]
    else:
        # mkworld season 0/1: shared stream for both 12p and 24p.
        valid_counts = [12, 24]

    candidates = db.scalars(
        select(PlaySession).where(
            PlaySession.source == SourceType.lounge,
            PlaySession.status == SessionStatus.completed,
            PlaySession.lounge_mmr_table_id.is_(None),
            PlaySession.completed_at.isnot(None),
            PlaySession.completed_at >= lower,
            PlaySession.completed_at <= upper,
            PlaySession.player_count.in_(valid_counts),
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


def sync_mmr(db: Session, player_id: str, season: int) -> dict:
    """Fetch the latest unsynced MMR change and attach it to the best-matching session.

    Fetches mkworld (12p) and, for Season 2+, also mkworld24p (24p).
    Matches each change only to sessions whose player_count maps to the same game.

    Returns dict with keys: current_mmr_12p, current_mmr_24p, updated_session, updated_game, message.
    Raises RuntimeError on external API failures (caller converts to 502).
    """
    games_to_fetch = ["mkworld", "mkworld24p"] if season >= 2 else ["mkworld"]

    all_changes: list[tuple[str, dict]] = []
    current_mmr_12p: int | None = None
    current_mmr_24p: int | None = None

    for game in games_to_fetch:
        data = _fetch_player_details(player_id, season, game)
        mmr_val: int | None = data.get("mmr")
        if game == "mkworld":
            current_mmr_12p = mmr_val
            if season <= 1:
                current_mmr_24p = mmr_val
        elif game == "mkworld24p":
            current_mmr_24p = mmr_val
        for change in (data.get("mmrChanges") or []):
            all_changes.append((game, change))

    if not all_changes:
        return {
            "current_mmr_12p": current_mmr_12p,
            "current_mmr_24p": current_mmr_24p,
            "updated_session": None,
            "updated_game": None,
            "message": "MMRの変更履歴がありません",
        }

    all_changes_sorted = sorted(all_changes, key=lambda x: x[1]["time"], reverse=True)

    existing_ids: set[str] = {
        row[0]
        for row in db.execute(
            select(PlaySession.lounge_mmr_table_id).where(PlaySession.lounge_mmr_table_id.isnot(None))
        ).all()
    }

    for game, change in all_changes_sorted:
        change_id = str(change["changeId"])
        if change_id in existing_ids:
            continue

        new_mmr: int = change["newMmr"]
        mmr_delta: int = change["mmrDelta"]
        mmr_before = new_mmr - mmr_delta
        change_time = datetime.fromisoformat(change["time"].replace("Z", "+00:00"))

        candidate = _find_best_session(db, change_time, game, season)
        if candidate is None:
            continue

        candidate.lounge_mmr_table_id = change_id
        candidate.lounge_mmr_before = mmr_before
        candidate.lounge_mmr_after = new_mmr
        candidate.lounge_mmr_delta = mmr_delta
        candidate.lounge_mmr_game = game
        candidate.lounge_mmr_synced_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(candidate)
        return {
            "current_mmr_12p": current_mmr_12p,
            "current_mmr_24p": current_mmr_24p,
            "updated_session": candidate,
            "updated_game": game,
            "message": f"セッションに MMR を同期しました（changeId={change_id}）",
        }

    return {
        "current_mmr_12p": current_mmr_12p,
        "current_mmr_24p": current_mmr_24p,
        "updated_session": None,
        "updated_game": None,
        "message": "対応する完了済み Lounge セッションが見つかりませんでした",
    }
