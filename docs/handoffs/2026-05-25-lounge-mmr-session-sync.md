Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, docs/handoffs/archive/2026-05-25-lounge-mmr-source-investigation.md, and this handoff file before implementation.
This handoff is ready for implementation after the Lounge MMR source investigation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add the first Lounge MMR session-level sync path using MKCentral Lounge public JSON API.

MMR should be associated with Lounge sessions, not individual race records.

## Background

Roadmap decision:

- Lounge race records store manually entered placement and score.
- MMR is session-level and should be obtained automatically.
- When MMR movement is retrieved, attach it to the latest completed Lounge session that does not yet have MMR data unless a later design requires a stricter match key.

Source investigation result:

- Recommendation: `public_json_api`.
- Base URL: `https://lounge.mkcentral.com`.
- Primary endpoint: `GET /api/player/details`.
- Confirmed query shape:
  - `season=<number>`
  - `game=<game_key>`
  - player lookup should use `mkcId=<id>` when `settings.lounge_player_id` is numeric, otherwise `name=<value>`.
- Current known season/game:
  - Season 1: `game=mkworld`
  - Season 2: `game=mkworld24p`
- Relevant response fields:
  - `mmr`
  - `mmrChanges[].changeId`
  - `mmrChanges[].newMmr`
  - `mmrChanges[].mmrDelta`
  - `mmrChanges[].time`
  - `mmrChanges[].score`
  - `mmrChanges[].rank`
  - `mmrChanges[].tier`
  - `mmrChanges[].numPlayers`
- `changeId` is the MKCentral table id. Treat it as an external integer/string table id, not the existing UUID `lounge_table_id` FK.
- `mmr_before = newMmr - mmrDelta`.
- Auth is not required for these GET endpoints.

## Files To Inspect

- `docs/design/ui-redesign-roadmap.md`
- `backend/app/models/lounge.py`
- `backend/app/models/sessions.py`
- `backend/app/models/vr.py`
- `backend/app/schemas/__init__.py`
- `backend/app/api/settings.py`
- `backend/app/api/sessions.py`
- `backend/tests/test_api.py`
- `frontend/src/LoungeView.tsx`
- `frontend/src/SettingsView.tsx`
- `frontend/src/api.ts`

## Files To Edit

- `backend/app/models/vr.py`
- `backend/app/models/sessions.py`
- `backend/app/schemas/__init__.py`
- `backend/app/api/settings.py` if needed
- `backend/app/api/lounge.py` or another focused lounge API module
- `backend/app/api/__init__.py`
- `backend/app/services/lounge_mmr.py` or another focused service module
- `backend/alembic/versions/003_lounge_mmr_sync.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/LoungeView.tsx`
- `frontend/src/SettingsView.tsx`
- `frontend/src/App.css` if needed

## Candidate Data Direction

Use direct session-level fields on `PlaySession`.

Add:

- `lounge_mmr_before: int | None`
- `lounge_mmr_after: int | None`
- `lounge_mmr_delta: int | None`
- `lounge_mmr_table_id: str | None`
- `lounge_mmr_synced_at: datetime | None`

Do not use existing `PlaySession.lounge_table_id` for MKCentral `changeId`; that column is a UUID FK to local `lounge_tables`.

Do not use `RatingSnapshot` in this slice. It has no session FK and its `lounge_table_id` is also a UUID FK, so it does not fit the MKCentral numeric table id cleanly.

Add settings fields:

- `lounge_season: int`, default `2`
- `lounge_game: str`, default `mkworld24p`

Keep existing `lounge_player_id` as a string. For this slice:

- if `lounge_player_id` contains only digits, call MKCentral with `mkcId=<value>`.
- otherwise call with `name=<value>`.
- Settings UI should explain that MKCentral ID is preferred, but name also works.

## Constraints

- Do not scrape HTML.
- Do not call endpoints beyond `https://lounge.mkcentral.com/api/player/details`.
- Do not expose services outside LAN.
- Do not store credentials in source.
- Do not break manual Lounge race recording.
- Do not assign MMR to race records.
- Avoid adding a new dependency if stdlib HTTP is sufficient. If you add a dependency, explain why.
- External API failures must return a clear 502/503-style error and must not modify local data.

## Required Behavior

Add:

```text
POST /api/v1/lounge/mmr-sync
```

Behavior:

1. Load settings.
2. Require `lounge_player_id`; return 400 if missing.
3. Use `settings.lounge_season` and `settings.lounge_game`.
4. Fetch `GET https://lounge.mkcentral.com/api/player/details?...`.
5. Sort `mmrChanges` newest first by `time`.
6. For each change:
   - skip if `changeId` is already stored in any `play_sessions.lounge_mmr_table_id`.
   - find a completed Lounge session with no `lounge_mmr_table_id`.
   - match by time window:
     - prefer sessions where `completed_at` is within ±2 hours of `mmrChanges[].time`.
     - if multiple match, choose the closest `completed_at`.
     - do not attach to active sessions.
7. Store:
   - `lounge_mmr_table_id = str(changeId)`
   - `lounge_mmr_before = newMmr - mmrDelta`
   - `lounge_mmr_after = newMmr`
   - `lounge_mmr_delta = mmrDelta`
   - `lounge_mmr_synced_at = now()`
8. Return a response indicating:
   - current MMR from player details
   - whether a session was updated
   - updated session if any
   - message when no matching completed session exists.

Idempotency:

- repeated sync with the same API data must not attach the same `changeId` twice.
- if no unsynced matching completed session exists, return 200 with `updated_session = null` and a clear message.

Frontend:

- Settings should expose `lounge_player_id`, `lounge_season`, and `lounge_game`.
- Lounge view should have a manual "MMR同期" button.
- Lounge MMR panel should display latest synced MMR before/after/delta from recent sessions when present.
- If no synced data exists, keep the current "未連携" placeholder.
- Do not auto-sync on page load in this slice, even if `lounge_auto_sync` is true. Manual button only.

## Non Goals

- Full Lounge table import.
- Team/opponent/player roster modeling.
- Matchmaking or Discord integration.
- Graphing beyond simple display.
- Auto background sync.
- HTML scraping.
- Credential handling.

## Verification

```text
python -m py_compile <changed backend files>
python -m pytest tests/
npm run typecheck
npm run build
```

Manual/API check:

- settings default/read/update for `lounge_season` and `lounge_game`.
- sync service with mocked MKCentral response.
- numeric `lounge_player_id` uses `mkcId`.
- non-numeric `lounge_player_id` uses `name`.
- matching completed Lounge session is updated.
- no duplicate MMR attachment on repeated sync.
- active session is not modified.
- no matching session returns updated null.
- Lounge view shows synced values.

## Expected Report

Report in Japanese:

- Changed files
- Confirmed Lounge data source
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
