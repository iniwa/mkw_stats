Read AGENTS.md, CLAUDE.md, and this handoff file before starting verification.
This is a verification-only handoff. Do not edit files unless a blocker is discovered and Codex explicitly approves the change.

## Goal

Verify the Course / Route Notes MVP on the Raspberry Pi deployment.

Confirm that commit `deb1f6c Add course route notes MVP` has reached GHCR, Portainer is running the updated backend/frontend images, and the Web GUI can create, edit, pin, filter, soft-delete, and persist course/route notes.

## Background

The Notes MVP was implemented and pushed from Codex:

- commit: `deb1f6c Add course route notes MVP`
- backend API:
  - `GET /api/v1/notes`
  - `POST /api/v1/notes`
  - `PATCH /api/v1/notes/{note_id}`
  - `DELETE /api/v1/notes/{note_id}`
- frontend:
  - `Courses` nav opens `NotesView`
  - notes can target either a course or a route
  - route notes can show compact route metadata

Relevant decisions:

- `docs/decisions/2026-05-24-course-route-notes-mvp.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`
- `docs/decisions/2026-05-22-raspberry-pi-port-defaults.md`

Deployment facts:

- Git flow: Gitea `main` -> GitHub mirror -> GitHub Actions -> GHCR -> Portainer
- Backend image: `ghcr.io/iniwa/mkw-stats-backend:latest`
- Frontend image: `ghcr.io/iniwa/mkw-stats-frontend:latest`
- Pi containers:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- Pi host ports:
  - frontend: `3030`
  - backend: `8001`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-24-course-route-notes-mvp.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`
- `deploy/portainer-stack.yml`
- `backend/app/api/notes.py`
- `backend/app/schemas/__init__.py`
- `frontend/src/NotesView.tsx`
- `frontend/src/api.ts`

## Files To Edit

None.

This handoff is verification-only.

## Verification Steps

### 1. Confirm image publication

Confirm GitHub Actions completed for commit `deb1f6c` or a later commit containing the Notes MVP.

Confirm GHCR has updated images for both services:

- `ghcr.io/iniwa/mkw-stats-backend:latest`
- `ghcr.io/iniwa/mkw-stats-frontend:latest`

If SHA tags are visible, also check:

- `ghcr.io/iniwa/mkw-stats-backend:sha-deb1f6c`
- `ghcr.io/iniwa/mkw-stats-frontend:sha-deb1f6c`

If Portainer pull fails with `401`, check the known stale GHCR credential issue from `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md` before proposing app or workflow changes.

### 2. Update Portainer stack

Use Portainer Stack UI to re-pull/redeploy the `mkw-stats` stack.

Do not use `docker compose up` directly for deployment. SSH/docker inspection is allowed for verification after Portainer has deployed the stack.

Confirm containers are up:

- `mkw-postgres`
- `mkw-backend`
- `mkw-frontend`

Confirm exposed ports remain:

- `mkw-backend`: `0.0.0.0:8001->8000`
- `mkw-frontend`: `0.0.0.0:3030->80`

### 3. Backend API smoke checks

Confirm:

- `GET http://<pi-host>:8001/api/v1/health` returns 200
- `GET http://<pi-host>:3030/api/v1/health` returns 200 through nginx proxy
- OpenAPI includes the four Notes endpoints
- `GET http://<pi-host>:8001/api/v1/notes` returns 200 and a JSON list

### 4. Notes API behavior checks

Using API calls against the Pi backend, create temporary test notes and verify:

- create course note targeting `dk_pass`
- create route note targeting `rt_peach_to_rainbow`
- list all active notes
- `course_id=dk_pass` filter returns the course note
- `route_id=rt_peach_to_rainbow` filter returns the route note
- patch title/body/pinned/priority
- delete one note
- deleted note disappears from default list
- `include_inactive=true` shows the soft-deleted note with `is_active=false`

Use distinctive Japanese test text so the UI check is unambiguous, for example:

- title: `Pi検証 コースノート`
- body: `Pi検証本文 1行目\n2行目`
- route title: `Pi検証 ルートノート`

The test notes may remain in the DB if they are useful for UI verification. If they are noisy, soft-delete them before finishing. Do not hard-delete rows.

### 5. Web GUI checks

Open:

```text
http://<pi-host>:3030
```

Hard reload the browser if an old hashed JS bundle appears to be cached.

Verify in the Web GUI:

- `Courses` nav opens the notes view
- loading state resolves without blank screen
- no console errors
- create a course note
- create a route note
- route note shows compact route metadata if route data is available
- type filter works:
  - all
  - course
  - route
- edit title/body/pinned/priority
- pinned note sorts above non-pinned notes
- delete note removes it from the active list
- reload page and confirm remaining note persists
- mobile or narrow viewport remains usable enough for the controls

If Playwright browser is unavailable because another session owns it, perform API checks and note exactly which browser checks were blocked.

## Constraints

- Verification-only: do not edit repo files.
- Do not change Docker/Portainer stack files.
- Do not change GHCR package visibility unless explicitly instructed by the user.
- Do not introduce GHCR credentials into Portainer unless private pulls are intentionally required.
- Do not hard-delete notes.
- Do not expose the service externally or change Cloudflare Tunnel behavior.

## Non Goals

- No new features.
- No map annotations.
- No file uploads.
- No markdown rendering.
- No course/route seed changes.
- No schema migrations.

## Expected Report

Report in Japanese:

- Changed files, if any
- GHCR / GitHub Actions status
- Portainer/container status
- Backend API check results
- Notes API behavior results
- Web GUI check results
- Any residual test data left in the DB
- Blocked checks and exact reason
- Bugs found
- Design questions for Codex
