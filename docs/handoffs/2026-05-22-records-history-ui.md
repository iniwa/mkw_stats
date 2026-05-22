Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add a minimal read-only Records screen for reviewing recorded play sessions and
their races.

The user should be able to open the existing `Records` nav item, see recent
ranked/Lounge sessions, select a session, and inspect the races stored for that
session.

## Background

The app can already create records through the Playing UI. The missing piece is
a history view.

Relevant decision:

- `docs/decisions/2026-05-22-records-history-scope.md`

Existing endpoints:

```text
GET /api/v1/play-sessions/active
GET /api/v1/play-sessions/{session_id}
GET /api/v1/play-sessions/{session_id}/races?include_cancelled=true
GET /api/v1/courses
GET /api/v1/routes
```

Needed backend addition:

```text
GET /api/v1/play-sessions
```

Suggested query parameters:

- `limit`: integer, default 50, min 1, max 200
- `status`: optional session status (`active`, `completed`, `cancelled`)
- `source`: optional source (`ranked`, `lounge`)

Suggested ordering:

- newest first by `started_at`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/api.ts`
- `frontend/src/PlayingView.tsx`
- `backend/app/api/sessions.py`
- `backend/app/services/race_flow.py`
- `backend/app/schemas/__init__.py`
- `backend/tests/test_api.py`
- `docs/decisions/2026-05-22-records-history-scope.md`

## Files To Edit

Create or edit only:

- `backend/app/services/race_flow.py`
- `backend/app/api/sessions.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/RecordsView.tsx`
- `README.md` only if you update the API list or add a short Records note

Do not edit:

- database models or migrations
- deploy, Docker, GHCR, Portainer, or workflow files
- Settings or Playing behavior except normal App routing if needed
- docs except README if useful
- secrets, credentials, `.env`, or local settings

## Required Backend Behavior

Add `GET /api/v1/play-sessions` returning `list[PlaySessionRead]`.

Behavior:

- Return recent sessions ordered newest first by `started_at`.
- Respect optional `limit`, `status`, and `source` query parameters.
- Use existing enum types and `PlaySessionRead`.
- Do not include race records in this response.
- Do not change existing `/play-sessions/active` or `/{session_id}/races`.
- Add focused tests for:
  - newest-first ordering
  - `status` filter
  - `source` filter
  - `limit`

Implementation hint:

- Add a `list_sessions(db, limit, status, source)` service function in
  `race_flow.py`.
- Register `/play-sessions` before `/play-sessions/{session_id}` in
  `sessions.py`.

## Required API Client Additions

In `frontend/src/api.ts`, add:

```ts
getSessions(options?: { limit?: number; status?: SessionStatus; source?: SourceType })
```

Build the query string with `URLSearchParams` or another structured browser API.
Do not hand-concatenate complex query strings.

## Required UI Behavior

Add `RecordsView` and wire the existing `Records` nav item to it.

Records screen must include:

- Loading state
- Inline error state
- Reload button
- A compact filter row:
  - source: all / ranked / lounge
  - status: all / active / completed / cancelled
- Recent session list showing:
  - source
  - status
  - started time
  - completed time if present
  - VR account id shortened for ranked sessions, if present
  - Lounge player count and format, if present
- Selecting a session loads its races with `include_cancelled=true`.
- Race detail area showing:
  - race number
  - status
  - course or route display name
  - player count
  - ranked result fields when present: placement band, rating delta, before/after
  - warning labels for Lounge warnings
  - memo when present
- Cancelled races should remain visible but visually distinct.
- If no sessions or no races exist, show a clear empty state.
- Disable relevant controls while requests are running.

Name resolution:

- Load `courses` and `routes` and resolve display names client-side.
- Course display name should prefer `short_name`, then `name_ja`, then `id`.
- Route display name should prefer `short_name`, then `name_ja`, then `id`.

## UX / Styling Requirements

- Match the existing restrained operational UI.
- Use full-width panels/simple lists; do not create a marketing layout.
- Do not use nested cards.
- Keep dense but readable rows.
- Ensure controls and row text fit on narrow screens.

## Constraints

- This is a read-only Records slice.
- Do not add edit/delete/cancel buttons to Records.
- Do not add charts, analytics, exports, search, or pagination beyond `limit`.
- Do not change DB schema.
- Do not add dependencies.
- Do not change deployment files.
- Do not commit automatically.

## Verification

Run and report:

- `python -m py_compile` for changed backend modules
- `python -m pytest` from `backend/`
- `npm run typecheck` from `frontend/`
- `npm run build` from `frontend/`

If a live backend is available, optionally smoke test:

- open Records screen
- verify sessions load
- select a ranked session and a Lounge session if present
- verify cancelled races are visible and visually distinct

If no live backend/browser is available, report the blocker and rely on tests/build checks.

## Expected Report

- Changed files
- Summary
- Backend endpoint behavior implemented
- Records UI behavior implemented
- Verification results
- Blocked checks
- Bugs found
- Design questions for Codex
