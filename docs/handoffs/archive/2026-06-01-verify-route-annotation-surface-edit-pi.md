Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Verify on the Raspberry Pi deployment that route annotations can be edited between `道中` and `道後` surfaces after creation.

This is a verification-only handoff. Do not change repository source files.

## Background

The latest implementation added post-creation update support for `MapAnnotation.is_goal_image`.

Expected behavior:

- `PATCH /api/v1/map-annotations/{id}` accepts `is_goal_image`.
- Route annotations can switch:
  - `false` = `道中` / route path image
  - `true` = `道後` / route goal image
- Course annotations must reject `is_goal_image=true` with HTTP 422.
- In `AnnotationEditor`, non-3-lap route annotation edit forms show a compact `画像面: 道中 / 道後` control.
- 3-lap routes remain goal-only by existing design.
- No database migration is required for this change. Pi DB should already be at Alembic head `007`.

Target deployment:

- Pi host: `192.168.1.205`
- Frontend: `http://192.168.1.205:3030`
- Backend: `http://192.168.1.205:8001`
- Portainer stack ID: `66`
- Containers: `mkw-postgres`, `mkw-backend`, `mkw-frontend`
- Preserve all Portainer stack env values when redeploying:
  - `DATA_DIR`
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
  - `FRONTEND_PORT=3030`
  - `BACKEND_PORT=8001`

## Files To Inspect

- `docs/design/operations.md`
- `deploy/portainer-stack.yml`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/api.ts`
- `backend/app/api/map_annotations.py`
- `backend/app/schemas/__init__.py`
- `backend/tests/test_api.py`

## Files To Edit

None.

This is verification-only. Do not edit repository files, docs, source code, generated assets, or handoff files.

## Constraints

- Do not commit anything.
- Do not edit source files.
- Do not leave active test sessions or test annotations behind.
- If creating temporary annotations, delete them before finishing.
- Do not run destructive DB cleanup scripts.
- Do not reset the database.
- Do not change Portainer stack environment variables.
- Do not expose the service outside LAN.
- If GHCR / GitHub Actions image is not available yet, report it as blocked instead of doing ad hoc source edits.
- If redeploying through Portainer API, include the stack env values in the payload so compose variables do not fall back to default ports.

## Non Goals

- Do not implement any new feature.
- Do not add migrations.
- Do not acquire image assets.
- Do not test unrelated Analytics / Lounge feature depth beyond smoke checks.
- Do not change `issues.md`.

## Verification

### 1. Deployment / Image

Verify the latest backend and frontend images containing the route annotation surface edit change are deployed.

Minimum checks:

- Containers are up:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- Backend is bound to `0.0.0.0:8001->8000`.
- Frontend is bound to `0.0.0.0:3030->80`.
- `GET http://192.168.1.205:8001/api/v1/health` returns ok.
- `GET http://192.168.1.205:3030/api/v1/health` returns ok.
- Alembic current is `007 (head)`.

If possible, confirm the deployed frontend bundle contains UI strings related to the edit control:

- `画像面`
- `道中`
- `道後`

### 2. Backend API Verification

Use a route that has both path and goal images if available. Preferred route:

```text
rt_mario_bros_circuit_to_crown_city
```

Perform API-level checks:

1. Create a temporary route annotation with:
   - `route_id=rt_mario_bros_circuit_to_crown_city`
   - `label=Pi検証 surface-edit`
   - `x=0.5`
   - `y=0.5`
   - `is_goal_image=false`
2. Confirm response has `is_goal_image=false`.
3. PATCH the annotation with `{"is_goal_image": true}`.
4. Confirm response has `is_goal_image=true`.
5. PATCH the annotation with `{"is_goal_image": false}`.
6. Confirm response has `is_goal_image=false`.
7. Delete the temporary annotation.

Course rejection check:

1. Create a temporary course annotation on any course, for example `mario_bros_circuit`.
2. PATCH it with `{"is_goal_image": true}`.
3. Confirm HTTP 422.
4. Delete the temporary course annotation.

### 3. Web GUI Verification

Use the frontend at `http://192.168.1.205:3030`.

Route annotation UI:

1. Open `Courses`.
2. Select route target `マリオブラザーズサーキット → トロフィーシティ` or route ID `rt_mario_bros_circuit_to_crown_city`.
3. Create a temporary annotation on `道中`.
4. Edit that annotation.
5. Confirm the edit form shows `画像面` with `道中 / 道後`.
6. Switch to `道後` and save.
7. Confirm the annotation disappears from `道中`.
8. Switch the surface selector to `道後`.
9. Confirm the annotation appears on `道後`.
10. Edit it again, switch back to `道中`, and save.
11. Confirm it appears on `道中`.
12. Delete the temporary annotation.

Course annotation UI:

1. Select a normal course target.
2. Create or inspect an annotation edit form.
3. Confirm no meaningful `画像面: 道中 / 道後` update path is shown for course annotations.
4. Delete any temporary annotation created for this check.

### 4. Regression Smoke

Verify no obvious UI regressions:

- Dashboard loads.
- Playing loads.
- Courses loads.
- Records loads.
- Lounge loads.
- Settings loads.
- Browser console has no JavaScript / React errors.
- 375px viewport has no horizontal overflow on the Courses annotation editor route surface.

### 5. Residual Data Check

At the end, verify:

- No temporary `Pi検証 surface-edit` annotation remains.
- No active play sessions were created.
- Any console/network errors are explained.

## Expected Report

- Changed files: must be `None`
- GHCR / Portainer deployment status
- Alembic current result
- API verification results
- Web GUI verification results
- 375px / console regression results
- Residual test data
- Blocked checks
- Bugs found
- Design questions for Codex
