Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add the initial database foundation for MKWorld Stats Manager:

- SQLAlchemy model layer
- Alembic migration setup
- Initial PostgreSQL schema for MVP core tables
- Small deterministic seed data for courses, routes, map points, and one VR account
- Basic backend tests for model/migration-adjacent business rules where practical

This handoff should make the backend ready for the next API handoff. Do not implement REST endpoints beyond the existing health endpoint.

## Background

The initial Docker web app scaffold is complete. The next implementation step is Phase 1/2 from `mkworld_stats_manager_docs_v0_1/07_implementation_tasks.md`: DB schema plus minimal master data.

Important design source:

- `mkworld_stats_manager_docs_v0_1/04_db_design.md`

Design priorities:

- Ranked VR and Lounge must be separated by `source`.
- Normal 3-lap courses and route courses must be separate concepts.
- Playing sessions are represented by `play_sessions`.
- Individual races are represented by `race_records`.
- Lounge API synced table/player data must stay separate from manually recorded race-level course history.
- Image binaries are not stored in the DB.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docker-compose.yml`
- `.env.example`
- `backend/requirements.txt`
- `backend/app/main.py`
- `mkworld_stats_manager_docs_v0_1/01_design.md`
- `mkworld_stats_manager_docs_v0_1/02_requirements.md`
- `mkworld_stats_manager_docs_v0_1/04_db_design.md`
- `mkworld_stats_manager_docs_v0_1/05_api_design.md`
- `mkworld_stats_manager_docs_v0_1/07_implementation_tasks.md`

## Files To Edit

Create or edit only these paths unless a small backend wiring file is strictly required:

- `README.md`
- `.env.example`
- `backend/requirements.txt`
- `backend/app/**`
- `backend/alembic.ini`
- `backend/alembic/**`
- `backend/tests/**`
- `backend/pyproject.toml` if useful for pytest/python tooling

Do not edit:

- `frontend/**`
- `.github/workflows/**`
- `docker-compose.yml` unless required to run migrations or tests
- `AGENTS.md`
- `CLAUDE.md`
- `mkworld_stats_manager_docs_v0_1/**`
- `docs/handoffs/**`
- secrets, credentials, `.env`, or local settings

## Required Backend Shape

Add a small conventional backend structure. The exact module names may vary, but keep it understandable:

```text
backend/
  alembic.ini
  alembic/
    env.py
    versions/
      <revision>_initial_schema.py
  app/
    core/
      config.py
      database.py
    models/
      __init__.py
      ...
    seed/
      ...
    main.py
  tests/
    ...
```

Use environment variable `DATABASE_URL`. The existing compose value is:

```text
postgresql://${POSTGRES_USER:-mkw}:${POSTGRES_PASSWORD:-changeme}@postgres:5432/${POSTGRES_DB:-mkw_stats}
```

Use a SQLAlchemy-compatible driver URL as needed, for example `postgresql+psycopg://...`, but preserve compatibility with the existing environment variable where practical.

## Dependencies

Add minimal backend dependencies for:

- SQLAlchemy 2.x
- Alembic
- PostgreSQL driver, preferably psycopg 3
- pytest if tests are added

Do not add FastAPI plugins or large frameworks.

## Initial Schema Scope

Implement these tables now:

- `vr_accounts`
- `app_settings`
- `play_sessions`
- `race_records`
- `rating_snapshots`
- `courses`
- `routes`
- `route_repick_equivalents`
- `map_points`
- `course_aliases`
- `course_notes`
- `map_annotations`
- `uploaded_files`
- `lounge_tables`
- `lounge_table_players`
- `characters`
- `vehicles`
- `item_tables`

Implement these enums:

- `source_type`: `ranked`, `lounge`
- `race_status`: `draft`, `completed`, `cancelled`
- `session_status`: `active`, `completed`, `cancelled`
- `placement_band`: `top`, `middle`, `bottom`
- `annotation_type`: `pin`, `icon`, `arrow`, `text`, `area`

Reasonable implementation choices:

- UUID primary keys are acceptable.
- JSON/JSONB is acceptable for `tags`, `warning_flags`, `raw_data`, and flexible `style`.
- Add `created_at` / `updated_at` where useful.
- Keep constraints explicit where important.

Required constraints:

- `race_records` must reference exactly one of `course_id` or `route_id`.
- course/route-linked tables should reference exactly one of `course_id` or `route_id` where applicable.
- `vr_accounts` should support only one active account at a time if practical. A partial unique index on active rows is acceptable.
- Basic uniqueness for stable master keys such as course IDs, route IDs, aliases, and map point IDs should be enforced where practical.

## Seed Data

Add minimal deterministic seed data sufficient for future API/UI work:

- One active VR account, for example `main` with initial/current VR `0`.
- Several courses and map points from the design examples:
  - `dk_pass`
  - `peach_stadium`
  - `rainbow_road`
  - `mario_bros_circuit`
  - `crown_city`
- At least one same-point 3-lap course mapping, for example `DK Pass -> DK Pass`.
- At least one route, for example `Peach Stadium -> Rainbow Road`.
- At least one 12-player Lounge-banned route if using route examples.

Seed code should be idempotent. Running it twice must not duplicate records.

If exact official course names are uncertain, use clearly marked placeholder seed data and keep the schema capable of replacing it later.

## Migration/Seed Commands

Document commands in `README.md`, for example:

```text
cd backend
alembic upgrade head
python -m app.seed.initial_data
```

If commands need `DATABASE_URL`, document that explicitly.

## Tests

Add focused backend tests if practical without needing Docker:

- Python import/config smoke test.
- Enum/model metadata smoke test.
- Helper logic for race course-vs-route exclusivity if implemented as Python validation.
- Seed data idempotency if implemented in a testable way.

Do not require a live PostgreSQL service for all tests unless clearly documented. If DB tests need PostgreSQL and cannot run locally, report them as blocked.

## Constraints

- Preserve the existing `GET /api/v1/health` behavior.
- Do not implement business REST APIs in this handoff.
- Do not implement frontend changes.
- Do not add Lounge API network calls.
- Do not implement analytics, graphing, image upload behavior, or Playing UI behavior.
- Do not touch secrets, credentials, `.env`, or local settings.
- Do not commit automatically.

## Non Goals

- Full seed data for every course.
- Full item probability data.
- Full character/vehicle data.
- API endpoints for CRUD operations.
- Frontend DB integration.
- Raspberry Pi deployment verification.

## Verification

Run what is practical and report exact results:

- `python -m py_compile` or equivalent for backend modules.
- `python -m pytest` if tests are added.
- Alembic migration generation/static check if possible.
- If PostgreSQL is available, run `alembic upgrade head` and seed command.

If Docker/PostgreSQL is unavailable, do not block the whole task. Report DB runtime checks as blocked and explain what remains to run.

## Expected Report

- Changed files
- Summary
- Verification results
- Blocked checks
- Any design questions for Codex
