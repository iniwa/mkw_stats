Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Implement a frontend-only Dashboard MVP.

The Dashboard should replace the current placeholder and become the app's default view. It should summarize the current usable state of the tool and provide quick navigation into Playing, Records, Courses, and Settings.

## Background

The project already has working slices for:

- `PlayingView`
- `RecordsView`
- `SettingsView`
- `NotesView` under the `Courses` nav item
- notes and map annotations APIs

The `Dashboard` nav item currently falls through to placeholder text in `frontend/src/App.tsx`.

Relevant decision:

- `docs/decisions/2026-05-24-dashboard-mvp-scope.md`

Existing frontend API methods should be enough:

- `api.getSettings()`
- `api.getVrAccounts()`
- `api.getActiveSessions()`
- `api.getSessions({ limit })`
- `api.getCourses()`
- `api.getRoutes()`
- `api.getNotes()`
- `api.getMapAnnotations()`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-24-dashboard-mvp-scope.md`
- `frontend/src/App.tsx`
- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/PlayingView.tsx`
- `frontend/src/SettingsView.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/App.css`

## Files To Edit

- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/api.ts` only if a small type/helper adjustment is needed
- `frontend/src/DashboardView.tsx` new file
- `README.md` only if you add or change user-facing usage instructions

Do not edit backend files for this slice unless you find a hard blocker and stop to ask Codex first.

## Required UI Behavior

Create `DashboardView.tsx`.

It should:

- fetch dashboard data on mount
- show a clear loading state
- show an inline error state with a retry button
- avoid blank panels if one request fails; either show the error for the dashboard or use a small helper to keep failure visible
- show the active VR account, using the active account from `getVrAccounts()`
- show current VR for that account
- show active sessions from `getActiveSessions()`
- show recent sessions from `getSessions({ limit: 5 })`, newest first
- show compact counts:
  - active courses
  - active routes
  - active notes
  - map annotations
- show quick action buttons:
  - `Playing`
  - `Records`
  - `Courses`
  - `Settings`

Wire quick action buttons through `App.tsx` by passing an `onNavigate` callback to `DashboardView`.

Update `App.tsx`:

- import `DashboardView`
- set initial `active` state to `Dashboard`
- render `DashboardView` when `active === 'Dashboard'`
- keep existing nav behavior and health check
- leave `Analytics` and `Lounge` as placeholders for now

Dashboard display rules:

- Active sessions should show source, status, start time, and a concise title such as `Ranked` or `Lounge 12 FFA`.
- Recent sessions should show source, status, start time, and completed time when present.
- Empty active sessions should display a useful empty state, not an error.
- Counts should be readable at a glance.
- Use existing API types where possible.

## Styling Requirements

Use the existing visual language in `App.css`:

- flat panels, no nested decorative cards
- operational dashboard layout, not a marketing hero
- text must fit at desktop and mobile widths
- buttons should use existing `.btn` patterns when possible
- do not introduce a new color theme
- keep mobile layout usable around 375px width

Suggested classes:

- `.dashboard`
- `.dashboard__grid`
- `.dashboard__panel`
- `.dashboard__metric`
- `.dashboard__actions`
- `.dashboard__session-list`
- `.dashboard__session-item`

These names are suggestions, not requirements, as long as the resulting CSS is clear and local to the dashboard.

## Constraints

- Frontend-only MVP.
- No backend endpoint additions.
- No DB schema changes.
- No new npm dependencies.
- No external network calls from the app.
- No charts, analytics calculations, exports, or advanced filters.
- Do not change deployment files.
- Do not change GHCR/GitHub Actions.
- Do not commit automatically.

## Non Goals

- Analytics view implementation.
- Lounge API sync.
- Editing sessions/races from Dashboard.
- Creating sessions directly from Dashboard.
- Adding charts or trend lines.
- Adding authentication or external exposure.

## Verification

Run from `frontend/`:

```text
npm run typecheck
npm run build
```

If a backend is available locally or through the Pi deployment, also verify in the browser:

- app opens to Dashboard by default
- quick action buttons switch to the expected existing views
- active session empty state displays correctly
- recent sessions display when present
- counts display for courses/routes/notes/annotations
- backend unavailable state is visible and recoverable with retry
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
