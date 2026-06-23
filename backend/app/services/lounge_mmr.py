"""Sync Lounge MMR from MKCentral public JSON API."""
import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.enums import SessionStatus, SourceType
from app.models.sessions import PlaySession

MKCENTRAL_BASE = "https://lounge.mkcentral.com"
MMR_MATCH_WINDOW = timedelta(hours=2)
REQUEST_TIMEOUT = 10


def lounge_game_for_player_count(player_count: int | None, season: int) -> str | None:
    """Return the MKCentral game string for a given player count and season.

    MKCentral game strings (verified against lounge.mkcentral.com):
    - Season 0/1: single combined stream ``mkworld`` (12p and 24p shared).
    - Season 2+: ``mkworld12p`` for 12-player, ``mkworld24p`` for 24-player.

    Note: ``mkworld`` has no Season 2+; querying it for Season 2 makes the API
    silently fall back to ``mkworld24p`` data, so 12p must use ``mkworld12p``.

    Returns None for unsupported or missing player counts — callers should skip those sessions.
    """
    if season <= 1:
        return "mkworld" if player_count in (12, 24) else None
    if player_count == 12:
        return "mkworld12p"
    if player_count == 24:
        return "mkworld24p"
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
    except (ValueError, UnicodeDecodeError) as e:
        raise RuntimeError(f"MKCentral returned non-JSON response: {e}") from e


def _normalize_mmr_change(change: dict) -> dict | None:
    """Normalize one MKCentral mmrChanges[] entry, supporting field aliases.

    Supported aliases:
    - change_id : changeId | tableId | id
    - new_mmr   : newMmr | mmr
    - mmr_delta : mmrDelta | delta
    - time      : time | verifiedOn | createdOn

    Returns None if any required field is absent or malformed; caller must skip that entry.
    """
    raw_id = None
    for key in ("changeId", "tableId", "id"):
        if change.get(key) is not None:
            raw_id = change[key]
            break
    if raw_id is None:
        return None

    raw_mmr = change["newMmr"] if "newMmr" in change else change.get("mmr")
    if raw_mmr is None:
        return None

    raw_delta = change["mmrDelta"] if "mmrDelta" in change else change.get("delta")
    if raw_delta is None:
        return None

    raw_time = None
    for key in ("time", "verifiedOn", "createdOn"):
        if change.get(key) is not None:
            raw_time = change[key]
            break
    if raw_time is None:
        return None

    try:
        change_id = str(raw_id)
        new_mmr = int(raw_mmr)
        mmr_delta = int(raw_delta)
        change_time = datetime.fromisoformat(str(raw_time).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None

    return {
        "change_id": change_id,
        "new_mmr": new_mmr,
        "mmr_delta": mmr_delta,
        "time": change_time,
    }


def _find_best_session(
    db: Session, change_time: datetime, game: str, season: int
) -> PlaySession | None:
    lower = change_time - MMR_MATCH_WINDOW
    upper = change_time + MMR_MATCH_WINDOW

    # Determine which player_counts are valid for this game+season combination.
    if game == "mkworld24p":
        valid_counts = [24]
    elif game == "mkworld12p":
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
            # Only attach to sessions of the requested season. Legacy rows with an
            # unknown (null) season stay eligible and become tagged on attach; a row
            # already tagged with a different season must not be matched here.
            or_(
                PlaySession.lounge_season == season,
                PlaySession.lounge_season.is_(None),
            ),
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

    Season 2+: fetches mkworld12p (12p) and mkworld24p (24p) as separate streams.
    Season 0/1: fetches the single combined mkworld stream for both player counts.
    Matches each change only to sessions whose player_count maps to the same game.

    Returns dict with keys: current_mmr_12p, current_mmr_24p, updated_session, updated_game, message.
    Raises RuntimeError on external API failures (caller converts to 502).
    """
    games_to_fetch = ["mkworld12p", "mkworld24p"] if season >= 2 else ["mkworld"]

    all_changes: list[tuple[str, dict]] = []
    current_mmr_12p: int | None = None
    current_mmr_24p: int | None = None
    raw_change_count = 0

    for game in games_to_fetch:
        data = _fetch_player_details(player_id, season, game)
        mmr_val: int | None = data.get("mmr")
        if game == "mkworld":
            # Season 0/1 combined stream applies to both player counts.
            current_mmr_12p = mmr_val
            current_mmr_24p = mmr_val
        elif game == "mkworld12p":
            current_mmr_12p = mmr_val
        elif game == "mkworld24p":
            current_mmr_24p = mmr_val
        for change in (data.get("mmrChanges") or []):
            raw_change_count += 1
            normalized = _normalize_mmr_change(change)
            if normalized is not None:
                all_changes.append((game, normalized))

    if not all_changes:
        if raw_change_count > 0:
            message = "MMR同期に利用できる変更履歴がありません"
        else:
            message = "MMRの変更履歴がありません"
        return {
            "current_mmr_12p": current_mmr_12p,
            "current_mmr_24p": current_mmr_24p,
            "updated_session": None,
            "updated_game": None,
            "message": message,
        }

    all_changes_sorted = sorted(all_changes, key=lambda x: x[1]["time"], reverse=True)

    # Map already-synced changeId -> its local session, so a change that is already
    # attached can have its legacy (null) season backfilled from the current response.
    existing_by_id: dict[str, PlaySession] = {
        s.lounge_mmr_table_id: s
        for s in db.scalars(
            select(PlaySession).where(PlaySession.lounge_mmr_table_id.isnot(None))
        ).all()
    }
    existing_ids = set(existing_by_id.keys())

    enriched_any = False
    for game, change in all_changes_sorted:
        change_id = change["change_id"]
        if change_id in existing_ids:
            # This change is already attached to a local session. Observing it in the
            # requested-season response proves the (session, season) association, so a
            # legacy unknown season can be safely backfilled — but a non-null, different
            # season is never overwritten.
            existing = existing_by_id[change_id]
            if existing.lounge_season is None:
                existing.lounge_season = season
                enriched_any = True
            continue

        new_mmr = change["new_mmr"]
        mmr_delta = change["mmr_delta"]
        mmr_before = new_mmr - mmr_delta
        change_time = change["time"]

        candidate = _find_best_session(db, change_time, game, season)
        if candidate is None:
            continue

        candidate.lounge_mmr_table_id = change_id
        candidate.lounge_mmr_before = mmr_before
        candidate.lounge_mmr_after = new_mmr
        candidate.lounge_mmr_delta = mmr_delta
        candidate.lounge_mmr_game = game
        candidate.lounge_season = season
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

    # No new session was attached. If only legacy season metadata was enriched, report
    # that distinctly so the result is not mistaken for a new MMR update.
    if enriched_any:
        db.commit()
        return {
            "current_mmr_12p": current_mmr_12p,
            "current_mmr_24p": current_mmr_24p,
            "updated_session": None,
            "updated_game": None,
            "message": "既存セッションのシーズン情報を補完しました",
        }

    return {
        "current_mmr_12p": current_mmr_12p,
        "current_mmr_24p": current_mmr_24p,
        "updated_session": None,
        "updated_game": None,
        "message": "対応する完了済み Lounge セッションが見つかりませんでした",
    }
