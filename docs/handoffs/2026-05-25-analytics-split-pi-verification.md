Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
This is a verification-only handoff. Do not edit source files.
If verification would require code changes, stop and report the finding instead of editing.

## Goal

Verify the deployed Raspberry Pi / Portainer behavior for commit `79ff85c` (`Split analytics views`).

Confirm that Analytics is now ranked/VR-focused, Lounge has Lounge-specific summary panels, and the existing views still render after deployment.

## Background

Implementation handoff:

- `docs/handoffs/archive/2026-05-25-analytics-split-vr-lounge.md`

Important deployment context:

- Gitea `main` mirrors to GitHub.
- GitHub Actions publishes GHCR images.
- Portainer uses:
  - `ghcr.io/iniwa/mkw-stats-backend:latest`
  - `ghcr.io/iniwa/mkw-stats-frontend:latest`
- Pi containers:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- Pi host ports:
  - frontend: `3030`
  - backend: `8001`
- Portainer does not automatically redeploy new `latest` images. If containers are still on an older image, redeploy the existing Portainer stack with image pull enabled. Do not use local `docker compose up`.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/handoffs/archive/2026-05-25-analytics-split-vr-lounge.md`
- `docs/design/ui-redesign-roadmap.md`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.css`

## Files To Edit

None.

## Constraints

- Verification only.
- Do not change source files.
- Do not change Portainer stack configuration unless the stack is not using the already documented image names/ports.
- Do not create permanent test records unless required for verification. If test data is created, finish sessions and report the residual records.
- Do not hard-delete user data.

## Verification

### 1. GHCR / Image Availability

Confirm the latest frontend image includes commit `79ff85c` or a later commit that contains it.

Acceptable checks:

- GitHub Actions success for the relevant commit, if available.
- GHCR `latest` pull success.
- SHA tag availability, if public/accessible.
- Container bundle contains Analytics split strings/classes after redeploy.

### 2. Portainer / Containers

Confirm all containers are Up:

- `mkw-postgres`
- `mkw-backend`
- `mkw-frontend`

Confirm the frontend is reachable at:

- `http://<pi-host>:3030`

Confirm backend health:

- `http://<pi-host>:8001/api/v1/health`
- `http://<pi-host>:3030/api/v1/health`

### 3. API Sanity

Confirm these return HTTP 200:

- `GET /api/v1/play-sessions?source=ranked&limit=50`
- `GET /api/v1/play-sessions?source=lounge&limit=50`
- `GET /api/v1/courses`
- `GET /api/v1/routes`

If sessions exist, spot-check `GET /api/v1/play-sessions/{id}/races` and confirm hidden records are excluded by default.

### 4. Web GUI Checks

Analytics view:

- Title/label clearly shows `VR Analytics`.
- Data is ranked-focused.
- Current VR/account is shown when an active or selected account exists.
- VR delta metrics show total / average / best / worst.
- Placement distribution uses numeric placement.
- Top target usage is ranked-only.
- Recent sessions are ranked sessions.
- Cancelled records do not count in normal VR metrics.
- Date filter changes displayed numbers.

Lounge view:

- Lounge summary panel is visible.
- Shows Lounge session count.
- Shows completed Lounge race count.
- Shows average placement and average score from completed races only.
- MMR placeholder is visible and clearly says MMR is not synced/unavailable.
- Existing active/recent sessions, warning records, and top target panels still render.
- Date filter changes displayed numbers.

Regression spot checks:

- Dashboard renders.
- Playing renders.
- Records renders.
- Courses renders.
- Settings renders.
- 375px viewport has no horizontal overflow on Analytics and Lounge.
- Browser console has no React/JavaScript errors.

## Expected Report

Report in Japanese:

- Changed files (`なし` expected)
- GHCR / GitHub Actions status
- Portainer / container status
- API sanity results
- Analytics UI results
- Lounge UI results
- Regression / responsive results
- Blocked checks
- Residual test data, if any
- Bugs found
- Design questions for Codex
