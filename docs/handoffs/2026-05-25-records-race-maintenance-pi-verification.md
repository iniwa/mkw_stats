Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
This is a verification-only handoff. Do not edit source files unless Codex explicitly asks for a fix after the report.

## Goal

Verify the Records race maintenance UI on the Raspberry Pi Portainer deployment.

The feature was implemented in commit `7c737df` (`Add records race maintenance UI`). It adds:

- inline race memo editing in Records
- race cancellation from Records with explicit confirmation
- race list refresh after mutation

## Background

Expected deployment flow:

Gitea `main` -> GitHub mirror -> GitHub Actions -> GHCR -> Portainer redeploy.

Runtime details:

- Frontend URL: `http://<pi-host>:3030`
- Backend direct URL: `http://<pi-host>:8001`
- Containers:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- Portainer-managed stack. Do not use direct local `docker compose up`.
- If the running frontend image is older than `7c737df`, redeploy the Portainer stack with image pull enabled, preserving the existing stack and environment variables.

The backend endpoints already existed:

- `PATCH /api/v1/race-records/{race_id}`
- `POST /api/v1/race-records/{race_id}/cancel`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/handoffs/archive/2026-05-25-records-race-maintenance.md`
- `docs/decisions/2026-05-25-records-race-maintenance-scope.md`
- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/App.css`

## Files To Edit

None. Verification only.

## Constraints

- Do not change source files.
- Do not change stack ports, container names, volumes, or environment variables.
- Do not hard-delete sessions or races.
- Do not run direct `docker compose up`.
- Any test session/race data created for verification must be clearly named or identifiable and finished/cancelled so no active session remains.
- Report residual data explicitly.

## Verification

### 1. GHCR / Deployment Freshness

Confirm the frontend image containing `7c737df` is available and deployed.

Suggested checks:

- Pull or inspect `ghcr.io/iniwa/mkw-stats-frontend:sha-7c737df` if available.
- Confirm the running frontend bundle contains Records maintenance class names, such as `records__memo-edit`.
- If stale, redeploy the Portainer stack with image pull enabled.

Backend image changes are not expected, but backend health should still be checked.

### 2. API Sanity

Check:

- `GET http://<pi-host>:8001/api/v1/health`
- `GET http://<pi-host>:3030/api/v1/health`
- `GET /api/v1/play-sessions?limit=5`

Confirm Records can still list sessions and selected-session races.

### 3. Prepare Safe Verification Data

Prefer using an existing completed test session if there is one suitable for mutation.

If not, create a small temporary ranked session through the API or UI:

1. Create ranked session.
2. Create one race record and complete it with a harmless test memo.
3. Finish the session so no active session remains.

Use a memo prefix such as `Pi検証 Records maintenance`.

Avoid mutating real personal records unless the user has explicitly indicated they are test records.

### 4. UI Checks: Memo Edit

In Records:

- Select a session with at least one race.
- Click `編集` on a race row.
- Confirm a textarea appears with the current memo.
- Save a changed memo.
- Confirm the selected session race list refreshes and the new memo is displayed.
- Reload or reselect the session and confirm the memo persists.
- Edit the memo to empty and save.
- Confirm the resulting empty display is reasonable and no stale memo text remains.

### 5. UI Checks: Cancel Race

For a non-cancelled test race:

- Click `取消`.
- Confirm that a confirmation dialog appears and says it is not deletion.
- Dismiss/cancel once and verify the race remains unchanged.
- Click `取消` again and accept.
- Confirm the row remains visible as cancelled.
- Confirm the existing cancelled styling/tag is applied.
- Confirm the `取消` action is no longer shown for that row.

If the test race is ranked/completed, record whether the backend changed VR as expected. Do not treat VR rollback behavior as a UI bug unless it differs from the existing backend rules.

### 6. Error / Responsive / Regression Checks

- If practical, induce or observe a failed save/cancel and confirm row-level error display.
- 375px viewport: no horizontal overflow in Records with edit controls visible.
- Browser console has no React/JavaScript app errors.

Spot-check:

- Dashboard
- Playing
- Records
- Analytics
- Lounge
- Courses
- Settings

## Expected Report

Report in Japanese:

- Changed files, if any
- GHCR / Portainer status
- API sanity results
- Verification data created and cleanup/result
- Memo edit results
- Cancel race results
- 375px / console / regression results
- Blocked checks
- Residual test data
- Bugs found
- Design questions for Codex
