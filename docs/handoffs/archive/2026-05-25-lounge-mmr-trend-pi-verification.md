Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
If verification would require source changes, stop and report the finding instead of editing.

## Goal

Verify the Lounge MMR trend panel on the Raspberry Pi deployment.

This is a verification-only handoff for:

- `docs/handoffs/archive/2026-05-25-lounge-mmr-trend.md`

## Background

The Lounge view now includes an `MMR 推移` panel using existing synced session-level MMR fields from `PlaySession`.

The implementation is frontend-only:

- no backend API changes
- no database migration
- no settings changes

The chart should keep 12p and 24p streams separate:

- 12p: `lounge_mmr_game === "mkworld"`
- 24p: `lounge_mmr_game === "mkworld24p"`

Important Portainer note:

- When using the Portainer API to redeploy stack ID 66, preserve and resend stack env values.
- Required env values include `DATA_DIR`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `FRONTEND_PORT=3030`, and `BACKEND_PORT=8001`.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `deploy/portainer-stack.yml`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

None. This handoff is verification-only.

## Constraints

- Do not edit source files.
- Do not modify Portainer stack configuration except for normal redeploy with preserved env values.
- Do not create or leave screenshot files in the repo.
- Do not create persistent test data unless needed. If created, report it.
- Do not run destructive cleanup against production data.

## Verification

### 1. GHCR / Portainer

- Confirm frontend image deployed on Pi includes the Lounge MMR trend implementation.
- Redeploy stack ID 66 if needed, preserving env values.
- Confirm containers are up:
  - `mkw-postgres`
  - `mkw-backend` on `0.0.0.0:8001->8000`
  - `mkw-frontend` on `0.0.0.0:3030->80`

### 2. API Sanity

- `GET http://<pi>:8001/api/v1/health` returns ok.
- `GET http://<pi>:3030/api/v1/health` returns ok through the frontend proxy.
- `GET /api/v1/play-sessions?source=lounge&limit=50` returns successfully and includes `lounge_mmr_*` fields.

### 3. UI Check

Open the Web GUI through the frontend port.

Check Lounge view:

- Lounge loads without a blank screen.
- Existing Lounge summary panel still appears.
- Existing MMR sync panel and `MMR同期` button still appear.
- New `MMR 推移` panel appears directly after the existing MMR panel.
- If synced MMR sessions exist:
  - chart renders without broken layout
  - 12p and 24p labels are visible
  - latest synced list shows newest rows first
  - each row shows date/time, 12p or 24p label, before -> after, and signed delta
- If no synced MMR sessions exist:
  - empty state `同期済みのMMR履歴がありません` appears
  - no console error occurs

### 4. Sync Refresh Check

If `lounge_player_id` is configured and MKCentral API is reachable:

- Click `MMR同期`.
- Confirm sync still completes or reports a clear API error.
- If sync updates a session, confirm Lounge reloads and the `MMR 推移` panel reflects the new data.

If MKCentral API is unavailable or no match is found, report the message and verify the UI remains stable.

### 5. Responsive / Regression

- 375px width: Lounge has no horizontal overflow.
- Browser console: no JavaScript/React errors.
- Spot check:
  - Dashboard loads
  - Playing loads
  - Records loads
  - Analytics loads
  - Courses loads
  - Settings loads

## Non Goals

- No backend changes.
- No automatic/background sync verification.
- No new graph features beyond the MMR trend panel.
- No data cleanup.

## Expected Report

- Changed files, if any. Expected: none.
- GHCR / Portainer status.
- API sanity result.
- Lounge MMR trend UI result.
- Sync refresh result, if tested.
- 375px / console / regression results.
- Residual test data.
- Blocked checks.
- Bugs or design questions for Codex.
