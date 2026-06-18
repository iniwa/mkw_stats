Read AGENTS.md, CLAUDE.md, `docs/design/time-attack.md`, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

> Reviewed by Codex on 2026-06-18. Implementation accepted. Backend tests: 151 passed. PostgreSQL migration round-trip remains an operational verification item.

## Goal

Implement the backend persistence and API foundation for the Time Attack feature.

This handoff covers the database model, Alembic migration, API schemas/routes, and backend tests only. The TA navigation and UI will be implemented in a separate handoff after Codex reviews this backend work.

## Background

The approved feature design is `docs/design/time-attack.md`.

Time Attack data is independent from ranked VR and Lounge race records. Each existing course may have one record per category:

- `nita`
- `item`

Each record stores the current personal best, reference WR, target time, and one optional note for each time. Times are stored as positive integer milliseconds or `null`.

TA rows are created lazily by an upsert API. Do not add TA rows to the initial seed.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/time-attack.md`
- `backend/app/models/base.py`
- `backend/app/models/enums.py`
- `backend/app/models/courses.py`
- `backend/app/models/__init__.py`
- `backend/app/schemas/__init__.py`
- `backend/app/api/__init__.py`
- `backend/app/api/courses.py`
- `backend/app/api/notes.py`
- `backend/alembic/versions/007_map_annotation_goal_image.py`
- `backend/tests/conftest.py`
- `backend/tests/test_api.py`
- `scripts/record_only_cleanup.sql`

## Files To Edit

- `backend/app/models/enums.py`
- `backend/app/models/courses.py`
- `backend/app/models/__init__.py`
- `backend/app/schemas/__init__.py`
- `backend/app/api/__init__.py`
- `backend/tests/test_api.py`
- `scripts/record_only_cleanup.sql`

## Files To Add

- `backend/app/api/time_attack.py`
- `backend/alembic/versions/008_time_attack_records.py`

Do not add a service layer unless implementation reveals non-trivial reusable domain logic that cannot reasonably remain in the small router. If that occurs, stop and report the proposed file and reason before expanding scope.

## Required Implementation

### Enum

Add `TimeAttackCategory` to `backend/app/models/enums.py`:

```py
class TimeAttackCategory(str, enum.Enum):
    nita = "nita"
    item = "item"
```

Export it from `backend/app/models/__init__.py`.

### Model

Add `TimeAttackRecord` to `backend/app/models/courses.py` and export it from `backend/app/models/__init__.py`.

Required columns:

- `id`: PostgreSQL UUID, primary key, generated with `uuid.uuid4`
- `course_id`: `String(64)`, non-null FK to `courses.id`
- `category`: SQLAlchemy enum named `time_attack_category`, non-null
- `personal_best_ms`: nullable integer
- `world_record_ms`: nullable integer
- `target_time_ms`: nullable integer
- `personal_best_note`: nullable text
- `world_record_note`: nullable text
- `target_note`: nullable text
- `created_at`: timezone-aware datetime, non-null, server default `now()`
- `updated_at`: timezone-aware datetime, non-null, server default `now()`, updated on ORM changes

Required constraints:

- unique constraint on `(course_id, category)` named `uq_ta_record_course_category`
- each time column must be `null` or greater than zero; add named check constraints

Do not add relationships unless required by the current API.

### Migration

Add Alembic revision `008`, down revision `007`.

The migration must:

- create PostgreSQL enum type `time_attack_category` with values `nita` and `item`
- create `time_attack_records` with the model columns, FK, unique constraint, and positive-time check constraints
- create a useful index for course/category lookup only if it is not redundant with the unique constraint
- downgrade by dropping the table and then the PostgreSQL enum type cleanly
- not insert seed rows or modify existing user data

Keep the migration valid for the production PostgreSQL target. The normal API tests remain SQLite-backed through model metadata.

### Schemas

Add these schemas to `backend/app/schemas/__init__.py`:

- `TimeAttackRecordRead`
- `TimeAttackRecordUpdate`

`TimeAttackRecordRead` must expose all model columns.

`TimeAttackRecordUpdate` must define all six editable fields as optional:

- time fields: `int | None`, with positive integer validation when non-null
- note fields: `str | None`

The schema must preserve the distinction between:

- omitted field: keep existing value
- explicitly supplied `null`: clear the value

The router must use `model_dump(exclude_unset=True)` or equivalent behavior based on `model_fields_set`.

### API

Add and register a router with prefix `/api/v1` and tag `time-attack`.

Implement:

```http
GET /api/v1/time-attack-records
GET /api/v1/time-attack-records?category=nita
GET /api/v1/time-attack-records?category=item
PUT /api/v1/time-attack-records/{course_id}/{category}
```

GET behavior:

- return saved TA records only
- optional category filter must use `TimeAttackCategory`
- invalid category returns FastAPI/Pydantic `422`
- deterministic ordering:
  - without filter: `Course.sort_order`, `Course.id`, then category
  - with filter: `Course.sort_order`, then `Course.id`
- return `TimeAttackRecordRead[]`

PUT behavior:

- path category must use `TimeAttackCategory`; invalid category returns `422`
- unknown `course_id` returns `404`
- upsert by `(course_id, category)`
- create when absent and update when present
- return `200` with `TimeAttackRecordRead` for both create and update
- update only fields present in the request
- an explicit JSON `null` clears that field
- omitted fields retain their existing values
- commit and refresh before returning
- preserve the unique constraint as the final data-integrity guard

The single-user LAN scope does not require a new locking or retry framework. Do not weaken the unique constraint.

### Cleanup Script

TA data must survive `scripts/record_only_cleanup.sql`.

The current script does not delete unknown tables, so do not add a TA deletion. Update its documentation and pre/post count output to explicitly list `time_attack_records` as preserved.

## Constraints

- Preserve ranked VR and Lounge behavior unchanged.
- Do not modify the seed to create TA rows.
- Do not alter `courses`, routes, race records, rating semantics, or existing API contracts.
- Do not add external WR import, Google Sheets integration, WR Top 10, PB history, recorded-date fields, URL fields, route-based TA, character/vehicle dimensions, or OBS support.
- Do not add dependencies.
- Do not edit frontend files in this handoff.
- Do not edit `.env`, credentials, deployment ports, GHCR behavior, Portainer behavior, or external exposure.
- Keep PostgreSQL as the production database and preserve the existing SQLite-backed API test strategy.

## Verification

Run:

```sh
cd backend
python -m pytest
python -m py_compile app/models/enums.py app/models/courses.py app/schemas/__init__.py app/api/time_attack.py
python -m alembic heads
```

Add backend tests covering at minimum:

- empty GET returns an empty list
- create by PUT
- repeat PUT updates rather than inserts a duplicate
- GET without filter returns both categories in deterministic order
- GET filters `nita`
- GET filters `item`
- invalid GET category returns `422`
- unknown course PUT returns `404`
- invalid PUT category returns `422`
- each time field saves and returns correctly
- each note field saves and returns correctly
- zero and negative time values return `422`
- explicit `null` clears existing values
- omitted fields preserve existing values
- the database contains only one row for a repeated `(course_id, category)` PUT

If a PostgreSQL test database is available, also run upgrade to `008`, downgrade to `007`, and upgrade to `008` again. Do not create or mutate an external database merely to satisfy this optional check; report it as blocked if unavailable.

## Expected Report

- Changed files
- Summary
- Verification results
- Whether PostgreSQL migration upgrade/downgrade was run
- Blocked checks
- Any files changed outside `Files To Edit` / `Files To Add`
- Design questions for Codex
