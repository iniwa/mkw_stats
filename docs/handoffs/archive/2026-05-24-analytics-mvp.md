Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Implement a frontend-only Analytics MVP.

Replace the current `Analytics` placeholder with a compact analytics view derived from existing sessions, races, courses, and routes. The view should make recent play history easier to scan without adding backend endpoints.

## Background

Working slices already exist for:

- Playing
- Records
- Dashboard
- Settings
- Courses / Notes / Map Annotations

The `Analytics` nav item still falls through to the placeholder in `frontend/src/App.tsx`.

Relevant decision:

- `docs/decisions/2026-05-24-analytics-mvp-scope.md`

Existing API methods should be enough:

- `api.getSessions({ limit: 50 })`
- `api.getSessionRaces(sessionId, true)`
- `api.getCourses()`
- `api.getRoutes()`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-24-analytics-mvp-scope.md`
- `frontend/src/App.tsx`
- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/DashboardView.tsx`
- `frontend/src/App.css`

## Files To Edit

- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/AnalyticsView.tsx` new file
- `frontend/src/api.ts` only if a small type/helper adjustment is needed
- `README.md` only if you add or change user-facing usage instructions

Do not edit backend files for this slice unless you find a hard blocker and stop to ask Codex first.

## Required Data Window

Use a clear, explicit analytics window:

```text
Recent 50 sessions
```

Fetch:

1. `api.getSessions({ limit: 50 })`
2. `api.getCourses()`
3. `api.getRoutes()`
4. For each returned session, `api.getSessionRaces(session.id, true)`

Keep cancelled races in the raw dataset, but separate them from completed race totals.

If one session's race list fails to load, do not silently show incorrect totals. Either fail the whole analytics load with a visible error, or show a clear partial-load warning. Prefer failing the whole view for this MVP.

## Required UI Behavior

Create `AnalyticsView.tsx`.

It should:

- fetch analytics data on mount
- show a clear loading state
- show an inline error state with a retry button
- show the analytics window label: `Recent 50 sessions`
- show session totals:
  - total sessions
  - ranked sessions
  - Lounge sessions
  - active/completed/cancelled session counts
- show race totals:
  - total race records
  - completed races
  - draft races
  - cancelled races
  - ranked race records
  - Lounge race records
- show ranked summary:
  - completed ranked race count
  - total VR delta
  - average VR delta
  - best race delta
  - worst race delta
  - placement-band counts for `top`, `middle`, `bottom`
- show Lounge summary:
  - completed Lounge race count
  - warning flag counts, using `WARNING_LABELS` where available
  - show an empty state when no warnings exist
- show most-used targets:
  - combine course and route records into one list
  - resolve display names using the course and route lists
  - include completed and draft races, but exclude cancelled races
  - show at least top 8 targets by count
  - distinguish course vs route in the row
- show a concise empty state if there are no sessions in the window

Update `App.tsx`:

- import `AnalyticsView`
- render it when `active === 'Analytics'`
- keep Dashboard as the default view
- keep existing nav behavior and health check

## Calculation Rules

- `completed races` means `race.status === 'completed'`.
- `draft races` means `race.status === 'draft'`.
- `cancelled races` means `race.status === 'cancelled'`.
- Ranked VR calculations should only use ranked races with:
  - `status === 'completed'`
  - `rating_delta != null`
- Average VR delta should be displayed with one decimal place.
- Best/worst delta should show `-` when there are no ranked completed deltas.
- Placement-band counts should only count completed ranked races with `placement_band`.
- Lounge warning counts should inspect `warning_flags` on Lounge races. Count flags even if the race is cancelled, but visually label this as warning records rather than completed-race warnings.
- Most-used target counts should use:
  - `course_id` when present
  - `route_id` when present
  - skip rows with neither

## Styling Requirements

Use the existing visual language in `App.css`:

- flat panels
- compact metric blocks
- operational table/list layout
- no marketing hero
- no nested decorative cards
- no new color theme
- no external charting library
- no SVG chart framework
- mobile usable around 375px width

Simple CSS bars or proportional row fills are acceptable if they remain small and accessible. Plain lists/tables are also acceptable.

Suggested classes:

- `.analytics`
- `.analytics__grid`
- `.analytics__metric`
- `.analytics__section`
- `.analytics__list`
- `.analytics__row`
- `.analytics__bar`

These names are suggestions, not requirements.

## Constraints

- Frontend-only MVP.
- No backend endpoint additions.
- No DB schema changes.
- No new npm dependencies.
- No external network calls from the app.
- No data mutation from Analytics.
- Do not change deployment files.
- Do not change GHCR/GitHub Actions.
- Do not commit automatically.

## Non Goals

- All-time analytics.
- Exporting CSV/JSON.
- Advanced filters.
- Date range picker.
- Charts with external libraries.
- Lounge API sync.
- Character/vehicle analytics.
- Editing or deleting records.

## Verification

Run from `frontend/`:

```text
npm run typecheck
npm run build
```

If a backend is available locally or through the Pi deployment, also verify in the browser:

- `Analytics` nav opens the analytics view
- loading state resolves
- retry button appears when backend is unavailable
- session totals match `GET /play-sessions?limit=50`
- race totals match fetched session race lists
- ranked total/average/best/worst delta are plausible from the data
- warning counts display when warning flags exist
- most-used targets resolve course/route names
- empty state works with no sessions if you can safely simulate it
- no console errors
- 375px narrow viewport remains usable

If browser verification is blocked, explain exactly why and report the type/build checks.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Verification results
- Browser checks, if run
- Blocked checks and exact reason
- Design questions for Codex
