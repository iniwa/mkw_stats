Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
This is a verification-only handoff. Do not edit source files unless Codex explicitly asks for a fix after the report.

## Goal

Verify the Playing target assist feature on the Raspberry Pi Portainer deployment.

The feature was implemented in commit `3a9409a` (`Add playing target assist`). It adds a read-only assist panel in the Playing flow that shows course/route notes and map annotations for the currently selected target.

## Background

The expected deployment flow is:

Gitea `main` -> GitHub mirror -> GitHub Actions -> GHCR -> Portainer redeploy.

Relevant runtime details:

- Frontend URL: `http://<pi-host>:3030`
- Backend direct URL: `http://<pi-host>:8001`
- Containers:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- Portainer-managed stack, not direct `docker compose up`.
- If the running frontend image is older than `3a9409a`, redeploy the Portainer stack with image pull enabled, using the existing stack and environment variables.

Relevant APIs already exist:

- `GET /api/v1/notes?course_id=...`
- `GET /api/v1/notes?route_id=...`
- `GET /api/v1/map-annotations?course_id=...`
- `GET /api/v1/map-annotations?route_id=...`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/handoffs/archive/2026-05-25-playing-target-assist.md`
- `frontend/src/TargetAssist.tsx`
- `frontend/src/PlayingView.tsx`
- `frontend/src/App.css`

## Files To Edit

None. Verification only.

## Constraints

- Do not change source files.
- Do not change stack ports, container names, volumes, or environment variables.
- Do not run local `docker compose up`.
- Use Portainer/SSH only for verification and redeploy if the deployed image is stale.
- Do not hard-delete user data.
- If creating temporary verification notes or annotations is necessary, remove or soft-delete them afterward where the API supports it, and report any residual data.

## Verification

### 1. GHCR / Deployment Freshness

Confirm that the frontend image containing `3a9409a` is available and deployed.

Suggested checks:

- Pull or inspect `ghcr.io/iniwa/mkw-stats-frontend:sha-3a9409a` if available.
- Confirm the running `mkw-frontend` bundle contains `target-assist` class names.
- If stale, redeploy the Portainer stack with image pull enabled.

Backend image changes are not expected for this slice, but backend health should still be checked.

### 2. API Sanity

Check:

- `GET http://<pi-host>:8001/api/v1/health`
- `GET http://<pi-host>:3030/api/v1/health`
- `GET /api/v1/notes`
- `GET /api/v1/map-annotations`

Record existing active note/annotation counts before creating any temporary data.

### 3. Prepare Verification Data If Needed

Use existing notes/annotations if suitable data already exists.

If not, create minimal temporary data:

- one active course note for a course target, e.g. `dk_pass`
- one active route note for a route target, e.g. `rt_peach_to_rainbow`
- one active route annotation for the same route
- optionally link the annotation to the route note to verify linked-note title display

Keep the data small and clearly named with `Pi検証` or similar.

### 4. Playing UI Checks

Open the frontend in a browser:

```text
http://<pi-host>:3030
```

Verify:

- Dashboard still loads by default.
- Navigate to Playing.
- Select a course target that has a note.
  - The confirmation screen shows the target assist panel.
  - The panel shows the target name, note title, body with line breaks, pinned badge if applicable, and priority if non-zero.
  - The existing confirm buttons still work and are not blocked by the assist panel.
- Select a route target that has a note and annotation.
  - The confirmation screen still shows `RouteDetail`.
  - The target assist panel also appears below the route detail.
  - It shows route notes and annotations.
  - Annotation type, label, normalized position, hover text, and linked note title appear when present.
- Select a target with no notes/annotations.
  - The compact empty state appears.
- If practical, simulate or observe an API error for notes/annotations.
  - Retry button appears.
  - Confirm / record buttons are still usable.
- For ranked flow:
  - Create or resume a ranked draft race.
  - Confirm the ranked result input screen shows the same target assist for the draft race target.
- 375px viewport:
  - No horizontal overflow.
  - Notes and annotation text wrap cleanly.

### 5. Regression Spot Checks

Check for blank screens or console errors in:

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
- Verification data created and cleanup result
- Playing UI check results
- 375px / console / regression results
- Blocked checks
- Residual test data
- Bugs found
- Design questions for Codex
