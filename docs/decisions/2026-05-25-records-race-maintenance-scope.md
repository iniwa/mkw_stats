# 2026-05-25: Records Race Maintenance Scope

## Context

Records already lists sessions and their races, including cancelled races. The backend already exposes race maintenance endpoints:

- `PATCH /api/v1/race-records/{race_id}`
- `POST /api/v1/race-records/{race_id}/cancel`

The UI does not yet expose these actions, so correcting a memo or cancelling a mistaken record requires direct API calls or using Playing undo only for the latest active session.

## Decision

Add a small Records-only maintenance slice:

- edit race memo inline
- cancel a non-cancelled race from Records after confirmation
- refresh the selected session's race list after mutation

Keep the scope narrow and avoid broader historical editing.

## Reason

This provides a practical way to clean up mistaken records and verification artifacts without adding destructive session deletion or database-level tooling.

Records is the right location because it already displays historical sessions, cancelled records, memo text, and route details.

## Constraints

- Use existing backend endpoints; do not add migrations or new models.
- Frontend should add only the API client methods needed for existing endpoints.
- Do not add hard delete for sessions or races.
- Do not allow editing rating deltas, VR before/after, course/route target, race number, source, or status in this slice.
- Cancel should be explicit and should not be shown as a hard delete.
- Cancelled race rows remain visible because Records fetches with `include_cancelled=true`.

## Review Warnings

- Cancelling a completed ranked race may trigger backend VR rollback only when the race is the latest VR effect. The UI should surface this as "取消" rather than pretending it is a simple visual hide.
- Do not introduce bulk cleanup actions yet.
- Do not make this a general admin console.
