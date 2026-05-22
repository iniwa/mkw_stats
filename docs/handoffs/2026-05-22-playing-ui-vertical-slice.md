Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Implement the first usable frontend Playing UI vertical slice for MKWorld Stats Manager.

The UI should let the user:

- see backend connection status
- start a ranked or Lounge play session
- select a course or route using existing map points
- resolve and confirm the selection through the backend API
- record ranked race results
- record Lounge races immediately
- see Lounge warnings
- undo the latest race
- finish the active session

This is not a polished final screen. It should be a practical LAN tool surface that exercises the backend core API.

## Background

Backend core API is implemented and tested. Relevant behavior:

- All endpoints are under `/api/v1`.
- Ranked sessions require a selected/provided/active VR account.
- Lounge records complete immediately when `POST /play-sessions/{id}/races/draft` is called.
- Ranked records are created as draft, then completed with `PATCH /race-records/{id}/complete-ranked`.
- `POST /course-selection/resolve` uses `map_points.course_id`.
- Lounge warnings are returned as `warnings` and persisted as `race.warning_flags`, but do not block recording.
- Lounge sessions auto-finish after race 12.

Relevant design docs:

- `mkworld_stats_manager_docs_v0_1/03_playing_ui.md`
- `mkworld_stats_manager_docs_v0_1/06_screen_design.md`
- `docs/decisions/2026-05-22-backend-core-api-behavior.md`
- `docs/decisions/2026-05-22-map-point-course-ownership.md`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `frontend/package.json`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `backend/app/schemas/__init__.py`
- `backend/app/api/*.py`
- `mkworld_stats_manager_docs_v0_1/03_playing_ui.md`
- `mkworld_stats_manager_docs_v0_1/06_screen_design.md`
- `docs/decisions/2026-05-22-backend-core-api-behavior.md`

## Files To Edit

Create or edit only:

- `frontend/src/**`
- `README.md` only if you add or change frontend usage notes

Do not edit:

- `backend/**`
- `deploy/**`
- `.github/workflows/**`
- `docker-compose.yml`
- `docs/handoffs/**`
- `docs/decisions/**`
- `mkworld_stats_manager_docs_v0_1/**`
- secrets, credentials, `.env`, or local settings

## Required UI Behavior

Use the existing React + TypeScript + Vite stack. Prefer no new dependency unless clearly justified.

### App Shell

- Preserve the existing backend health check.
- Keep top-level navigation, but make `Playing` the only feature-complete view in this slice.
- Other nav items may remain placeholders.
- Fix any visible mojibake in frontend source text while editing touched files.

### Data Loading

On app load or Playing view entry, fetch:

- `GET /api/v1/settings`
- `GET /api/v1/vr-accounts`
- `GET /api/v1/play-sessions/active`
- `GET /api/v1/map-points`
- `GET /api/v1/courses`
- `GET /api/v1/routes`

Show useful loading and error states. Do not leave the user with a blank panel.

### Session Start

If no active session is selected:

- Show mode selector for `ranked` and `lounge`.
- Ranked:
  - show active VR account name/current VR if available
  - start with `POST /api/v1/play-sessions { "source": "ranked" }`
- Lounge:
  - allow `player_count` 12 or 24
  - allow `format` selection from `FFA`, `2v2`, `3v3`, `4v4`, `6v6`
  - start with `POST /api/v1/play-sessions`

If active sessions exist, let the user choose one instead of forcing a new session.

### Course Selection

Until a real map image exists, implement a clear map-point based selector:

- choose `from_map_point_id`
- choose `to_map_point_id`
- provide a quick "same as start" action
- call `POST /api/v1/course-selection/resolve`
- show `display_name`, `confirm_message`, and whether it resolved to `course` or `route`
- allow cancel/reselect before recording

### Ranked Race Flow

For ranked sessions:

- After confirmed selection, call `POST /play-sessions/{session_id}/races/draft`.
- Show a result input form:
  - participant count: 12 or 24
  - placement band: top / middle / bottom
  - rating delta numeric input with plus/minus controls or buttons
  - current VR and projected VR when available
  - optional memo
- Complete via `PATCH /api/v1/race-records/{race_id}/complete-ranked`.
- After completion, show the saved race and reset to course selection for the next race.

### Lounge Race Flow

For Lounge sessions:

- After confirmed selection, call `POST /play-sessions/{session_id}/races/draft`.
- Show the recorded race number, selected course/route, and warnings.
- Warnings must be visually noticeable but must not block progress.
- Show race progress such as `Race 4 / 12`.
- When backend reports the session completed, show a finished state.

### Session Controls

- `Undo` calls `POST /api/v1/play-sessions/{session_id}/undo-last-race` and refreshes session-related state.
- `Finish session` calls `POST /api/v1/play-sessions/{session_id}/finish`.
- Show request errors inline.
- Disable buttons while their request is in flight to prevent duplicate submissions.

## UI Constraints

- Build the actual tool screen, not a marketing/landing page.
- Keep the visual style quiet, dense, and operational.
- Do not use nested cards.
- Avoid a one-hue-only palette; the current dark style can stay, but add restrained status/warning/accent colors.
- Ensure desktop and mobile layouts do not overlap.
- Keep controls stable in size so state changes do not shift the layout unexpectedly.

## Non Goals

- Do not implement backend changes.
- Do not implement course notes or map annotations yet.
- Do not implement a real course map image/canvas yet.
- Do not implement analytics, records list, settings management, Lounge sync, file upload, characters, vehicles, or item tables.
- Do not change Docker, GHCR, Portainer, or deployment behavior.
- Do not commit automatically.

## Verification

Run and report:

- `npm run typecheck` from `frontend/`
- `npm run build` from `frontend/`

If practical, run the frontend dev server and inspect the Playing view against the available backend. If no backend is available locally, report that clearly and rely on type/build checks.

## Expected Report

- Changed files
- Summary
- UI behavior implemented
- Verification results
- Blocked checks
- Design questions for Codex
