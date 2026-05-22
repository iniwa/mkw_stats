Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Improve Playing UI resume behavior for active ranked sessions that contain an
unfinished draft race.

## Background

The session race list API now exists:

```text
GET /api/v1/play-sessions/{session_id}/races
```

The current Playing UI fetches persisted races on resume and stores them in
`recordedRaces`. This fixes completed race history, but a ranked draft race can
also be returned by the endpoint. If the user reloads after selecting a course
but before entering the ranked result, the UI should restore the result input
form instead of showing the draft as completed history.

Design decision:

- `docs/decisions/2026-05-22-ranked-draft-resume.md`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `frontend/src/api.ts`
- `frontend/src/PlayingView.tsx`
- `docs/decisions/2026-05-22-ranked-draft-resume.md`

## Files To Edit

Create or edit only:

- `frontend/src/PlayingView.tsx`
- `frontend/src/api.ts` only if type helpers are needed

Do not edit:

- backend files
- database migrations or models
- deploy, Docker, GHCR, Portainer, or workflow files
- docs except this handoff's report is not required to edit docs
- secrets, credentials, `.env`, or local settings

## Required Behavior

When resuming an active session:

- Fetch the session's races using `api.getSessionRaces(session.id)`.
- If the session source is `ranked` and the latest non-cancelled race with
  `status === 'draft'` exists:
  - set that race as `draftRace`;
  - show the existing ranked result input phase;
  - do not include that draft in `recordedRaces`.
- Keep completed races in `recordedRaces`.
- Cancelled races should not appear because the existing API call excludes them
  by default.

For Lounge and ranked completed history:

- `recordedRaces` should contain completed non-cancelled races only.
- Lounge `Race N / 12`, course history, and warning icons should continue to
  reflect persisted completed records.

Warning display:

- Restore `lastWarnings` from the latest completed race that has
  `warning_flags`, if this can be done cleanly.
- Do not block the task if `lastWarnings` remains transient, but report that
  choice explicitly.

Error behavior:

- If fetching races during resume fails, keep the existing inline error behavior.
- Do not show an empty history as if it were authoritative after a failed fetch.

## Constraints

- Frontend-only change.
- Preserve existing create, record, undo, and finish behavior.
- Do not introduce new UI routes or broad record-management features.
- Do not alter API endpoint names or backend semantics.
- Do not commit automatically.

## Verification

Run and report:

- `npm run typecheck` from `frontend/`
- `npm run build` from `frontend/`

If a local backend is unavailable for browser smoke testing, report that blocker.

## Expected Report

- Changed files
- Summary
- Resume behavior implemented
- Verification results
- Blocked checks
- Design questions for Codex
