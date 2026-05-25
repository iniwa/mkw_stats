Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
If verification would require source changes, stop and report the finding instead of editing.

## Goal

Verify the Lounge completion reason migration and runtime behavior on the Raspberry Pi deployment.

This is a verification-only handoff for the implementation archived at:

- `docs/handoffs/archive/2026-05-25-lounge-manual-finish-preserve.md`

## Background

`PlaySession.completion_reason` was added to distinguish:

- `"manual"`: user ended the session through `POST /api/v1/play-sessions/{id}/finish`
- `"auto"`: Lounge session auto-completed after 12 visible completed races
- `null`: active or unknown

`hide_race()` / `restore_race()` still re-evaluate Lounge auto-finish state, but they must only reopen sessions that were auto-completed. Manually finished sessions must stay completed even if visible completed race count is below 12.

Important Portainer note:

- When using the Portainer API to redeploy stack ID 66, preserve and resend the stack env values.
- If env values are omitted, compose variables may fall back to defaults and the backend can try to bind host port `8000`, conflicting with Portainer itself.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `deploy/portainer-stack.yml`
- `backend/alembic/versions/005_lounge_completion_reason.py`
- `backend/app/services/race_flow.py`
- `backend/app/models/sessions.py`
- `backend/app/schemas/__init__.py`
- `frontend/src/api.ts`

## Files To Edit

None. This handoff is verification-only.

## Constraints

- Do not edit source files.
- Do not change Docker, GHCR, GitHub Actions, or Portainer stack contents except for the normal redeploy operation needed to pull the latest images.
- Do not hard-delete production data.
- If temporary sessions/races are created, finish them and report any residual records.
- Preserve settings values after testing. If a setting must be changed temporarily, restore it and report both values.

## Verification

### 1. GHCR / Portainer

- Confirm the latest backend and frontend images include the commit that added `005_lounge_completion_reason.py`.
- Redeploy the Portainer stack if needed, preserving env values.
- Confirm containers are up:
  - `mkw-postgres`
  - `mkw-backend` on `0.0.0.0:8001->8000`
  - `mkw-frontend` on `0.0.0.0:3030->80`

### 2. Migration

Run Alembic on the backend container:

```bash
alembic upgrade head
alembic current
```

Expected:

- Upgrade reaches `005 (head)`.
- `play_sessions.completion_reason` exists as nullable string/varchar.
- Existing completed sessions with non-null `completed_at` have `completion_reason = 'manual'`.
- Active sessions should have `completion_reason` null unless prior data says otherwise.

### 3. API Sanity

Confirm:

- `GET /api/v1/health` through backend port `8001` returns ok.
- `GET /api/v1/health` through frontend port `3030` proxy returns ok.
- `GET /api/v1/play-sessions?limit=1` includes `completion_reason` in returned session objects.

### 4. Manual Finish Preservation

Create a temporary Lounge session with fewer than 12 completed races:

1. `POST /api/v1/play-sessions` with `source=lounge` and a valid `player_count` such as 12 or 24.
2. Create and complete one Lounge race.
3. Finish the session with `POST /api/v1/play-sessions/{id}/finish`.
4. Confirm the session is `completed` and `completion_reason == "manual"`.
5. Hide the completed race with `POST /api/v1/race-records/{id}/hide`.
6. Confirm the session remains `completed` and `completion_reason == "manual"`.
7. Restore the race with `POST /api/v1/race-records/{id}/restore`.
8. Confirm the session remains `completed` and `completion_reason == "manual"`.

Finish/clean up any temporary active session state before ending.

### 5. Auto Finish Reopen Behavior

Create a temporary Lounge session and complete 12 visible Lounge races:

1. Confirm it auto-completes with `completion_reason == "auto"`.
2. Hide one completed race.
3. Confirm the session reopens to `active`, `completed_at` is null, and `completion_reason` is null.
4. Restore the hidden race.
5. Confirm it auto-completes again with `completion_reason == "auto"`.
6. Finish/leave the final state consistently and report residual data.

### 6. UI Smoke

No UI should visibly expose completion reason in this slice, but the type update must not break the frontend.

Check:

- Dashboard loads.
- Playing loads.
- Records loads and can select a session.
- Lounge loads.
- Console has no JavaScript/React errors.
- 375px width has no horizontal overflow on Records and Lounge.

## Non Goals

- No new UI for `completion_reason`.
- No session deletion/cleanup UI.
- No MMR sync verification unless it is needed to prove the app is healthy.
- No changes to hide/restore UI beyond confirming it still works.

## Expected Report

- Changed files, if any. Expected: none.
- GHCR / Portainer deployment status.
- Alembic migration result.
- DB column/backfill checks.
- Manual finish preservation API result.
- Auto finish reopen API result.
- UI smoke results.
- Residual test data.
- Blocked checks.
- Bugs or design questions for Codex.
