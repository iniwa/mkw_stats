Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
This is a verification-only handoff. Do not edit files unless Codex explicitly asks for a fix after this report.

## Goal

Verify the session date filter slice on the Raspberry Pi Portainer deployment.

Confirm that commit `c50d7fe` (`Add session date filters`) has reached GHCR, is running in Portainer, and that Records, Analytics, and Lounge date filters work against the Pi PostgreSQL data.

## Background

The date filter slice added optional `started_from` and `started_to` query parameters to:

```text
GET /api/v1/play-sessions
```

Expected semantics:

- `started_from`: ISO datetime, inclusive lower bound.
- `started_to`: ISO datetime, exclusive upper bound.
- Existing `limit`, `status`, and `source` filters still compose with date filters.
- Default behavior is unchanged when no date range is supplied.

Relevant files implemented in the previous slice:

- `backend/app/api/sessions.py`
- `backend/app/services/race_flow.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.css`

Relevant decisions:

- `docs/decisions/2026-05-25-session-date-filter-scope.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`

Deployment flow:

- Gitea `main` -> GitHub mirror -> GitHub Actions -> GHCR -> Portainer

Important deployment note:

- Portainer does not automatically recreate MKW containers after GHCR publishes `latest`.
- If the Pi is still running old images, redeploy through Portainer with image pull enabled.
- Do not use direct `docker compose up`.

Runtime details:

- Frontend image: `ghcr.io/iniwa/mkw-stats-frontend:latest`
- Backend image: `ghcr.io/iniwa/mkw-stats-backend:latest`
- Pi frontend URL: `http://<pi-host>:3030`
- Pi backend URL: `http://<pi-host>:8001`
- Container names: `mkw-frontend`, `mkw-backend`, `mkw-postgres`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-25-session-date-filter-scope.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`
- `backend/app/api/sessions.py`
- `frontend/src/RecordsView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `deploy/portainer-stack.yml`

## Files To Edit

None.

This handoff is verification-only.

## Verification Steps

### 1. GHCR / GitHub Actions

Verify that backend and frontend images containing commit `c50d7fe` are available.

Check, as available:

- GitHub Actions Docker Publish completed for commit `c50d7fe` or a later commit containing it.
- `ghcr.io/iniwa/mkw-stats-backend:latest` is pullable.
- `ghcr.io/iniwa/mkw-stats-frontend:latest` is pullable.
- `ghcr.io/iniwa/mkw-stats-backend:sha-c50d7fe` and `ghcr.io/iniwa/mkw-stats-frontend:sha-c50d7fe` exist if SHA tags are publicly checkable.

If GitHub or GHCR APIs require authentication, report that and use image pull / runtime behavior as the practical confirmation.

### 2. Portainer / Container State

Verify the Portainer stack is running images that include the date filter changes.

Expected containers:

- `mkw-postgres` Up
- `mkw-backend` Up, host `8001 -> 8000`
- `mkw-frontend` Up, host `3030 -> 80`

If the stack is still running old images, redeploy through Portainer with image pull enabled. Do not use direct `docker compose up`.

After redeploy:

- Confirm OpenAPI or runtime behavior includes `started_from` / `started_to` on `GET /api/v1/play-sessions`.
- Confirm the served frontend bundle contains date-filter UI, for example `date-filter__input` or visible date inputs in the browser.
- Hard reload the browser if it still serves an older hashed JS bundle.

### 3. Backend API Date Filter Checks

Use the Pi backend directly:

```text
http://<pi-host>:8001/api/v1
```

First collect baseline session data:

- `GET /play-sessions?limit=200`
- Record total count, newest/oldest `started_at`, and a compact per-day or per-date count if useful.

Then verify:

- Default newest-first behavior still works:
  - `GET /play-sessions?limit=5`
- Lower bound:
  - Pick a `started_from` that should exclude older sessions.
  - Verify returned sessions all have `started_at >= started_from`.
- Upper bound:
  - Pick a `started_to` that should exclude newer sessions.
  - Verify returned sessions all have `started_at < started_to`.
- Combined range:
  - Use both bounds and verify only sessions inside the range are returned.
- Composition with source:
  - `GET /play-sessions?source=lounge&started_from=...&started_to=...`
  - Verify only Lounge sessions are returned.
- Composition with status:
  - `GET /play-sessions?status=completed&started_from=...&started_to=...`
  - Verify only completed sessions are returned.
- Composition with limit:
  - Use a range containing more than two sessions, if available.
  - `limit=2` should return only two newest sessions within that filtered set.

If the existing Pi data does not contain enough dates to demonstrate a specific case, do not create data unless Codex asks first. Report which case could not be demonstrated and why.

### 4. Web GUI Records Check

Open:

```text
http://<pi-host>:3030
```

Verify in Records:

- Date controls are visible:
  - Start date
  - End date
  - Limit selector
  - Clear date button
- Default load still shows recent sessions.
- Existing source/status filters still work.
- Date range reduces or changes the session list when using a range that should do so.
- Selecting a filtered session still loads race details.
- Clearing the date range restores the unfiltered recent list.
- Browser console has no app errors.

### 5. Web GUI Analytics Check

Verify in Analytics:

- Date controls are visible.
- Default window label shows `Recent N sessions`.
- Selecting a date range changes the label to `Filtered sessions`.
- Aggregate session/race numbers match the backend sessions returned for that filtered window.
- Empty filtered range, if easy to choose, shows a clear empty state and does not blank the page.
- Clearing the date range restores the default aggregate.
- Browser console has no app errors.

### 6. Web GUI Lounge Check

Verify in Lounge:

- Date controls are visible.
- Default window label shows `Recent N Lounge sessions`.
- Selecting a date range changes the label to `Filtered sessions`.
- The filtered Lounge session list matches `GET /play-sessions?source=lounge&started_from=...&started_to=...`.
- Warning and most-used target aggregates update to reflect only the filtered sessions.
- Empty filtered range, if easy to choose, shows the Lounge empty state with controls still visible.
- Clearing the date range restores the default Lounge overview.
- Browser console has no app errors.

### 7. Responsive / Regression Spot Check

Verify around 375px width:

- Date controls wrap without horizontal page overflow.
- Records, Analytics, and Lounge remain usable.

Spot-check existing views:

- Dashboard
- Playing
- Records
- Analytics
- Courses
- Lounge
- Settings

They should still render without blank screens or console errors.

## Constraints

- Verification-only.
- Do not edit source files.
- Do not create migrations.
- Do not mutate production data unless Codex explicitly approves test data.
- Do not hard-delete existing data.
- Use Portainer deployment flow; do not run direct `docker compose up` on the Pi.
- Do not change Watchtower, Portainer stack structure, GHCR visibility, or registry credentials unless required to unblock pull failure and reported clearly.

## Non Goals

- Implementing fixes.
- Adding new filters beyond date/status/source/limit.
- Adding backend analytics endpoints.
- Creating test sessions.
- Changing deployment automation.
- Adding Watchtower automation.

## Expected Report

Report in Japanese:

- Changed files, if any. Expected: none.
- GHCR / GitHub Actions status.
- Portainer / container status.
- Backend API date filter verification results with counts and selected date ranges.
- Records UI verification results.
- Analytics UI verification results.
- Lounge UI verification results.
- Responsive and regression spot-check results.
- Blocked checks and exact reason.
- Residual test data, if any.
- Bugs found.
- Design questions for Codex.
