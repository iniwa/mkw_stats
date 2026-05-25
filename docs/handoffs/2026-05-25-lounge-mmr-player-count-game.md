Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Change Lounge MMR sync so 12-player and 24-player Lounge MMR are handled separately.

The game mode must be derived from the local Lounge session `player_count`, not from a single user-selected `lounge_game` setting.

Current mapping:

- Season 2 and later:
  - `player_count == 12` -> MKCentral game `mkworld`
  - `player_count == 24` -> MKCentral game `mkworld24p`
- Season 0 and Season 1:
  - 12p and 24p shared one MMR, so both use MKCentral game `mkworld`

## Background

Pi verification for Lounge MMR sync found two things:

1. MKCentral blocks Python urllib's default User-Agent. This was fixed in commit `304ee24` by sending `User-Agent: Mozilla/5.0`.
2. MKWorld Lounge has separate 12p and 24p MMR from Season 2 onward. The current implementation stores only one `lounge_game` setting and calls one MKCentral game mode, so it can sync the wrong MMR stream to a local session.

Relevant existing behavior:

- `PlaySession.player_count` is already set for Lounge sessions.
- `POST /api/v1/lounge/mmr-sync` currently reads:
  - `settings.lounge_player_id`
  - `settings.lounge_season`
  - `settings.lounge_game`
- `sync_mmr()` currently fetches one `game` and matches the newest unsynced MMR change to the closest completed Lounge session within +/- 2 hours.
- `lounge_game` may remain in the DB/API for compatibility, but it must no longer drive sync behavior.

External source context:

- MKCentral Season 2 pages expose separate 12p/24p views.
- MKCentral notes that Preseason and Season 1 used a single combined MMR, while Season 2 separates 12-player and 24-player events.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/handoffs/archive/2026-05-25-lounge-mmr-session-sync.md`
- `docs/handoffs/2026-05-25-lounge-mmr-pi-verification.md`
- `backend/app/services/lounge_mmr.py`
- `backend/app/api/lounge.py`
- `backend/app/models/sessions.py`
- `backend/app/models/vr.py`
- `backend/app/schemas/__init__.py`
- `backend/alembic/versions/003_lounge_mmr_sync.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/SettingsView.tsx`
- `frontend/src/LoungeView.tsx`

## Files To Edit

- `backend/app/services/lounge_mmr.py`
- `backend/app/api/lounge.py`
- `backend/app/models/sessions.py`
- `backend/app/schemas/__init__.py`
- `backend/alembic/versions/004_lounge_mmr_game.py` (new)
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/SettingsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.css` (only if needed for small UI layout changes)

## Constraints

- Do not change deployment files, GitHub Actions, Dockerfiles, or Portainer stack files.
- Do not remove `app_settings.lounge_game` in this slice. It can remain as a legacy/compatibility field.
- Do not use `settings.lounge_game` for MMR sync after this change.
- Keep `lounge_season` as the single season setting.
- Keep manual sync only. Do not add background jobs or automatic sync scheduling.
- Keep the MKCentral API access in stdlib `urllib`; do not add a new HTTP dependency.
- Keep the `User-Agent: Mozilla/5.0` header.
- Do not hard-delete user data.
- Keep active Lounge sessions protected from MMR sync.
- Hidden/cancelled races are not relevant to MMR sync; do not change race filtering behavior outside this scope.

## Non Goals

- Do not implement MMR graphs.
- Do not implement automatic background sync.
- Do not implement table detail import.
- Do not infer per-race MMR.
- Do not add a second Lounge player identity.
- Do not change the existing Lounge race recording flow.
- Do not redesign the whole Settings or Lounge page.

## Required Backend Behavior

### 1. Add Stored Game Mode On Synced Sessions

Add nullable `play_sessions.lounge_mmr_game` so the app can tell whether a session was synced against 12p or 24p MMR.

Expected column:

- `lounge_mmr_game`: `String(64)`, nullable

Create Alembic revision:

- `backend/alembic/versions/004_lounge_mmr_game.py`
- `down_revision = "003"`

Update `PlaySessionRead` and frontend `PlaySession` types to include:

- `lounge_mmr_game: string | null`

### 2. Derive MKCentral Game From Player Count

Add a small helper in `backend/app/services/lounge_mmr.py`, for example:

```py
def lounge_game_for_player_count(player_count: int | None, season: int) -> str | None:
    if player_count == 12:
        return "mkworld"
    if player_count == 24:
        return "mkworld" if season <= 1 else "mkworld24p"
    return None
```

For unsupported/missing player counts, skip the session for MMR sync rather than guessing.

