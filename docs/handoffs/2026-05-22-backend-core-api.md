Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Implement the first backend API vertical slice for MKWorld Stats Manager.

The API should support:

- settings read/update
- VR account CRUD and activation
- course/route/map-point read APIs
- course selection resolve
- play session lifecycle
- race record draft/complete/cancel/undo
- Lounge repick warning logic for manually recorded course history

This handoff should make the backend usable by the next minimal Playing UI handoff.

## Background

The project already has:

- FastAPI scaffold
- SQLAlchemy models
- Alembic initial schema
- seed data
- Raspberry Pi Portainer deployment verified

Important design sources:

- `mkworld_stats_manager_docs_v0_1/02_requirements.md`
- `mkworld_stats_manager_docs_v0_1/04_db_design.md`
- `mkworld_stats_manager_docs_v0_1/05_api_design.md`
- `docs/decisions/2026-05-22-map-point-course-ownership.md`

Key design decisions to preserve:

- `map_points.course_id -> courses.id` is the canonical map point/course relationship.
- Ranked VR and Lounge are separated by `source`.
- VR is manual input; do not assume an external ranked API.
- Lounge course history is manual and warnings do not block recording.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `backend/app/main.py`
- `backend/app/core/database.py`
- `backend/app/models/**`
- `backend/app/seed/initial_data.py`
- `backend/tests/**`
- `mkworld_stats_manager_docs_v0_1/02_requirements.md`
- `mkworld_stats_manager_docs_v0_1/04_db_design.md`
- `mkworld_stats_manager_docs_v0_1/05_api_design.md`
- `docs/decisions/2026-05-22-map-point-course-ownership.md`

## Files To Edit

Create or edit only:

- `backend/app/main.py`
- `backend/app/api/**`
- `backend/app/core/**`
- `backend/app/schemas/**`
- `backend/app/services/**`
- `backend/app/models/**` only if a small model fix is required
- `backend/tests/**`
- `backend/requirements.txt` only if Pydantic/settings dependencies are needed
- `README.md` only for API/test command updates

Do not edit:

- `frontend/**`
- `.github/workflows/**`
- `deploy/**`
- `docker-compose.yml`
- `docs/handoffs/**`
- `mkworld_stats_manager_docs_v0_1/**`
- secrets, credentials, `.env`, or local settings

## API Base

All endpoints should live under:

```text
/api/v1
```

Preserve:

```text
GET /api/v1/health
```

Use JSON APIs. Image/file upload is out of scope.

## Required Endpoints

### Settings

```text
GET /api/v1/settings
PATCH /api/v1/settings
```

Behavior:

- Return one settings row.
- If settings row does not exist, create a default row.
- Support selected VR account, selected character, selected vehicle, lounge player ID, and lounge auto-sync flag where already modeled.

### VR Accounts

```text
GET    /api/v1/vr-accounts
POST   /api/v1/vr-accounts
PATCH  /api/v1/vr-accounts/{account_id}
POST   /api/v1/vr-accounts/{account_id}/activate
DELETE /api/v1/vr-accounts/{account_id}
```

Behavior:

- Activation must ensure only one account is active.
- Deleting the active account should either be rejected with a clear 400 or activate another account deterministically. Prefer rejecting for this slice.
- Keep current VR values mutable through explicit PATCH.

### Courses / Routes / Map

```text
GET /api/v1/courses
GET /api/v1/routes
GET /api/v1/map-points
GET /api/v1/course-search
POST /api/v1/course-selection/resolve
```

`POST /api/v1/course-selection/resolve` request:

```json
{
  "from_map_point_id": "mp_dk_pass",
  "to_map_point_id": "mp_dk_pass"
}
```

Expected behavior:

- Same map point / same course resolves to `kind = "course"` and returns the corresponding course.
- Different points resolve to a `kind = "route"` if a route exists with matching `from_course_id` and `to_course_id`.
- Return 404 or 400 with a useful error if no route can be resolved.
- Response must include `display_name` and `confirm_message`.

Use `map_points.course_id` as the source for resolving clicked points.

### Play Sessions

```text
POST /api/v1/play-sessions
GET  /api/v1/play-sessions/active
GET  /api/v1/play-sessions/{session_id}
POST /api/v1/play-sessions/{session_id}/finish
```

Behavior:

- `source` is required and must be `ranked` or `lounge`.
- Ranked sessions should use selected or provided VR account.
- Lounge sessions may accept `player_count` and `format`.
- `GET /active` should return active sessions, not only one global singleton.
- `finish` should mark session completed and set `completed_at`.

### Race Records

```text
POST  /api/v1/play-sessions/{session_id}/races/draft
PATCH /api/v1/race-records/{race_id}/complete-ranked
PATCH /api/v1/race-records/{race_id}
POST  /api/v1/race-records/{race_id}/cancel
POST  /api/v1/play-sessions/{session_id}/undo-last-race
```

Behavior:

- A race must reference exactly one of `course_id` or `route_id`.
- Ranked flow:
  - draft creates a draft race after course/route selection.
  - `complete-ranked` requires participant count, placement band, and rating delta.
  - Calculate `rating_before` from account current VR if not provided.
  - Calculate `rating_after = rating_before + rating_delta` if not provided.
  - Update the VR account `current_vr`.
  - Create a rating snapshot.
- Lounge flow:
  - course/route record can be completed immediately.
  - race number should increment within the session.
  - session auto-finishes after race 12.
  - warning flags should be returned and persisted, but must not block recording.
- `undo-last-race` should cancel or remove the latest race for the session. Prefer marking `cancelled` unless simpler behavior is already established.

## Warning Logic

Implement service-level warning logic for Lounge:

- `repick`: same `course_id` already completed in the same active session.
- `repick`: route with same `repick_group_key` already completed in the same active session.
- `route_banned_12p`: source is `lounge`, player_count is `12`, and selected record is a route with `is_lounge_12p_banned = true`.

Return warnings in the race response. Warnings must not prevent saving.

## Tests

Add focused backend tests. Prefer tests that can run without a live PostgreSQL service where practical, but API tests may use SQLite only if SQLAlchemy/Postgres-specific types do not make that brittle. If live PostgreSQL is required for endpoint tests, document it clearly.

Required test coverage:

- settings default creation
- VR account activation only leaves one active account
- course selection resolve same point -> course
- course selection resolve different points -> route
- ranked race completion updates current VR and rating snapshot
- Lounge repick warning
- Lounge 12-player banned route warning
- Lounge session auto-finish after race 12, if feasible in this slice

If a specific test cannot be implemented without broader test infrastructure, report why.

## Constraints

- Preserve existing health endpoint behavior.
- Do not implement frontend changes.
- Do not implement Lounge API external sync.
- Do not implement analytics endpoints.
- Do not implement course notes/map annotations CRUD in this handoff unless needed for shared infrastructure.
- Do not implement file upload.
- Do not change deployment ports, GHCR, Portainer, or workflow behavior.
- Do not touch secrets, credentials, `.env`, or local settings.
- Do not commit automatically.

## Verification

Run what is practical and report exact results:

- `python -m py_compile` for backend modules.
- `python -m pytest`.
- If PostgreSQL is available, run migration/seed and a small API smoke test.
- If DB-backed API tests are blocked by local environment, report the blocked check and exact reason.

## Expected Report

- Changed files
- Summary
- Endpoint list implemented
- Verification results
- Blocked checks
- Design questions for Codex
