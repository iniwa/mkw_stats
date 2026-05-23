Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
If verification would require changing files, changing Portainer stack structure, deleting data, or using credentials not already available to the user, stop and ask before proceeding.

## Goal

Verify on Raspberry Pi that the route master seed change from commit `4602b0e` is deployed and usable:

- GHCR images include the route master seed change.
- Portainer stack is running the latest backend/frontend images.
- `python -m app.seed.initial_data` updates the Pi database so route masters contain 203 routes.
- Existing master records are refreshed by stable ID, especially `rt_peach_to_rainbow`.
- API and Web GUI still work after the larger course/route master set.

This is a verification handoff. Do not implement new features.

## Background

Codex reviewed and committed the route master seed change:

- Commit: `4602b0e Add route master seed data`
- `ROUTES` expanded from 2 to 203 entries.
- 202 routes come from `https://japan-mk.blog.jp/mkworld.info-1/route.html`.
- One same-point fixture remains: `rt_dk_pass_3lap`.
- Existing route ID `rt_peach_to_rainbow` is intentionally preserved for DB compatibility.
- `Course.tags` and `Route.tags` can now be list, dict, or null.
- Seed behavior was changed so Course / MapPoint / Route master rows are synchronized by stable ID when already present. This should refresh existing Pi rows for Japanese names, `repick_group_key`, and `tags`.

Relevant decisions:

- `docs/decisions/2026-05-22-route-master-seed-strategy.md`
- `docs/decisions/2026-05-22-course-master-seed-strategy.md`
- `docs/decisions/2026-05-22-raspberry-pi-port-defaults.md`
- `docs/decisions/2026-05-22-portainer-managed-exec-policy.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`

Current Pi / Portainer assumptions:

- Stack name: `mkw-stats`
- Containers:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- Host ports:
  - frontend: `3030`
  - backend: `8001`
- Web GUI URL: `http://<pi-host>:3030`
- Backend direct health URL: `http://<pi-host>:8001/api/v1/health`
- Frontend nginx proxy health URL: `http://<pi-host>:3030/api/v1/health`
- Pi can be inspected via `ssh iniwapi`.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `deploy/portainer-stack.yml`
- `.github/workflows/docker-publish.yml`
- `backend/app/seed/initial_data.py`
- `backend/app/api/courses.py`
- `backend/app/services/course_selection.py`
- `frontend/src/PlayingView.tsx`
- `frontend/src/RecordsView.tsx`
- Relevant decisions listed above

## Files To Edit

None.

This verification should not edit repository files. If a documentation correction seems necessary, report it to Codex instead of editing.

## Constraints

- Do not run `docker compose up` directly on the Pi.
- Portainer remains the deployment authority.
- It is acceptable to use `ssh iniwapi` and `docker exec` against Portainer-managed containers for read-only checks and for the agreed seed command.
- Do not delete production data.
- Do not truncate route/course/race/session tables.
- Do not change container names, host ports, registry credentials, or Portainer stack YAML unless the user explicitly approves.
- Do not create new test sessions unless a later check genuinely requires it. Prefer read-only API checks first.
- Do not commit.
- If GHCR/Portainer pull is blocked by registry auth, report the exact failure and stop. Do not invent a deployment workaround.

## Verification

### 1. GitHub Actions / GHCR

Confirm the GitHub mirror received commit `4602b0e` and Docker Publish completed for both images.

Verify both image tags are available and include `linux/arm64`:

- `ghcr.io/iniwa/mkw-stats-backend:latest`
- `ghcr.io/iniwa/mkw-stats-frontend:latest`

If SHA tags are visible, report the SHA tag corresponding to `4602b0e`.

### 2. Portainer Deployment State

Confirm the Portainer stack is running:

- `mkw-postgres`
- `mkw-backend`
- `mkw-frontend`

Confirm host port mappings:

- `mkw-backend`: `0.0.0.0:8001->8000`
- `mkw-frontend`: `0.0.0.0:3030->80`
- `mkw-postgres`: internal only

Confirm the running backend image digest/tag corresponds to the latest route master build, not an older scaffold image.

If Portainer has not re-pulled the latest image yet, ask the user to redeploy/re-pull through Portainer. Do not change the stack directly.

### 3. Seed Execution

Run the seed inside the Portainer-managed backend container:

```bash
docker exec mkw-backend python -m app.seed.initial_data
```

