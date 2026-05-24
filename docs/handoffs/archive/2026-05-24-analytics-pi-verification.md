Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
This is a verification-only handoff. Do not edit files unless Codex explicitly asks for a fix after this report.

## Goal

Verify the Analytics MVP on the Raspberry Pi Portainer deployment.

Confirm that commit `e4e7325` (`Add analytics MVP`) has reached GHCR, is running in Portainer, and that the Analytics view matches the backend data.

## Background

The Analytics MVP is frontend-only and was implemented in:

- `frontend/src/AnalyticsView.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`

Relevant decision:

- `docs/decisions/2026-05-24-analytics-mvp-scope.md`

Deployment flow:

- Gitea `main` -> GitHub mirror -> GitHub Actions -> GHCR -> Portainer

Runtime details:

- Frontend image: `ghcr.io/iniwa/mkw-stats-frontend:latest`
- Backend image: `ghcr.io/iniwa/mkw-stats-backend:latest`
- Pi frontend URL: `http://<pi-host>:3030`
- Pi backend URL: `http://<pi-host>:8001`
- Container names: `mkw-frontend`, `mkw-backend`, `mkw-postgres`

The Analytics view fetches:

1. `GET /api/v1/play-sessions?limit=50`
2. `GET /api/v1/courses`
3. `GET /api/v1/routes`
4. `GET /api/v1/play-sessions/{session_id}/races?include_cancelled=true` for each session

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-24-analytics-mvp-scope.md`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/api.ts`
- `deploy/portainer-stack.yml`

## Files To Edit

None.

This handoff is verification-only.

## Verification Steps

### 1. GHCR / GitHub Actions

Verify that the latest frontend image contains the Analytics MVP commit.

Check, as available:

- GitHub Actions Docker Publish completed for commit `e4e7325` or a later commit containing it.
- `ghcr.io/iniwa/mkw-stats-frontend:latest` is pullable.
- `ghcr.io/iniwa/mkw-stats-frontend:sha-e4e7325` exists if the SHA tag is available publicly.

If GitHub or GHCR package APIs require authentication, report that clearly and use image pull / runtime behavior as the practical confirmation.

### 2. Portainer / Container State

Verify the Portainer stack is running the updated frontend image.

Expected containers:

- `mkw-postgres` Up
- `mkw-backend` Up, host `8001 -> 8000`
- `mkw-frontend` Up, host `3030 -> 80`

If the stack is still running an old frontend image, redeploy through Portainer with image pull enabled. Do not use direct `docker compose up`.

### 3. Backend API Sanity

Verify the backend endpoints used by Analytics:

- `GET http://<pi-host>:8001/api/v1/health`
- `GET http://<pi-host>:3030/api/v1/health` through nginx proxy
- `GET http://<pi-host>:8001/api/v1/play-sessions?limit=50`
- `GET http://<pi-host>:8001/api/v1/courses`
- `GET http://<pi-host>:8001/api/v1/routes`

For the returned sessions, sample or fully verify:

- `GET /api/v1/play-sessions/{session_id}/races?include_cancelled=true`

Record the counts needed to compare against the UI:

- session total
- ranked session count
- Lounge session count
- active/completed/cancelled session counts
- total race records across the recent 50 sessions
- completed/draft/cancelled race counts
- ranked/Lounge race counts
- ranked completed VR delta total and average
- Lounge warning flag counts
- top course/route target counts

### 4. Web GUI Analytics Check

Open the deployed frontend:

```text
http://<pi-host>:3030
```

Verify:

- Dashboard still loads by default.
- Analytics nav opens the Analytics view.
- `Recent 50 sessions` window label is visible.
- Loading resolves without a blank screen.
- Session totals match the backend counts.
- Race totals match the fetched race lists.
- Ranked total VR delta, average, best, and worst are plausible and match the backend data.
- Placement-band counts are displayed.
- Lounge warning records are displayed with labels from `WARNING_LABELS` when warnings exist, or an empty state when none exist.
- Most-used targets display resolved course/route names and distinguish course vs route.
- Cancelled races are excluded from most-used target counts.
- Browser console has no app errors.

### 5. Responsive / Regression Spot Check

Verify around 375px width:

- No horizontal page overflow.
- Metric grids remain readable.
- Target list rows remain usable.

Spot-check existing views:

- Dashboard
- Playing
- Records
- Courses
- Settings

They should still render without blank screens or console errors.

## Constraints

- Verification-only.
- Do not edit source files.
- Do not create migrations.
- Do not mutate production data unless absolutely needed for verification.
- If test data is required, stop and ask Codex first.
- Do not hard-delete existing data.
- Use Portainer deployment flow; do not run direct `docker compose up` on the Pi.

## Non Goals

- Implementing fixes.
- Adding backend analytics endpoints.
- Adding all-time analytics.
- Adding charts or filters.
- Cleaning old historical test sessions.

## Expected Report

Report in Japanese:

- Changed files, if any. Expected: none.
- GHCR / GitHub Actions status.
- Portainer / container status.
- Backend API counts used for comparison.
- Web GUI Analytics verification results.
- Responsive and regression spot-check results.
- Blocked checks and exact reason.
- Residual test data, if any.
- Bugs found.
- Design questions for Codex.
