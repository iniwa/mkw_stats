# 2026-05-22: Records history scope

## Context

The Playing UI can create ranked and Lounge race records, and the Settings UI
can manage the account data needed to start sessions. The next usability gap is
reviewing recorded sessions after they are finished.

The backend currently exposes active sessions and races for a known session, but
there is no general session history endpoint. Without that endpoint, a Records
screen would need to know session IDs out of band.

## Decision

Add a small read-only history slice:

- `GET /api/v1/play-sessions` lists recent play sessions.
- The existing `GET /api/v1/play-sessions/{session_id}/races` remains the race
  detail source for a selected session.
- The frontend `Records` nav item opens a Records screen that lists recent
  sessions and shows the selected session's races.

The slice is read-only. Editing, deleting, exporting, advanced filters, charts,
and analytics stay out of scope.

## Reason

This creates a practical end-to-end review workflow without expanding the data
model or committing to analytics design too early.

## Constraints

- Do not add database migrations or new tables.
- Keep session listing pagination simple: `limit`, optional `status`, and
  optional `source` are enough for the first Records screen.
- Race rows should resolve course and route names using the existing course and
  route list endpoints rather than adding nested response objects.
- Cancelled races may be visible in Records via `include_cancelled=true`, but
  they should be visually distinct and not counted as normal completed races.

## Do Not Change Casually

- Do not turn this into the analytics/dashboard slice.
- Do not add write operations to Records until the read-only workflow is proven.
