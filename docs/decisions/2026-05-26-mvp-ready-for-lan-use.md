# 2026-05-26: MVP ready for personal LAN use

## Context

The first usable MKWorld Stats Manager MVP has been implemented and verified on the Raspberry Pi deployment.

The final release-readiness verification reported:

- backend, frontend, and PostgreSQL containers are running through the Portainer-managed stack
- backend is bound to host port `8001`
- frontend is bound to host port `3030`
- Alembic is at `005 (head)`
- the database is at the clean record baseline:
  - `play_sessions = 0`
  - `race_records = 0`
  - `rating_snapshots = 0`
  - `course_notes = 0`
  - `map_annotations = 0`
- master/config data remains present:
  - 30 courses
  - 203 routes
  - 30 map points
  - 2 VR accounts
  - 1 app settings row
- VR account `current_vr` values match `initial_vr`
- all main GUI views load without JavaScript/React errors
- 375px smoke checks found no blocking horizontal overflow
- `favicon.ico` 404 browser noise is resolved

The final release decision was: `MVP ready for personal LAN use`.

## Decision

Treat the current application as MVP-ready for normal personal LAN use.

Future work should be planned as post-MVP improvement unless it fixes a regression, data-loss risk, deployment risk, or daily-use blocker.

## Reason

The app now supports the core vertical slice:

- ranked session recording with resulting-VR input and automatic delta calculation
- Lounge race recording with placement/score input
- Lounge MMR sync and trend display
- course/route target selection and assist information
- target-scoped notes and annotations
- Records review/correction/cancel/hide/restore
- Dashboard, VR Analytics, Lounge overview, Courses, Settings
- documented operations, cleanup, and daily-use guidance

The clean-baseline E2E smoke confirmed that the app can start from an empty record history, create a ranked record, reflect it in UI/API/analytics, and return to the clean baseline.

## Constraints Introduced

- Do not treat broad redesign work as pre-MVP blocking work unless the user explicitly reclassifies it.
- Keep future changes scoped and reversible where possible.
- Preserve the clean-baseline reset path in `scripts/record_only_cleanup.sql`.
- Preserve the Portainer-managed deployment model and env preservation guidance in `docs/design/operations.md`.
- If future work creates test records on Pi, clean them up or explicitly report residual data.

## Do Not Change Casually

- Do not reopen the MVP completion decision because optional improvements remain.
- Do not replace the current manual Portainer redeploy flow without a separate deployment decision.
- Do not remove the daily-use and operations docs as "temporary" now that the app is in personal-use mode.
- Do not make destructive database cleanup the default behavior; it remains an explicit, backed-up operation.
