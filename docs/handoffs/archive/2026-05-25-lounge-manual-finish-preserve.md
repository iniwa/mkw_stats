Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Preserve manually finished Lounge sessions when race records are hidden or restored.

Currently, `hide_race()` / `restore_race()` calls `_sync_lounge_auto_finish()`. That helper can move any completed Lounge session back to `active` when it has fewer than 12 visible completed races. This is correct for sessions completed automatically by the 12-race rule, but it is wrong for sessions the user manually finished with `POST /play-sessions/{id}/finish`.

Add a small session-level completion reason so auto-finished sessions can still reopen when needed, while manually finished sessions remain completed.

## Background

Pi verification of hidden race recovery found this case:

- A Lounge session had been manually finished while it had fewer than 12 visible completed races.
- Hiding/restoring a race caused `_sync_lounge_auto_finish()` to re-evaluate the session and move it back to `active`.
- The session was manually finished again during verification.

This was recorded in `docs/design/ui-redesign-roadmap.md`. Implement the data model needed to make the distinction explicit.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/ui-redesign-roadmap.md`
- `backend/app/models/sessions.py`
- `backend/app/schemas/__init__.py`
- `backend/app/services/race_flow.py`
- `backend/app/api/sessions.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`

## Files To Edit

- `backend/app/models/sessions.py`
- `backend/app/schemas/__init__.py`
- `backend/app/services/race_flow.py`
- `backend/alembic/versions/005_lounge_completion_reason.py` (new)
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `docs/design/ui-redesign-roadmap.md`

Do not edit UI components unless a typecheck failure proves it is necessary.

## Required Behavior

Add `PlaySession.completion_reason`:

- Nullable string column, suggested values:
  - `"manual"` for `finish_session()`
  - `"auto"` for `_sync_lounge_auto_finish()` 12-race completion
  - `null` while active or unknown
- Expose it in `PlaySessionRead` and the frontend `PlaySession` type.

Migration:

- New Alembic revision after `004_lounge_mmr_game`.
- Add `play_sessions.completion_reason` as nullable string.
- Backfill existing completed sessions with a non-null `completed_at` to `"manual"` so current Pi data does not unexpectedly reopen later.
- Downgrade should drop the column.

Service logic:

- `finish_session()` must set `completion_reason = "manual"`.
- `_sync_lounge_auto_finish()` must set `completion_reason = "auto"` when it auto-completes an active Lounge session at 12 visible completed races.
- `_sync_lounge_auto_finish()` may reopen a completed Lounge session only when `completion_reason == "auto"` and visible completed races fall below 12.
- When auto-reopening, clear `completed_at` and `completion_reason`.
- Manually completed sessions (`completion_reason == "manual"`) must stay completed when hide/restore changes visible completed race counts.
- Legacy completed sessions with `completion_reason is None` should be treated conservatively as manual, not auto, in runtime logic.

Tests:

- Existing tests must keep passing.
- Add tests for:
  - manual finished Lounge session with fewer than 12 visible completed races remains completed after hide.
  - manual finished Lounge session remains completed after restore.
  - auto-finished Lounge session gets `completion_reason == "auto"`.
  - hiding one completed race from an auto-finished Lounge session reopens it and clears `completion_reason`.
  - restoring that hidden race can auto-complete it again and set `completion_reason == "auto"`.

## Constraints

- Keep this as a backend semantics fix plus API type update. Do not redesign Records, Playing, or Lounge UI.
- Do not change cancellation semantics unless a test reveals an unavoidable conflict.
- Do not change MMR sync behavior.
- Do not change Portainer, GHCR, Docker, or GitHub Actions behavior.
- Do not delete existing data in migrations.
- Preserve current hidden race behavior: hidden races are excluded from default race listing and analytics.

## Non Goals

- No hard delete of sessions or races.
- No UI for showing completion reason.
- No session cleanup UI.
- No broader Lounge match-state redesign.
- No Pi deployment in this implementation handoff.

## Verification

Run from repo root:

```powershell
cd backend
python -m py_compile app\models\sessions.py app\schemas\__init__.py app\services\race_flow.py tests\test_api.py
python -m pytest tests\ -q

cd ..\frontend
npm run typecheck
npm run build
```

If local PostgreSQL is unavailable, Alembic runtime verification can be deferred to a later Pi verification handoff, but the migration file must be syntactically valid and consistent with the model.

## Expected Report

- Changed files
- Summary
- Migration details
- Verification results
- Blocked checks
- Design questions for Codex
