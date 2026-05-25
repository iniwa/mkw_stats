Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add a small recovery path for race records that were hidden from Records by mistake.

Users can already hide race records entered by mistake. This slice adds:

- backend API to restore a hidden race record
- frontend API client method
- Records UI control to include hidden races for the selected session
- restore button for hidden race rows

This is an MVP recovery UI, not a full trash-management screen.

## Background

Current behavior:

- `RaceRecord` has `is_hidden` and `hidden_at`.
- `POST /api/v1/race-records/{race_id}/hide` sets hidden state.
- `GET /api/v1/play-sessions/{session_id}/races` excludes hidden races by default.
- `include_hidden=true` already returns hidden rows.
- Records currently calls `api.getSessionRaces(id, true)` and therefore includes cancelled records but not hidden records.

Relevant design:

- `docs/design/ui-redesign-roadmap.md`
  - Records should allow hiding/deleting records entered by mistake.
  - Hidden/deleted records should be excluded from default Records and Analytics.
  - A recovery view was deferred, and this handoff implements the minimal recovery path.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/ui-redesign-roadmap.md`
- `backend/app/api/races.py`
- `backend/app/services/race_flow.py`
- `backend/app/schemas/__init__.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/App.css`

## Files To Edit

- `backend/app/api/races.py`
- `backend/app/services/race_flow.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/App.css`

Only edit `backend/app/schemas/__init__.py` if the existing `RaceRecordRead` response does not already expose fields needed by the UI.

## Constraints

- Keep the change scoped to hidden race recovery.
- Do not change the hidden-record default: hidden races must remain excluded unless explicitly requested.
- Do not change Analytics behavior in this slice.
- Do not hard-delete race records.
- Do not add a separate global trash page.
- Do not alter migration/schema unless absolutely required. Existing `is_hidden` and `hidden_at` fields are enough.
- Do not change cancellation semantics.
- Restoring a race should not recalculate ranked VR account `current_vr`.
- Restoring a race should not automatically attach MMR sync data.
- For Lounge sessions, restoring a completed hidden race should re-run the existing auto-finish consistency helper if practical, mirroring hide behavior.
- Preserve existing Japanese UI copy style where possible. If existing file text is mojibake in the local environment, keep new text simple and verify in browser/build rather than broad-rewriting old copy.

## Backend Requirements

Add a restore service function, for example:

```python
def restore_race(db: Session, race_id: uuid.UUID) -> RaceRecord:
    ...
```

Expected behavior:

- 404 if the race does not exist.
- If race is already visible (`is_hidden=False`), return it unchanged.
- If hidden:
  - set `is_hidden=False`
  - set `hidden_at=None`
  - commit and return the record
- If the race belongs to a Lounge session, call the same auto-finish consistency logic used by hide/complete so the session status remains coherent with visible completed race count.

Add endpoint:

```text
POST /api/v1/race-records/{race_id}/restore
```

Response model:

- existing `RaceRecordRead`

Tests to add/update:

- hide then restore returns `is_hidden=false` and `hidden_at=null`
- restoring an already visible race is idempotent
- `GET /play-sessions/{id}/races` default excludes hidden but includes restored races again
- `include_hidden=true` shows hidden rows
- 404 for unknown race id
- if feasible, Lounge visible completed count/session auto-finish remains consistent after restore

## Frontend Requirements

### API

Add:

```ts
restoreRaceRecord(raceId: string): Promise<RaceRecord>
```

Endpoint:

```text
POST /race-records/{race_id}/restore
```

### Records UI

In `RecordsView.tsx`:

- Add selected-session level toggle:
  - label can be simple, e.g. `非表示も表示`
  - default off
  - when off, keep current behavior: `getSessionRaces(selectedId, true, false)`
  - when on, request hidden too: `getSessionRaces(selectedId, true, true)`
- Hidden rows should be visually distinct:
  - add a row class such as `records__race-item--hidden`
  - show a small `非表示` tag
- Hidden rows should show:
  - restore button, e.g. `表示に戻す`
  - no hide button
  - edit can remain available only if this is easy and already safe; otherwise disable editing for hidden rows in this slice
- Restore action:
  - confirm dialog before restore
  - call `api.restoreRaceRecord`
  - refresh current race list
  - clear row error on success
  - show row-level error on failure
- If the include-hidden toggle is turned off after viewing hidden rows, the refreshed list should hide them again.

Style additions should stay small:

- hidden row opacity/background marker
- hidden tag if existing tag styles are insufficient
- compact toggle row if needed

## Non Goals

- No permanent deleted-record/trash page.
- No hard delete.
- No bulk restore.
- No session-level hide/restore.
- No Analytics changes.
- No VR current value recalculation for historical restore.
- No MMR resync behavior.
- No deployment, GHCR, or Portainer changes.

## Verification

Run from `backend/`:

```bash
python -m py_compile app/api/races.py app/services/race_flow.py tests/test_api.py
python -m pytest tests/ -q
```

Run from `frontend/`:

```bash
npm run typecheck
npm run build
```

If a local or Pi backend is available, browser-check Records:

- select a session with races
- hide a race
- confirm it disappears with hidden toggle off
- enable `非表示も表示`
- confirm hidden row appears with hidden tag/style
- restore it
- confirm it appears in the normal list again
- verify cancelled rows still behave as before
- verify 375px viewport has no horizontal overflow
- verify browser console has no React/JavaScript errors

If live browser verification is not possible, report it as blocked and rely on tests/typecheck/build.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Backend API behavior
- Records UI behavior
- Verification results
- Blocked checks
- Residual test data, if any
- Bugs found
- Design questions for Codex
