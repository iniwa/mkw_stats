# 2026-05-24: Analytics MVP scope

## Context

The app has enough persisted play data to show useful lightweight analytics:

- recent play sessions
- race records per session
- ranked VR deltas
- Lounge warning flags
- course and route master data

The `Analytics` nav item still points to a placeholder. A first analytics slice
should make the existing recorded data easier to scan without committing to a
larger reporting model too early.

## Decision

Add a frontend-only Analytics MVP based on existing endpoints.

Use `GET /api/v1/play-sessions?limit=50` as the analytics window, then fetch
race records for those sessions with `include_cancelled=true`.

The first analytics screen should show:

- session counts by source and status
- race counts by source and status
- ranked summary: completed races, total VR delta, average delta, best and
  worst race delta, placement-band counts
- Lounge summary: completed races and warning flag counts
- most-used course/route targets in the analytics window

## Reason

This gives the user immediate value from the existing data while avoiding a
premature backend reporting API. The data volume is currently small and LAN-only,
so fetching recent session race lists from the frontend is acceptable for the
MVP.

## Constraints

- No database migrations.
- No new backend endpoints for this MVP.
- Keep the analytics window explicit: recent 50 sessions, not all-time.
- Do not add charting libraries.
- Keep the UI operational and table/list oriented.
- Treat cancelled races as visible but separate from completed race counts.

## Do Not Change Casually

- Do not present the Analytics MVP as all-time analytics unless the backend
  later provides an all-time aggregate endpoint.
- Do not mix ranked VR and Lounge MMR semantics.
- Do not add data mutation from Analytics.
