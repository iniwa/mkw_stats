Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Verify the app works correctly from the cleaned Pi database state.

This is a final MVP smoke test after record-only cleanup. Confirm empty states, core master data, and one minimal new-record flow.

## Background

Record-only cleanup has been applied on Pi:

- `play_sessions = 0`
- `race_records = 0`
- `rating_snapshots = 0`
- `course_notes = 0`
- `map_annotations = 0`
- master data preserved:
  - `courses = 30`
  - `routes = 203`
  - `map_points = 30`
  - `vr_accounts = 2`
  - `app_settings = 1`
- `vr_accounts.current_vr = initial_vr`
- backup exists:
  - `/home/iniwa/mkw_stats_pre_record_cleanup_20260526_035801.sql`

Now verify that the application behaves normally from this clean baseline.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/operations.md`
- `docs/handoffs/archive/2026-05-26-record-cleanup-pi-apply.md`
- `frontend/src/DashboardView.tsx`
- `frontend/src/RecordsView.tsx`
- `frontend/src/PlayingView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/SettingsView.tsx`

## Files To Edit

None.

Do not modify repository files in this handoff.

## Required Work

### 1. Confirm Clean Baseline

On Pi, confirm:

- containers are up:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- health OK:
  - `GET :8001/api/v1/health`
  - `GET :3030/api/v1/health`
- DB/API baseline:
  - `GET /api/v1/play-sessions?limit=1` returns `[]`
  - `GET /api/v1/play-sessions/active` returns `[]`
  - `GET /api/v1/courses` returns 30 active courses
  - `GET /api/v1/routes` returns 203 active routes
  - `GET /api/v1/map-points` returns 30 map points
  - `GET /api/v1/notes` returns `[]`
  - `GET /api/v1/map-annotations` returns `[]`
  - `GET /api/v1/vr-accounts` returns 2 accounts with `current_vr = initial_vr`

### 2. Empty-State GUI Smoke

Using the deployed frontend at `http://192.168.1.205:3030`, confirm:

- Dashboard:
  - loads without crash
  - sessions count/active sessions reflect empty state
  - library counts show 30 courses, 203 routes, 0 notes, 0 annotations
- Records:
  - shows no sessions empty state
  - date/source/status controls do not crash
- Analytics:
  - shows ranked empty state
  - no JavaScript/React errors
- Lounge:
  - shows Lounge empty state
  - MMR panel/trend area does not crash with no sessions
- Courses:
  - target selector works
  - selected course/route shows empty notes/annotations
- Settings:
  - VR accounts still render
  - Lounge settings still render
- Playing:
  - initial screen loads
  - course/map point data loads

### 3. Minimal New Ranked Flow

Create one minimal ranked session and complete one race through the UI.

Suggested flow:

1. Start a ranked/野良VR session.
2. Select a normal same-point course, e.g. DK Snow Mountain / `dk_pass`.
3. Confirm course.
4. Enter:
   - player count: 12
   - placement: any valid value
   - result VR: a small value near the account initial/current VR
5. Complete the race.
6. Finish the session.

Verify via API:

- `play_sessions = 1`
- `race_records = 1`
- the race status is `completed`
- `rating_delta = rating_after - rating_before`
- the selected account `current_vr` matches the completed race `rating_after`
- Records shows the new session/race
- Dashboard reflects the new recent session
- Analytics reflects the ranked race

### 4. Clean Up The Smoke Test Data

After the new-record flow is verified, clean it up so the Pi returns to the clean baseline.

Use the already reviewed `scripts/record_only_cleanup.sql` flow:

- apply it with effective `COMMIT` exactly as in the previous apply handoff, or
- use a temporary COMMIT copy outside the repo

Do not alter tracked repo files.

Verify after cleanup:

- `play_sessions = 0`
- `race_records = 0`
- `rating_snapshots = 0` unless no snapshot was created; report actual
- `course_notes = 0`
- `map_annotations = 0`
- `vr_accounts.current_vr = initial_vr`
- Dashboard/Records return to empty state

### 5. Responsive / Console

Check at 375px width:

- Dashboard has no horizontal overflow
- Playing result form has no horizontal overflow
- Records empty state has no horizontal overflow

Check browser console:

- no JavaScript/React errors
- network errors should be explained if any occur

## Constraints

- Do not modify repository files.
- Do not commit.
- Do not push.
- Do not redeploy unless the stack is broken and user approval is obtained.
- Keep created smoke-test data temporary; clean it up before reporting.
- Do not delete master data.
- Do not clear settings.
- Do not run unreviewed SQL.
- Do not expose secrets or raw DB dumps.

## Non Goals

- No Lounge 12-race full test.
- No MMR sync test unless it happens incidentally; avoid creating unnecessary Lounge data.
- No notes/annotation mutation unless needed to diagnose a bug.
- No source code changes.
- No deploy changes.

## Verification

Expected final state:

- cleaned record tables are back to zero
- courses/routes/map_points/vr_accounts/app_settings remain present
- VR account current values are reset to initial values
- GUI empty states work
- one ranked flow was proven and then cleaned up

## Expected Report

- Changed files: should be `None`
- Baseline API/DB counts
- Empty-state GUI results
- Ranked smoke flow details
- Post-ranked API/DB verification
- Cleanup result after smoke data removal
- 375px responsive checks
- Console/network errors
- Final residual data, if any
- Blocked checks
- Design questions for Codex
