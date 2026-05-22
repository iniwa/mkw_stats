Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add session race-history retrieval and wire the Playing UI to use it when resuming active sessions.

This fixes the known limitation from the Playing UI slice: recorded course history and warning flags are currently client-memory only, so they are lost when the app reloads or an active session is resumed.

## Background

The backend already supports:

- `POST /api/v1/play-sessions/{session_id}/races/draft`
- `PATCH /api/v1/race-records/{race_id}/complete-ranked`
- `POST /api/v1/play-sessions/{session_id}/undo-last-race`
- `POST /api/v1/play-sessions/{session_id}/finish`

The frontend Playing UI currently keeps `recordedRaces` in local React state. This is acceptable only for newly created sessions in one browser session.

Design decision:

- `docs/decisions/2026-05-22-session-race-list-api.md`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `backend/app/api/sessions.py`
- `backend/app/api/races.py`
- `backend/app/services/race_flow.py`
- `backend/app/schemas/__init__.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/PlayingView.tsx`
- `docs/decisions/2026-05-22-session-race-list-api.md`

## Files To Edit

Create or edit only:

- `backend/app/api/**`
- `backend/app/services/**`
- `backend/app/schemas/**`
- `backend/tests/**`
- `frontend/src/api.ts`
- `frontend/src/PlayingView.tsx`
- `README.md` only if you update the API list

Do not edit:

- `deploy/**`
- `.github/workflows/**`
- `docker-compose.yml`
- `docs/handoffs/**`
- `docs/decisions/**`
- `mkworld_stats_manager_docs_v0_1/**`
- secrets, credentials, `.env`, or local settings

## Required Backend Behavior

Add:

```text
GET /api/v1/play-sessions/{session_id}/races
```

Behavior:

- Return `404` if the session does not exist.
- Return race records for the given session ordered by `race_no`, then `created_at`.
- By default, exclude cancelled races.
- Support `include_cancelled=true` to include cancelled races.
- Reuse the existing `RaceRecordRead` response schema if possible.
- Do not add broad records search or analytics.

Suggested response model:

```python
list[RaceRecordRead]
```

## Required Frontend Behavior

Update the typed API client with:

```ts
getSessionRaces(sessionId: string, includeCancelled?: boolean): Promise<RaceRecord[]>
```

Update Playing UI:

- When creating a new session, initialize `recordedRaces` to an empty list.
- When resuming an active session, fetch `GET /play-sessions/{id}/races` and populate `recordedRaces`.
- When refreshing or reloading session state after record/undo/finish, use the race list endpoint where needed instead of relying only on `prev => ...`.
- Lounge `Race N / 12`, course history, warning icons, and warning history should reflect persisted race records.
- If the race-list fetch fails while resuming, show an inline error and do not silently show an empty history as if it were accurate.

## Tests

Add focused backend tests:

- race list returns records for a session in race order
- cancelled races are excluded by default
- `include_cancelled=true` includes cancelled races
- unknown session returns 404

Frontend verification can remain type/build checks unless a local backend is available.

## Constraints

- Preserve existing endpoint behavior.
- Do not change the database schema unless absolutely required.
- Do not implement full records list, analytics, course notes, map annotations, Lounge sync, file upload, characters, vehicles, or item tables.
- Do not change Docker, GHCR, Portainer, or deployment behavior.
- Do not commit automatically.

## Verification

Run and report:

- `python -m py_compile` for changed backend modules/tests
- `python -m pytest` from `backend/`
- `npm run typecheck` from `frontend/`
- `npm run build` from `frontend/`

If PostgreSQL or live backend smoke tests are unavailable, report the exact blocker.

## Expected Report

- Changed files
- Summary
- Endpoint behavior implemented
- UI resume behavior implemented
- Verification results
- Blocked checks
- Design questions for Codex
