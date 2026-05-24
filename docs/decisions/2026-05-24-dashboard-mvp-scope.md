# 2026-05-24: Dashboard MVP scope

## Context

The app now has practical slices for Playing, Records, Settings, course/route
notes, and map annotations. The `Dashboard` nav item still points to a
placeholder, so the first screen does not summarize the user's current state or
offer quick entry into the main workflows.

The backend already exposes enough read APIs for a useful first dashboard:

- settings and VR accounts
- active sessions
- recent sessions
- courses, routes, notes, and map annotations

## Decision

Add a frontend-only Dashboard MVP that uses existing endpoints.

The dashboard should show:

- active VR account and current VR, when available
- active sessions, with source/status/start time
- recent sessions, newest first
- simple library counts for courses, routes, notes, and map annotations
- quick action buttons for Playing, Records, Courses, and Settings

Make `Dashboard` the default view after the app loads. The dashboard may offer
navigation buttons by passing a simple `onNavigate(viewName)` callback from
`App`.

## Reason

This makes the app feel coherent without expanding the backend or analytics
model. It also gives the user a useful landing screen while preserving the
existing Playing vertical slice.

## Constraints

- No database migrations.
- No new backend endpoints unless an existing frontend need cannot be met.
- Keep analytics out of scope; this is a status/entry dashboard, not charts or
trend analysis.
- Do not duplicate Records screen behavior beyond a compact recent-session
summary.
- Keep the UI dense and operational, matching the existing tool style.

## Do Not Change Casually

- Do not turn the dashboard into the analytics slice.
- Do not add write operations from Dashboard in this MVP.
- Do not remove direct access to Playing as a primary workflow.
