# Backend Core API Behavior

## Context

The first backend API vertical slice now supports settings, VR accounts,
course selection, play sessions, race records, and Lounge warnings.

Claude Code raised two implementation details for Codex review:

- SQLite-backed API tests need a SQLite-specific partial unique index condition
  for the single-active VR account rule.
- Ranked race undo/cancel needs a defined VR rollback rule.

## Decision

- Keep the PostgreSQL partial unique index as the production rule and allow a
  matching `sqlite_where` condition in the SQLAlchemy model for test portability.
- Do not change the initial Alembic migration for the SQLite-only condition.
- Cancelling or undoing a completed ranked race may delete that race's rating
  snapshot and roll `vr_accounts.current_vr` back to `race.rating_before`, but
  only when the account's current VR still equals that race's `rating_after`.
- If later ranked races have already changed the account VR, cancelling an older
  race must not silently rewind the later value.

## Reason

The SQLite condition keeps local tests close to production semantics without
changing PostgreSQL DDL. The ranked rollback rule supports the common "undo the
last mistaken record" workflow while avoiding unsafe mid-history rewrites.

## Constraints

- Warning flags remain advisory and must not block Lounge recording.
- `map_points.course_id` remains the canonical course-selection source.
- More advanced history editing can be added later as a separate design.

## Do Not Change Casually

- Do not remove the guard that only rolls back `current_vr` when it still matches
  the cancelled race's `rating_after`.
