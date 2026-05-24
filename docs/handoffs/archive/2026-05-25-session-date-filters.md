Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add date range filtering for session history and expose it in Records, Analytics, and Lounge overview.

The user should be able to narrow history-oriented views by start date / end date while preserving the current default "recent sessions" behavior when no dates are selected.

## Background

The app now has working Dashboard, Playing, Records, Analytics, Courses, Lounge, and Settings views.

Records, Analytics, and Lounge overview all depend on `GET /api/v1/play-sessions`:

- Records: session list and selected session races
- Analytics: recent 50 sessions plus all races for those sessions
- Lounge: recent 50 Lounge sessions plus races for those sessions

The backend list endpoint currently supports:

- `limit`
- `status`
- `source`

Add date range support to this existing endpoint instead of creating a new API.

Relevant decision:

- `docs/decisions/2026-05-25-session-date-filter-scope.md`

Important encoding note:

- Some PowerShell output may display Japanese strings as mojibake unless read as UTF-8. Do not "fix" Japanese text unless you have confirmed the file content is actually corrupted.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-25-session-date-filter-scope.md`
- `backend/app/api/sessions.py`
- `backend/app/services/race_flow.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.css`

## Files To Edit

Backend:

- `backend/app/api/sessions.py`
- `backend/app/services/race_flow.py`
- `backend/tests/test_api.py`

Frontend:

- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.css`

Docs, if needed:

- `README.md`

Do not edit deployment, Docker, GHCR, Portainer, migration, or seed files.

## Backend Requirements

Extend `GET /api/v1/play-sessions` with optional query parameters:

- `started_from`: ISO datetime, inclusive lower bound
- `started_to`: ISO datetime, exclusive upper bound

Expected behavior:

- If neither value is supplied, behavior stays exactly as today.
- Results are still ordered by `started_at DESC`.
- Existing filters still work with the new date filters:
  - `limit`
  - `status`
  - `source`
- `started_from` applies `PlaySession.started_at >= started_from`.
- `started_to` applies `PlaySession.started_at < started_to`.
- `limit` remains validated as `1..200`.
- Invalid datetime values should be rejected by FastAPI validation.

Implementation guidance:

- Use `datetime` in the FastAPI route signature.
- Pass the values through to `race_flow.list_sessions`.
- Add optional parameters to `race_flow.list_sessions`.
- Keep the query composition simple and consistent with the existing filters.

Backend tests:

Add focused tests in `backend/tests/test_api.py` for:

1. `started_from` includes sessions at/after the lower bound and excludes older sessions.
2. `started_to` excludes sessions at/after the upper bound.
3. Combined `started_from` + `started_to` returns only sessions inside the range.
4. Date filters compose with `source`, `status`, and `limit`.
5. Default newest-first behavior remains unchanged.

Prefer creating test sessions with explicit `started_at` values through the test DB/session helper already used in this test file. Do not depend on wall-clock ordering for the date filter tests.

## Frontend Requirements

Update `api.getSessions` to accept:

- `started_from?: string`
- `started_to?: string`

These should be appended as query parameters only when set.

Add date/limit controls to these views:

### Records

Records should keep its existing source/status filters and add:

- Start date input (`type="date"`)
- End date input (`type="date"`)
- Limit selector or number input with reasonable options, for example 25 / 50 / 100 / 200
- Clear date range button

When either date changes:

- Clear the selected session and selected races, same as source/status filter changes.
- Reload sessions using the selected date range.

### Analytics

Analytics should add a compact history window control:

- Start date input
- End date input
- Limit selector or number input
- Clear date range button

Update the header label so it reflects the current window, for example:

- `Recent 50 sessions` when no dates are selected.
- `Filtered sessions` or a concise date range label when dates are selected.

The race aggregation should continue to use races for the returned sessions only.

### Lounge

Lounge overview should add the same compact history window controls:

- Start date input
- End date input
- Limit selector or number input
- Clear date range button

The controls should apply only to Lounge sessions by passing `source: 'lounge'` plus the date range to `api.getSessions`.

### Date Conversion

Use local browser dates for the UI and send ISO datetimes to the backend:

- Start date `YYYY-MM-DD` -> local midnight for that date -> `.toISOString()`
- End date `YYYY-MM-DD` -> local midnight of the next day -> `.toISOString()`

This makes the date inputs behave as whole-day filters in the user's local timezone.

If only start is set, only send `started_from`.
If only end is set, only send `started_to`.

### UI Constraints

- Reuse existing flat panel/control style.
- Do not add new dependencies.
- Do not create nested cards.
- At 375px width, controls must wrap without horizontal overflow.
- Loading, error, empty, and retry states must continue to work.
- Browser console should have no app errors.

## Non Goals

- No backend analytics endpoint.
- No database migrations.
- No timezone preference setting.
- No Dashboard changes.
- No export/download feature.
- No charts or visualization libraries.
- No deployment/Portainer/GHCR changes.
- No Lounge API sync.

## Verification

Backend:

```sh
cd backend
python -m py_compile app/api/sessions.py app/services/race_flow.py tests/test_api.py
python -m pytest tests/
```

Frontend:

```sh
cd frontend
npm run typecheck
npm run build
```

Browser/dev verification if possible:

- Records:
  - Default load still shows recent sessions.
  - Source/status filters still work.
  - Start/end date filters reduce the session list as expected.
  - Selecting a session still loads races.
- Analytics:
  - Default window still works.
  - Date range changes session/race aggregate numbers.
  - Empty filtered range shows a clear empty state.
- Lounge:
  - Default window still works.
  - Date range changes Lounge session set and warning/target aggregates.
  - Empty filtered range shows a clear empty state.
- 375px width: no horizontal page overflow.
- Console: no app errors.

If local backend/PostgreSQL is unavailable, run backend tests and frontend type/build checks, then report browser verification as blocked with the exact reason.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Backend endpoint behavior
- UI behavior by view
- Verification results
- Blocked checks
- Any screenshots/temp files created
- Design questions for Codex
