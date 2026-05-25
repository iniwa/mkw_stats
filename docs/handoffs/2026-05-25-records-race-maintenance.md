Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add a small Records maintenance slice so the user can edit a race memo and cancel a mistaken race from the Records view.

## Background

Records already lists sessions and session races. It fetches races with `include_cancelled=true`, and cancelled races are already visually distinguished.

The backend already has the needed endpoints:

- `PATCH /api/v1/race-records/{race_id}`
- `POST /api/v1/race-records/{race_id}/cancel`

Relevant decision:

- `docs/decisions/2026-05-25-records-race-maintenance-scope.md`

This should be a narrow frontend-first slice. Backend changes should be unnecessary unless you find a clear bug in the existing endpoint behavior.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-25-records-race-maintenance-scope.md`
- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/App.css`
- `backend/app/api/races.py`
- `backend/app/schemas/__init__.py`
- `backend/app/services/race_flow.py`

## Files To Edit

Expected:

- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/App.css`

Optional, if it keeps `RecordsView.tsx` manageable:

- `frontend/src/RecordsRaceActions.tsx`

Backend files should not be edited unless an existing endpoint bug blocks the UI.

## Requirements

### API Client

Add typed client helpers for existing endpoints:

- `updateRaceRecord(raceId, body)`
  - use `PATCH /race-records/{race_id}`
  - body should support the existing `RaceUpdateRequest` fields, but the UI in this slice only needs `memo`
- `cancelRaceRecord(raceId)`
  - use `POST /race-records/{race_id}/cancel`

Add a `RaceUpdateBody` type if useful.

### Records UI

In the selected session's race detail list:

- Add an "編集" action for each race row.
- Editing should allow changing only `memo`.
- Keep existing memo display when not editing.
- Support saving an empty memo as `null` or an empty string consistently with current backend behavior; prefer `null` only if existing app conventions already do so.
- Provide "保存" and "キャンセル" actions while editing.
- Disable buttons while the request is in flight.
- Show an inline error if update fails.
- After successful save, refresh the selected session race list from the backend.

For non-cancelled races:

- Add a "取消" action.
- The action must require explicit confirmation, e.g. `window.confirm`.
- After successful cancel, refresh the selected session race list.
- The cancelled row should remain visible and use the existing cancelled styling.
- Do not show the cancel action for already-cancelled rows.

### UX / Safety

- Make it clear this is "取消", not deletion.
- Do not add bulk actions.
- Do not add hard delete.
- Do not edit race target, race number, status, VR delta, VR before/after, source, warnings, character, or vehicle in this slice.
- Keep controls compact enough for the Records detail panel.
- 375px viewport must not horizontally overflow.

## Constraints

- Prefer frontend-only.
- Do not add dependencies.
- Do not add migrations.
- Do not add new backend endpoints.
- Do not change Playing, Analytics, Lounge, Dashboard, Courses, or Settings behavior.
- Do not change deployment files.
- Do not commit automatically.

## Non Goals

- Session deletion or archival.
- Bulk cleanup tooling.
- Editing course/route target.
- Editing ranked VR values.
- Restoring cancelled races.
- Server-side audit/history table.

## Verification

Run:

```text
cd frontend
npm run typecheck
npm run build
```

If backend files are changed unexpectedly, also run:

```text
cd backend
python -m pytest tests/
```

Browser/dev verification if possible:

- Records loads sessions and races as before.
- Edit memo on a completed ranked race, save, reload selected races, and verify the memo persists.
- Edit memo to empty and verify the displayed state is reasonable.
- Cancel a non-cancelled race after confirmation; row remains visible as cancelled.
- Cancel action is hidden/disabled for cancelled races.
- Failed update/cancel shows an inline error without breaking the page.
- 375px viewport has no horizontal overflow.
- Browser console has no app errors.

If no live backend is available, run typecheck/build and report live mutation checks as blocked until Pi deployment.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Verification results
- Blocked checks
- Any screenshots or temporary files created
- Design questions for Codex
