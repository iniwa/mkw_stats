Read AGENTS.md, CLAUDE.md, and this handoff file before starting verification.
This is a verification-only handoff. Do not edit files unless a blocker is discovered and Codex explicitly approves the change.

## Goal

Verify the Map Annotations MVP on the Raspberry Pi deployment.

Confirm that commit `cf2500e Add map annotations MVP` has reached GHCR, Portainer is running the updated backend/frontend images, and the Web GUI can create, edit, delete, link, preview, and persist map annotations.

## Background

The Map Annotations MVP was implemented and pushed from Codex:

- commit: `cf2500e Add map annotations MVP`
- backend API:
  - `GET /api/v1/map-annotations`
  - `POST /api/v1/map-annotations`
  - `PATCH /api/v1/map-annotations/{annotation_id}`
  - `DELETE /api/v1/map-annotations/{annotation_id}`
- frontend:
  - `Courses` nav opens the existing Notes/Courses view
  - `AnnotationEditor` is shown below notes
  - annotations can target either a course or a route
  - coordinates are normalized `0.0` to `1.0`
  - route/course notes can be linked when the note target matches the annotation target

Relevant decisions:

- `docs/decisions/2026-05-24-map-annotations-mvp.md`
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
- `docs/decisions/2026-05-24-map-annotations-mvp.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`
- `deploy/portainer-stack.yml`
- `backend/app/api/map_annotations.py`
- `backend/app/schemas/__init__.py`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/api.ts`

## Files To Edit

None.

This handoff is verification-only.

## Verification Steps

### 1. Confirm image publication

Confirm GitHub Actions completed for commit `cf2500e` or a later commit containing the Map Annotations MVP.

Confirm GHCR has updated images for both services:

- `ghcr.io/iniwa/mkw-stats-backend:latest`
- `ghcr.io/iniwa/mkw-stats-frontend:latest`

If SHA tags are visible, also check:

- `ghcr.io/iniwa/mkw-stats-backend:sha-cf2500e`
- `ghcr.io/iniwa/mkw-stats-frontend:sha-cf2500e`

If Portainer pull fails with `401`, check the known stale GHCR credential issue from `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md` before proposing app or workflow changes.

### 2. Update Portainer stack

Use Portainer Stack UI or Portainer API to re-pull/redeploy the `mkw-stats` stack.

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
- OpenAPI includes the four Map Annotation endpoints
- `GET http://<pi-host>:8001/api/v1/map-annotations` returns 200 and a JSON list

### 4. Map Annotation API behavior checks

Using API calls against the Pi backend, create temporary test annotations and verify:

- create course annotation targeting `dk_pass`
- create route annotation targeting `rt_peach_to_rainbow`
- list all annotations
- `course_id=dk_pass` filter returns the course annotation
- `route_id=rt_peach_to_rainbow` filter returns the route annotation
- reject invalid normalized coordinates such as `x=1.5`
- link an annotation to an active note with the same target
- reject linking an annotation to a note with a different target
- patch label/type/hover_text/x/y/priority
- delete one annotation
- deleted annotation disappears from the list
- PATCH on the deleted annotation returns 404

Use distinctive Japanese test text so the UI check is unambiguous, for example:

- course annotation label: `Pi検証 コース注釈`
- route annotation label: `Pi検証 ルート注釈`
- hover text: `Pi検証 ホバー本文`

Annotations may be hard-deleted when cleaning up because the current `map_annotations` table has no `is_active`. Do not hard-delete notes.

### 5. Web GUI checks

Open:

```text
http://<pi-host>:3030
```

Hard reload the browser if an old hashed JS bundle appears to be cached.

Verify in the Web GUI:

- `Courses` nav opens the notes/annotations view
- existing notes still load
- annotations section is visible below notes
- loading state resolves without blank screen
- no console errors
- create a course annotation
- create a route annotation
- normalized preview marker appears when both `x` and `y` are set
- annotation without complete `x/y` appears in list only
- edit label/type/hover text/x/y/priority
- link an annotation to a note with the same target
- mismatched notes are not offered in the note link selector
- delete an annotation and confirm it disappears
- reload page and confirm remaining annotation persists
- narrow viewport around 375px remains usable enough for controls

If Playwright browser is unavailable because another session owns it, perform API checks and note exactly which browser checks were blocked.

## Constraints

- Verification-only: do not edit repo files.
- Do not change Docker/Portainer stack files.
- Do not change GHCR package visibility unless explicitly instructed by the user.
- Do not introduce GHCR credentials into Portainer unless private pulls are intentionally required.
- Do not hard-delete notes.
- Do not expose the service externally or change Cloudflare Tunnel behavior.
- Do not add map images or uploaded files during verification.

## Non Goals

- No new features.
- No map image.
- No map asset upload.
- No route line drawing.
- No annotation drag-and-drop.
- No schema migrations.

## Expected Report

Report in Japanese:

- Changed files, if any
- GHCR / GitHub Actions status
- Portainer/container status
- Backend API check results
- Map Annotation API behavior results
- Web GUI check results
- Any residual test data left in the DB
- Blocked checks and exact reason
- Bugs found
- Design questions for Codex
