# Session Race List API

## Context

The Playing UI can start sessions and record races, but active-session resume
cannot restore the already-recorded course history because the backend has no
endpoint for listing races in a session.

Without a race list, the UI must keep race history in client memory only. That
breaks after reload, browser restart, or selecting an already-active session.

## Decision

Add a session-scoped race listing endpoint:

```text
GET /api/v1/play-sessions/{session_id}/races
```

The endpoint should return race records ordered by `race_no` and creation time.
By default it should return non-cancelled races. It may support an
`include_cancelled=true` query parameter for troubleshooting and future record
views.

The Playing UI should use this endpoint when selecting or refreshing a session,
so Lounge progress, warning flags, and ranked history can be restored.

## Reason

Race history belongs to the database, not transient UI state. A session-scoped
list is the smallest API needed to make active-session resume reliable without
building the broader records/analytics surface yet.

## Constraints

- Do not build full records search or analytics in this step.
- Keep warning flags advisory and read-only in this endpoint.
- Preserve the current session/race mutation endpoints.

## Do Not Change Casually

- Do not make the Playing UI infer persisted history from `race_no` alone once
  this endpoint exists.
