Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Investigate and, if the cause is small and clear, fix the remaining `/api/v1/lounge/mmr-sync` HTTP 500 seen during Pi browser verification.

This is primarily a backend reliability/debugging slice. Keep the change narrow.

## Background

Lounge MMR sync uses the MKCentral public JSON API:

- `GET https://lounge.mkcentral.com/api/player/details?...`
- Backend service: `backend/app/services/lounge_mmr.py`
- API endpoint: `POST /api/v1/lounge/mmr-sync`

Recent history:

- A previous bug caused `KeyError: 'changeId'` when MKCentral returned MMR change entries with alternate field names.
- Commit `0d96e85 Handle MKCentral MMR response aliases` added `_normalize_mmr_change()` to accept aliases:
  - `changeId` / `tableId` / `id`
  - `newMmr` / `mmr`
  - `mmrDelta` / `delta`
  - `time` / `verifiedOn` / `createdOn`
- Pi verification after that passed for auto-sync and manual sync.
- A later annotation UI verification reported one unrelated existing `500` from `/api/v1/lounge/mmr-sync` at session start. It was not triggered by annotation testing.

We need to determine whether this is:

- an old browser/session request against a stale backend,
- a new MKCentral response shape,
- a database/session edge case,
- a Japanese message encoding/source-text issue,
- or another backend exception.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `backend/app/services/lounge_mmr.py`
- `backend/app/api/lounge.py`
- `backend/app/schemas/__init__.py`
- `backend/tests/test_api.py`
- `frontend/src/LoungeView.tsx`
- `frontend/src/PlayingView.tsx`
- `docs/design/ui-redesign-roadmap.md`
- `docs/handoffs/archive/2026-05-25-lounge-mmr-response-compat.md` if present
- recent Pi container logs for `mkw-backend`

## Files To Edit

Preferred if a small fix is needed:

- `backend/app/services/lounge_mmr.py`
- `backend/tests/test_api.py`
- `docs/design/ui-redesign-roadmap.md`

Only edit these if you have identified a concrete cause.

Do not edit frontend files unless the backend is proven healthy and the error is caused by bad frontend request behavior. If frontend edits appear necessary, stop and report first.

## Required Investigation

### 1. Confirm Current Deployed State

On Pi:

- Confirm `mkw-backend` is running the image that includes `_normalize_mmr_change()`.
- Confirm `mkw-frontend` is not stale if you use browser UI.
- Confirm migrations are current (`alembic current` should be at current head).
- Confirm `GET /api/v1/settings` includes:
  - `lounge_player_id`
  - `lounge_season`
  - `lounge_auto_sync`

### 2. Reproduce The Endpoint Directly

Call:

```text
POST http://192.168.1.205:8001/api/v1/lounge/mmr-sync
```

Record:

- HTTP status
- response body
- whether it is repeatable

If it returns `200`, then:

- try once through frontend proxy `http://192.168.1.205:3030/api/v1/lounge/mmr-sync`
- try the Lounge UI sync button
- report that the prior 500 is no longer reproducible

### 3. Capture Backend Traceback If 500 Reproduces

If direct or proxy request returns `500`:

- capture relevant `mkw-backend` logs around the request
- include the traceback function/line number
- identify which data shape or DB record caused it

Do not guess from browser console alone.

### 4. Inspect MKCentral Response Shape Safely

If traceback points to parsing/normalization:

- inspect the current MKCentral response for configured `lounge_player_id`, `lounge_season`, and both games when applicable:
  - `mkworld`
  - `mkworld24p`
- Do not commit full raw personal/API response dumps.
- Report only sanitized structure:
  - top-level keys
  - example `mmrChanges[]` keys
  - which keys are missing or unexpected
  - whether `mmrChanges` contains non-dict entries

### 5. Check Source Text Encoding

Inspect `backend/app/services/lounge_mmr.py` for Japanese response messages.

Expected messages should be readable Japanese in source and API responses, for example:

- `MMR同期に利用できる変更履歴がありません`
- `MMRの変更履歴がありません`
- `セッションに MMR を同期しました（changeId=...）`
- `対応する完了済み Lounge セッションが見つかりませんでした`

If the source text is mojibake/corrupted, fix the strings in the same slice and add/adjust tests to assert readable Japanese messages where practical.

PowerShell may display UTF-8 as mojibake. Verify using a reliable method before editing only for display artifacts.

## Allowed Fixes

If the issue is small and clear, implement the fix in this handoff.

Allowed examples:

- `_normalize_mmr_change()` skips non-dict entries safely.
- `_normalize_mmr_change()` accepts one more observed alias.
- `sync_mmr()` handles missing or non-list `mmrChanges` safely.
- `sync_mmr()` handles non-integer top-level `mmr` safely.
- source Japanese messages are restored from mojibake to readable UTF-8.
- tests are added for the reproduced edge case.

Do not expand the matching algorithm, add background jobs, change schema, or change frontend UX in this handoff.

## Constraints

- Keep the fix backend-only unless you stop and ask.
- No Alembic migration.
- No new dependencies.
- No external exposure or Portainer stack behavior changes beyond verification/redeploy.
- Do not commit raw MKCentral response dumps or personal identifiers beyond already configured non-secret names.
- Preserve the existing `User-Agent` header in `_fetch_player_details()`.
- Preserve the 12p/24p split:
  - Season 2+ `mkworld` = 12p
  - Season 2+ `mkworld24p` = 24p
  - Season 0/1 `mkworld` shared by 12p/24p

## Non Goals

- No MMR graph redesign.
- No automatic background sync.
- No Settings UX changes.
- No change to Lounge session matching window unless the traceback proves the current code is crashing there.
- No cleanup of old test sessions.

## Verification

Run locally from `backend/`:

```powershell
python -m py_compile app/services/lounge_mmr.py app/api/lounge.py tests/test_api.py
python -m pytest tests/ -q
```

If frontend files remain untouched, no frontend build is required.

Pi verification after any fix:

- Redeploy backend image if needed.
- Preserve Portainer env values:
  - `DATA_DIR`
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
  - `FRONTEND_PORT=3030`
  - `BACKEND_PORT=8001`
- `GET :8001/api/v1/health` OK.
- Direct `POST :8001/api/v1/lounge/mmr-sync` returns `200` or expected non-500 error.
- Frontend proxy `POST :3030/api/v1/lounge/mmr-sync` returns same class of result.
- Lounge UI sync button does not crash and shows readable message.
- Browser console has no JavaScript/React errors.

## Expected Report

- Changed files, or `None` if investigation-only
- Deployed image / migration state
- Direct API reproduction result
- Proxy/UI reproduction result
- Backend traceback if any
- Sanitized MKCentral response shape if inspected
- Root cause
- Fix summary if implemented
- Test results
- Pi verification result
- Remaining residual risk
- Design questions for Codex
