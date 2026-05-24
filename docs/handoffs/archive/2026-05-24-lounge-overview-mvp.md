Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Implement a frontend-only Lounge overview MVP.

Replace the current `Lounge` placeholder with a read-only view focused on manually recorded Lounge sessions, race progress, warnings, and frequently used course/route targets.

## Background

Existing slices already support:

- Lounge session creation and race recording in `Playing`
- Lounge warning persistence (`repick`, `route_banned_12p`)
- session/race review in `Records`
- mixed ranked/Lounge aggregate summaries in `Analytics`

The `Lounge` nav item still falls through to the placeholder in `frontend/src/App.tsx`.

Relevant decision:

- `docs/decisions/2026-05-24-lounge-overview-mvp-scope.md`

Use existing API methods only:

- `api.getSessions({ source: 'lounge', limit: 50 })`
- `api.getSessionRaces(session.id, true)`
- `api.getCourses()`
- `api.getRoutes()`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-24-lounge-overview-mvp-scope.md`
- `frontend/src/App.tsx`
- `frontend/src/api.ts`
- `frontend/src/PlayingView.tsx`
- `frontend/src/RecordsView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/App.css`

## Files To Edit

- `frontend/src/LoungeView.tsx` new file
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/api.ts` only if a small type/helper adjustment is truly needed

Do not edit backend files for this slice unless you find a hard blocker and stop to ask Codex first.

## Required Data Window

Use a clear, explicit window:

```text
Recent 50 Lounge sessions
```

Fetch:

1. `api.getSessions({ source: 'lounge', limit: 50 })`
2. `api.getCourses()`
3. `api.getRoutes()`
4. For each returned Lounge session, `api.getSessionRaces(session.id, true)`

If one session's race list fails to load, do not silently show incorrect totals. Prefer failing the whole view with a visible error and retry button.

## Required UI Behavior

Create `LoungeView.tsx`.

It should:

- fetch Lounge data on mount
- show a clear loading state
- show an inline error state with a retry button
- show the window label: `Recent 50 Lounge sessions`
- show a concise empty state if no Lounge sessions exist
- show active Lounge sessions separately
- show recent Lounge sessions
- show recent warning records
- show most-used Lounge targets

### Active Lounge Sessions

For each active Lounge session, show:

- started time
- `player_count` and `format`
- race progress as `completed non-cancelled races / 12`
- total race records
- cancelled race count
- warning count
- latest recorded course/route name, if present

The view is read-only. Do not add finish, undo, or record buttons here.

### Recent Lounge Sessions

Show at least the newest 10 Lounge sessions from the recent window.

For each session, show:

- status
- started time
- completed time when present
- `player_count` and `format`
- completed race count
- cancelled race count
- warning count
- short race target preview, such as the first few course/route names

Use compact list rows or flat panels. Avoid nested decorative cards.

### Warning Records

Aggregate warning flags from Lounge races in the window.

Show:

- total warning records by flag, using `WARNING_LABELS`
- a recent warning list, newest session first and race order within session
- session started time
- race number
- course/route name
- warning labels

If there are no warnings, show a clear empty state.

Count warnings even if the race is cancelled, but label this section as warning records rather than completed-race warnings.

### Most-Used Lounge Targets

Aggregate Lounge course/route targets from races in the window.

Rules:

- include completed and draft races
- exclude cancelled races
- use `course_id` when present
- otherwise use `route_id` when present
- skip rows with neither
- resolve names using `courses` and `routes`
- show at least top 8 targets
- distinguish course vs route in each row

## App.tsx Update

Update `App.tsx`:

- import `LoungeView`
- render it when `active === 'Lounge'`
- keep Dashboard as the default view
- keep existing nav behavior and health check

## Styling Requirements

Use the existing visual language in `App.css`:

- flat panels
- compact metric blocks
- operational list layout
- no marketing hero
- no nested decorative cards
- no new color theme
- no external charting library
- mobile usable around 375px width

Suggested classes:

- `.lounge`
- `.lounge__header`
- `.lounge__window`
- `.lounge__grid`
- `.lounge__metric`
- `.lounge__section`
- `.lounge__list`
- `.lounge__row`
- `.lounge__progress`

These names are suggestions, not requirements.

## Constraints

- Frontend-only MVP.
- No backend endpoint additions.
- No DB schema changes.
- No new npm dependencies.
- No external network calls from the app.
- No data mutation from Lounge overview.
- Do not implement Lounge API sync.
- Do not change deployment files.
- Do not change GHCR/GitHub Actions.
- Do not commit automatically.

## Non Goals

- Lounge API sync.
- MMR import or external table/player fetch.
- Editing sessions or races.
- Finishing/undoing sessions from this view.
- Advanced filters.
- All-time analytics.
- CSV/JSON export.
- Character/vehicle analytics.

## Verification

Run from `frontend/`:

```text
npm run typecheck
npm run build
```

If a backend is available locally or through the Pi deployment, also verify in the browser:

- `Lounge` nav opens the Lounge view
- loading state resolves
- retry button appears when backend is unavailable
- active Lounge sessions, if present, show progress correctly
- recent Lounge sessions show race/cancel/warning counts
- warning records use `WARNING_LABELS`
- most-used targets resolve course/route names
- cancelled races are excluded from target counts
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
