# 2026-05-24: Lounge overview MVP scope

## Context

The Playing UI can record Lounge sessions and warnings, Records can inspect
individual sessions, and Analytics can summarize recent mixed ranked/Lounge
history. The `Lounge` nav item is still a placeholder.

Full Lounge API sync remains out of scope for the MVP. The useful next step is
a read-only Lounge-focused view over data the app already records manually.

## Decision

Add a frontend-only Lounge overview MVP using existing endpoints.

The first Lounge screen should show:

- active Lounge sessions and their 12-race progress
- recent Lounge sessions with status, format, player count, and race counts
- warning records for recent Lounge races, using existing warning labels
- most-used Lounge course/route targets in the recent window

Use existing APIs only:

- `GET /api/v1/play-sessions?source=lounge&limit=50`
- `GET /api/v1/play-sessions/{session_id}/races?include_cancelled=true`
- `GET /api/v1/courses`
- `GET /api/v1/routes`

## Reason

This replaces the last major placeholder with a practical view while preserving
the current manual Lounge recording model. It also avoids designing external
Lounge API sync before the local workflow is stable.

## Constraints

- Frontend-only.
- No database migrations.
- No new backend endpoints.
- No external Lounge API calls.
- No data mutation from the Lounge overview.
- Keep the window explicit: recent 50 Lounge sessions, not all-time.
- Keep warnings advisory and informational.

## Do Not Change Casually

- Do not turn this view into Lounge API synchronization.
- Do not mix Lounge MMR semantics into ranked VR fields.
- Do not add editing or cleanup operations from this overview.