### 3. Fetch Both Relevant MMR Streams

Change `sync_mmr()` so it no longer accepts or uses a single `game` argument.

Recommended signature:

```py
def sync_mmr(db: Session, player_id: str, season: int) -> dict:
    ...
```

Behavior:

- For Season 2+:
  - fetch player details for `mkworld` (12p)
  - fetch player details for `mkworld24p` (24p)
- For Season 0/1:
  - fetch only `mkworld`
  - treat it as the shared stream for both 12p and 24p sessions
- Keep one or two external API calls per manual sync. Do not loop repeatedly.

The result should include current MMR values for both streams:

```py
{
    "current_mmr_12p": int | None,
    "current_mmr_24p": int | None,
    "updated_session": PlaySession | None,
    "updated_game": str | None,
    "message": str,
}
```

For Season 0/1, it is acceptable for both `current_mmr_12p` and `current_mmr_24p` to contain the shared `mkworld` value.

### 4. Match MMR Changes Only To Same Player Count

When processing `mmrChanges`:

- Tag each fetched change with its game mode.
- Sort all candidate changes newest-first by `time`.
- Skip changes whose `changeId` is already present in `PlaySession.lounge_mmr_table_id`.
- Find the closest completed Lounge session within +/- 2 hours whose `player_count` maps to the same game for that season.
- Do not match a `mkworld24p` change to a 12-player session.
- Do not match a `mkworld` 12p Season 2 change to a 24-player session.
- If a match is found, save:
  - `lounge_mmr_before`
  - `lounge_mmr_after`
  - `lounge_mmr_delta`
  - `lounge_mmr_table_id`
  - `lounge_mmr_game`
  - `lounge_mmr_synced_at`

### 5. API Response

Update `MmrSyncResponse`:

- Replace or deprecate `current_mmr`.
- Required response fields should be:
  - `current_mmr_12p`
  - `current_mmr_24p`
  - `updated_session`
  - `updated_game`
  - `message`

If keeping `current_mmr` temporarily is easier for compatibility, it may remain optional, but the frontend must use the separated fields.

Update `backend/app/api/lounge.py` to call:

```py
sync_mmr(db, settings.lounge_player_id, settings.lounge_season)
```

Also fix any mojibake Japanese messages in this file if touched.

## Required Frontend Behavior

### Settings

Settings should no longer present a manual Lounge game-mode selector as the source of truth.

Implement this minimal change:

- Keep Lounge player ID field.
- Keep Lounge season field.
- Remove or disable the game mode select.
- Show static helper text saying 12p/24p is selected automatically from the Lounge session `player_count`.
- Do not send `lounge_game` from the Settings save action unless needed for legacy compatibility.

Do not remove `lounge_game` from the TypeScript `Settings` type unless the backend schema also removes it. Keeping it as a legacy field is acceptable.

### Lounge View

Update the MMR panel to show separated current MMR values:

- 12p MMR
- 24p MMR

When a session is synced, display the synced session's mode using `updated_game` or `updated_session.lounge_mmr_game`.

Existing synced-session metrics should still work:

- latest synced MMR
- previous delta
- before value
- synced count

If both MMR values are null, keep the existing "not linked / sync with button" style placeholder.

## Tests

Update or add backend tests for:

- `lounge_game_for_player_count(12, 2) == "mkworld"`
- `lounge_game_for_player_count(24, 2) == "mkworld24p"`
- `lounge_game_for_player_count(24, 1) == "mkworld"`
- MMR sync fetches both game streams for Season 2.
- A 12-player completed Lounge session only matches the `mkworld` stream.
- A 24-player completed Lounge session only matches the `mkworld24p` stream.
- Active sessions are not modified.
- Existing idempotency still works.
- `lounge_mmr_game` is included in session reads.
- `User-Agent: Mozilla/5.0` header test remains passing.

Update frontend typecheck/build expectations.

## Verification

Run:

```bash
cd backend
python -m py_compile app/services/lounge_mmr.py app/api/lounge.py app/models/sessions.py app/schemas/__init__.py tests/test_api.py
python -m pytest tests/ -q

cd ../frontend
npm run typecheck
npm run build
```

If local PostgreSQL is unavailable, do not block on live Alembic execution. The migration will be verified on Pi in a later handoff.

Optional browser check if a local/Pi backend is reachable:

- Settings no longer implies a single game mode controls MMR sync.
- Lounge MMR panel shows 12p and 24p values separately.
- Manual sync button still works and shows errors without crashing.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Backend behavior changes
- Frontend behavior changes
- Migration details
- Verification results
- Blocked checks
- Design questions for Codex
