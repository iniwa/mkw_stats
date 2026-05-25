Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
This is a verification-only handoff. Do not edit source files unless Codex explicitly approves a fix.

## Goal

Verify the Records hidden race recovery implementation on the Raspberry Pi deployment.

The implementation adds:

- `POST /api/v1/race-records/{race_id}/restore`
- Records UI toggle to include hidden races
- hidden row styling/tag
- restore button for hidden rows

## Background

Implementation handoff completed and reviewed:

- `docs/handoffs/archive/2026-05-25-records-hidden-race-recovery.md`

Important deployment note:

- Portainer Stack uses environment variables for host ports.
- If redeploying through Portainer API, preserve or resend existing stack env values.
- In particular, keep:
  - `DATA_DIR=/home/iniwa/docker/mkw-stats`
  - `FRONTEND_PORT=3030`
  - `BACKEND_PORT=8001`
- If env values are omitted, compose defaults may bind backend `8000`, which conflicts with Portainer itself.
- See `docs/decisions/2026-05-25-portainer-api-env-preservation.md`.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-25-portainer-api-env-preservation.md`
- `docs/handoffs/archive/2026-05-25-records-hidden-race-recovery.md`
- `backend/app/api/races.py`
- `backend/app/services/race_flow.py`
- `frontend/src/RecordsView.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`

## Files To Edit

None. Verification only.

## Constraints

- Do not change source files.
- Do not hard-delete any production data.
- It is acceptable to create a small completed test session/race if needed.
- If test race data is created, finish/close any active session before reporting.
- Hidden records must remain excluded by default.
- Cancelled records must continue to behave as before.
- Restoring a ranked hidden record must not be expected to recalculate account `current_vr`.
- Do not alter Portainer stack env values or ports.

## Verification

### 1. Deployment State

Confirm the latest backend/frontend images are running on Pi:

- `mkw-backend` up on `0.0.0.0:8001->8000`
- `mkw-frontend` up on `0.0.0.0:3030->80`
- `mkw-postgres` up

If redeploy is needed, use Portainer UI/API with image pull enabled and preserve existing env values.

### 2. API Sanity

Check:

- `GET http://<pi-host>:8001/api/v1/health`
- `GET http://<pi-host>:3030/api/v1/health`
- OpenAPI contains:
  - `POST /api/v1/race-records/{race_id}/restore`
  - `GET /api/v1/play-sessions/{session_id}/races` with `include_hidden`

### 3. API Behavior

Use an existing test session/race if suitable, or create a small completed test session.

Verify:

- Hide a visible race with `POST /api/v1/race-records/{race_id}/hide`
- Default race list excludes it:
  - `GET /api/v1/play-sessions/{session_id}/races`
- `include_hidden=true` includes it:
  - `GET /api/v1/play-sessions/{session_id}/races?include_hidden=true`
- Restore it:
  - `POST /api/v1/race-records/{race_id}/restore`
- Default race list includes it again.
- Calling restore again is idempotent and returns HTTP 200.
- Unknown race id returns 404.

If practical, verify Lounge auto-finish consistency:

- A Lounge session with 12 visible completed races is `completed`.
- Hiding one visible completed race reopens it to `active`.
- Restoring that race returns it to `completed`.

### 4. Records UI Behavior

In the Web GUI:

- Open Records.
- Select a session with races.
- Confirm the new `非表示も表示` toggle appears in the race detail area.
- With the toggle off, hidden rows are not shown.
- Enable the toggle.
- Confirm hidden rows appear with:
  - `非表示` tag
  - visually distinct hidden styling
  - `表示に戻す` button
  - no edit/cancel/hide buttons on hidden rows
- Click restore, accept the confirm dialog.
- Confirm the row becomes visible in the normal list.
- Toggle off again and confirm no restored row disappears.
- Verify cancelled rows still show their cancelled tag/style and existing behavior.

### 5. Responsive / Console

Check:

- 375px viewport has no horizontal overflow on Records.
- Browser console has no React/JavaScript errors.
- Existing views still load:
  - Dashboard
  - Playing
  - Records
  - Analytics
  - Courses
  - Lounge
  - Settings

## Non Goals

- No code edits.
- No new recovery UI beyond what was implemented.
- No permanent hard deletion.
- No Analytics behavior changes.
- No MMR sync changes.
- No Portainer stack redesign.

## Expected Report

Report in Japanese:

- Changed files, if any
- GHCR / Portainer deployment status
- API verification results
- Records UI verification results
- Responsive / console results
- Residual test data
- Blocked checks
- Bugs found
- Design questions for Codex
