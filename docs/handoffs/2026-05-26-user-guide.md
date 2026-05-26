Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Create a concise daily-use guide for MKWorld Stats Manager.

The app is now usable from a clean Pi database baseline. Add a user-facing guide that explains how to use the main Web GUI flows without requiring the reader to understand implementation history or handoff reports.

## Background

The MVP foundations are implemented and verified:

- Pi deployment works through Portainer and GHCR.
- The record-only cleanup was applied and the empty-database E2E smoke passed.
- Master data is present:
  - 30 courses
  - 203 routes
  - 30 map points
  - 2 VR accounts
- Playing supports:
  - ranked sessions
  - Lounge sessions
  - target selection through map/text picker
  - notes/annotations assist
  - ranked result VR input
  - Lounge placement/score input
  - Lounge MMR auto-sync when enabled
- Records supports:
  - review
  - correction
  - cancel
  - hide/restore
- Courses supports target-scoped notes and annotations.
- Lounge supports MMR sync and trend display.
- Operations/deployment details already live in `docs/design/operations.md`.

This handoff is for documentation only.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/README.md`
- `docs/design/README.md`
- `docs/design/operations.md`
- `docs/design/ui-redesign-roadmap.md`
- `frontend/src/App.tsx`
- `frontend/src/PlayingView.tsx`
- `frontend/src/RecordsView.tsx`
- `frontend/src/DashboardView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/SettingsView.tsx`

## Files To Edit

- `docs/design/user-guide.md` (new)
- `docs/design/README.md`
- `README.md`

Do not edit source code in this handoff.

## Required Content

Create `docs/design/user-guide.md` as a practical daily-use guide in Japanese.

Keep it concise but complete enough that the app can be operated without reading handoff history.

Include these sections:

1. Overview
   - What the tool is for.
   - Pi URL: `http://192.168.1.205:3030`
   - Mention LAN-only current operation.

2. First Checks
   - Confirm backend status in Dashboard.
   - Confirm Settings has the intended VR account and Lounge player settings.

3. Ranked Recording
   - Start a ranked/野良VR session.
   - Select target course/route.
   - Review assist information.
   - Enter player count, placement, and resulting VR.
   - Explain that VR delta is calculated automatically.
   - Finish the session.

4. Lounge Recording
   - Start a Lounge session.
   - Choose player count/format as applicable.
   - Record each race target.
   - Enter placement and score per race.
   - Explain repick warnings: warnings do not block saving.
   - Explain 12-race auto-finish and manual finish.
   - Explain MMR auto-sync behavior at session completion.

5. Records Corrections
   - Use Records to fix mistyped fields.
   - Difference between cancel and hide:
     - cancel = race happened but was cancelled
     - hide = mistaken record should not appear in default history/analytics
   - Hidden records can be shown and restored.
   - Editing historical ranked `rating_after` does not update account `current_vr`; current VR should be corrected via account/settings workflow if needed.

6. Courses / Notes / Annotations
   - Select a course or route first.
   - Notes and annotations are scoped to that target.
   - Visual annotation surface behavior:
     - click to place
     - drag existing marker while editing
     - image-backed when local route/map assets exist
     - fallback panel when assets are missing

7. Analytics / Lounge Views
   - Dashboard for quick overview.
   - Analytics is ranked/VR-focused.
   - Lounge is Lounge/MMR-focused.
   - Hidden/cancelled records are excluded from normal metrics where appropriate.

8. Data Reset And Backup
   - Link to `docs/design/operations.md`.
   - Do not duplicate the SQL details; just state that record-only cleanup exists and should be used deliberately after backup.

9. Troubleshooting
   - Hard reload after frontend redeploy if UI looks stale.
   - If MMR sync says no matching Lounge session, the MKCentral change timestamp did not match a completed Lounge session window.
   - If Portainer redeploy binds wrong ports, confirm stack env values from `operations.md`.

## README Updates

Update:

- `docs/design/README.md`
  - Add `user-guide.md` to recommended files.

- Root `README.md`
  - Add a short link to `docs/design/user-guide.md` near the top-level docs/deployment references.

## Constraints

- Documentation-only change.
- Do not edit frontend or backend source files.
- Do not change deployment behavior.
- Do not create new handoffs.
- Do not archive this handoff.
- Keep the guide as current behavior, not future wishlist.
- Avoid exposing secrets.
- Use UTF-8 Japanese text.
- Keep wording practical and direct.

## Non Goals

- No code changes.
- No UI redesign.
- No API changes.
- No screenshots.
- No deployment or Pi verification.
- No exhaustive historical changelog.

## Verification

Run:

- `git diff --check`
- Search for obvious mojibake/replacement characters in edited docs:
  - the Unicode replacement character
  - common mojibake fragments that appear when UTF-8 Japanese is decoded with the wrong code page

Optional but useful:

- Confirm markdown links point to existing files.

## Expected Report

- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
