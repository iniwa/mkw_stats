# 2026-05-25: Session Date Filter Scope

## Context

Records, Analytics, and Lounge overview currently read recent sessions through
`GET /api/v1/play-sessions` with a fixed or near-fixed `limit`. This works for
the early MVP, but it becomes less useful once play history grows because older
sessions cannot be queried directly without increasing the limit.

The existing backend session list already supports `limit`, `status`, and
`source` filters. Adding a date range filter to the same endpoint keeps history
views simple without creating new analytics-specific APIs.

## Decision

Add optional started-at range filters to `GET /api/v1/play-sessions`:

- `started_from`: ISO datetime, inclusive lower bound
- `started_to`: ISO datetime, exclusive upper bound

Update the typed frontend client and the history-oriented views to pass those
filters when the user chooses a date range.

The first UI slice should apply the filter to:

- Records
- Analytics
- Lounge overview

Dashboard may remain unchanged because it intentionally summarizes the current
state and recent activity.

## Reason

This is a small backend change with high practical value. It avoids loading
unbounded history into the browser and makes later reporting slices easier to
build on the same API.

Using an exclusive upper bound makes whole-day UI filters easy: the frontend can
send local midnight for the start date and local midnight of the next day for
the end date.

## Constraints

- Keep ordering newest-first.
- Keep the default behavior unchanged when no date range is supplied.
- Keep `limit` validation at 1 to 200.
- Do not add new tables or migrations.
- Do not add analytics-specific backend endpoints in this slice.
- Do not change Dashboard behavior.

## Review Notes

- Tests should cover lower bound, upper bound, combined range, and interaction
  with existing `source` / `status` / `limit` filters.
- Frontend date controls should not cause horizontal overflow at 375px width.