Run it twice to verify idempotency.

Expected:

- Both runs complete successfully.
- No duplicate key errors.
- Existing Course / MapPoint / Route master rows are updated by stable ID.

### 4. Database Checks

Use `docker exec mkw-postgres psql ...` or an equivalent safe read-only SQL path using the existing container environment.

Confirm:

- `courses` count is 30.
- `map_points` count is 30.
- `routes` count is 203.
- `rt_dk_pass_3lap` exists and has `from_course_id = to_course_id = dk_pass`.
- `rt_peach_to_rainbow` exists and still uses that exact ID.
- `rt_peach_to_rainbow.is_lounge_12p_banned = true`.
- `rt_peach_to_rainbow.tags` contains:
  - `source = "japan-mk"`
  - `source_key = "29-30"`
  - `sections`
- `rt_peach_to_rainbow.repick_group_key = "rt_peach_to_rainbow"`.
- No routes reference missing `from_course_id` or `to_course_id`.

Suggested SQL checks:

```sql
select count(*) from courses;
select count(*) from map_points;
select count(*) from routes;
select id, from_course_id, to_course_id, is_lounge_12p_banned, repick_group_key, tags
from routes
where id in ('rt_dk_pass_3lap', 'rt_peach_to_rainbow');
select count(*)
from routes r
left join courses cf on cf.id = r.from_course_id
left join courses ct on ct.id = r.to_course_id
where cf.id is null or ct.id is null;
```

### 5. Backend API Checks

Confirm all return HTTP 200 unless otherwise stated:

- `GET http://<pi-host>:8001/api/v1/health`
- `GET http://<pi-host>:8001/api/v1/courses`
- `GET http://<pi-host>:8001/api/v1/map-points`
- `GET http://<pi-host>:8001/api/v1/routes`
- `GET http://<pi-host>:3030/api/v1/health` through frontend nginx proxy

Confirm:

- `/courses` returns 30 active courses.
- `/map-points` returns 30 active points.
- `/routes` returns 203 active routes.
- JSON serialization of dict `tags` works.

Check route resolution for at least these pairs:

- same point: `mp_dk_pass` -> `mp_dk_pass`
  - Expected route ID: `rt_dk_pass_3lap`
- reference route: `mp_peach_stadium` -> `mp_rainbow_road`
  - Expected route ID: `rt_peach_to_rainbow`
- another reference route from the new dataset, for example `mp_mario_bros_circuit` -> `mp_crown_city`
  - Expected route ID: `rt_mario_bros_circuit_to_crown_city`

Use the actual existing API shape for `POST /api/v1/course-selection/resolve`.

### 6. Web GUI Smoke Check

Open the Web GUI at:

```text
http://<pi-host>:3030
```

Check the Playing view:

- Page loads without blank screen.
- Console has no errors.
- Course/map-point selection contains the 30 course set.
- Selecting DK Snow Mountain -> DK Snow Mountain resolves and reaches confirmation.
- Selecting Peach Stadium -> Rainbow Road resolves and reaches confirmation.
- Selecting Mario Bros. Circuit -> Trophy City resolves and reaches confirmation.

Do not create real race records unless required to verify the UI. If a session is created accidentally, finish it and report the residual data.

Check Records view only as a smoke check:

- Page loads.
- Existing records still render.
- No console errors from larger route tags.

## Non Goals

- Do not add route detail UI.
- Do not redesign course selection UI.
- Do not add map images or real map coordinates.
- Do not classify all 12-player banned Lounge routes.
- Do not rename existing stable IDs.
- Do not create migrations.
- Do not change Docker/Portainer configuration.
- Do not expose the service outside LAN.

## Expected Report

Report in Japanese:

- Changed files: should be none.
- GHCR/GitHub Actions status, including image digest or SHA tag if available.
- Portainer/container state and port mappings.
- Seed execution result, including idempotency second run.
- DB counts and key rows:
  - courses
  - map_points
  - routes
  - `rt_dk_pass_3lap`
  - `rt_peach_to_rainbow`
- API verification results.
- Web GUI smoke results, including console error count.
- Any blocked checks and exact reason.
- Any residual test/session data if created.
- Design questions for Codex.

Pay special attention to whether existing Pi rows were actually refreshed by the updated seed behavior. If route count becomes 203 but `rt_peach_to_rainbow.tags` remains null or old, report that as a bug.
