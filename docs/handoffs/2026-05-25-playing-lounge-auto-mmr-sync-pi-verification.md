Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
If verification would require source edits, stop and report instead of editing.

## Goal

Verify commit `edf0466` (`Add Playing Lounge auto MMR sync`) on the Raspberry Pi deployment.

This is a verification-only handoff. Do not modify source files.

## Background

The previous implementation added frontend-only Playing behavior:

- `PlayingView` reads `settings.lounge_auto_sync`
- when a Lounge session becomes `completed` from Playing, it calls `api.mmrSync()` once if auto sync is enabled
- MMR sync failure is non-blocking
- manual MMR sync in Lounge view remains unchanged

Local verification completed:

- `npm run typecheck`
- `npm run build`

Live behavior still needs Pi verification because it depends on deployed frontend, backend, PostgreSQL state, and MKCentral API connectivity.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `deploy/portainer-stack.yml`
- `frontend/src/PlayingView.tsx`
- `frontend/src/SettingsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/api.ts`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

None.

Do not edit source files in this handoff.

## Deployment / Environment Notes

Target:

- Raspberry Pi deployment
- containers: `mkw-postgres`, `mkw-backend`, `mkw-frontend`
- frontend: `http://192.168.1.205:3030`
- backend direct: `http://192.168.1.205:8001`

If redeploying through Portainer API, preserve all stack environment variables:

- `DATA_DIR`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `FRONTEND_PORT=3030`
- `BACKEND_PORT=8001`

Important: if Portainer API payload omits env values, compose defaults may be used and backend can attempt to bind host port `8000`, conflicting with Portainer itself.

## Verification

### 1. GHCR / Deploy State

Confirm that the deployed frontend contains commit `edf0466` behavior.

Acceptable checks:

- GHCR image with latest or SHA tag includes the commit
- deployed frontend bundle contains the auto-sync strings:
  - `MMRを自動同期しています`
  - `MMR自動同期`
- `mkw-frontend` was recreated after the image was pulled

Confirm containers are up:

- `mkw-postgres`
- `mkw-backend`
- `mkw-frontend`

### 2. API Sanity

Check:

- `GET http://192.168.1.205:8001/api/v1/health`
- `GET http://192.168.1.205:3030/api/v1/health`
- `GET /api/v1/settings` includes `lounge_auto_sync`
- `POST /api/v1/lounge/mmr-sync` still exists in OpenAPI

Do not leave settings in an unintended state. If you change `lounge_auto_sync` or `lounge_player_id`, restore them or report final values clearly.

### 3. Auto Sync Disabled Case

Set `lounge_auto_sync=false` via Settings UI or API.

In Playing:

- start a small Lounge session
- create/complete at least one race if needed
- manually finish the session
- verify no MMR auto-sync notice appears
- verify no `/api/v1/lounge/mmr-sync` request is made from this flow if network inspection is available

Finish/close any test session so no active session remains.

### 4. Auto Sync Enabled: Manual Finish

Set `lounge_auto_sync=true`.

In Playing:

- start a Lounge session
- record at least one race
- manually finish the session
- verify a compact notice appears:
  - syncing notice during request, if visible
  - success/info notice: `MMR自動同期: ...`
  - or warning notice if no matching MMR change / MKCentral failure
- verify the session remains completed even if sync reports no match or error
- verify browser console has no JavaScript/React errors

If the auto sync actually attaches an MMR change, record:

- session id
- `lounge_mmr_before`
- `lounge_mmr_after`
- `lounge_mmr_delta`
- `lounge_mmr_game`
- `lounge_mmr_table_id`

### 5. Auto Sync Enabled: 12-Race Auto Complete

If practical, create a 12-player Lounge session and complete 12 races.

Verify:

- after race 12, the session becomes completed automatically
- MMR auto-sync notice appears once
- no repeated sync notice appears from re-rendering
- the finished screen remains usable

If this is too time-consuming, it is acceptable to skip with explanation and verify this path by code review plus the manual-finish path.

### 6. Ranked Non-Trigger

Start and finish a ranked session or inspect network while completing a ranked race.

Verify:

- no MMR auto-sync notice appears
- no `/api/v1/lounge/mmr-sync` request is triggered by ranked flow

### 7. Manual Lounge Sync Regression

Open Lounge view and use the existing `MMR同期` button.

Verify:

- manual sync button still works or returns a clear non-crashing error
- Lounge MMR trend panel still renders

### 8. Responsive / Console Spot Check

Check at 375px width:

- Playing finished screen with auto-sync notice
- Lounge view

Verify:

- no horizontal overflow
- no JavaScript/React console errors

## Cleanup

Do not hard-delete production data.

Any test sessions may remain if completed. Prefer keeping no active sessions at the end.

If settings were changed:

- report final `lounge_auto_sync`
- report final `lounge_player_id`
- report final `lounge_season`

## Expected Report

- Changed files: should be none
- GHCR / Portainer deploy status
- API sanity results
- Auto sync disabled result
- Auto sync enabled manual-finish result
- Auto sync enabled 12-race result, or reason skipped
- Ranked non-trigger result
- Manual Lounge sync regression result
- 375px / console results
- Residual test data
- Final settings values if changed
- Blocked checks
- Bugs or design questions for Codex
