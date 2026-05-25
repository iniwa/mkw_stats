Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Do a small frontend polish pass before daily use.

Focus on removing avoidable browser noise and catching obvious display text problems without changing product behavior.

## Background

Recent Pi verification repeatedly showed the app itself working, with `favicon.ico 404` being the only recurring browser console/network noise. The current `frontend/index.html` has no favicon link, and `frontend/public/` has no favicon asset.

Several UI slices have been implemented quickly. Before adding another larger feature, do a conservative polish pass:

- add a local favicon
- verify obvious UI text is readable Japanese/English
- keep layout and API behavior unchanged

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `frontend/index.html`
- `frontend/src/App.tsx`
- `frontend/src/DashboardView.tsx`
- `frontend/src/PlayingView.tsx`
- `frontend/src/RecordsView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/SettingsView.tsx`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/TargetAssist.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`

## Files To Edit

- `frontend/index.html`
- `frontend/public/favicon.svg` (new)
- Frontend source files only if an obvious display-text typo or mojibake is found.
- `docs/design/ui-redesign-roadmap.md`

Do not edit backend files.

## Required Behavior

### Favicon

Add a small local favicon:

- Create `frontend/public/favicon.svg`.
- Link it from `frontend/index.html` using:
  - `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`
- Keep the SVG simple and repo-native. Do not use copyrighted Mario assets.
- Suggested visual: compact `MKW` mark or simple abstract dashboard/track mark.
- It should render at small tab size and not depend on external assets.

### Text Audit

Check frontend display strings for obvious mojibake or broken Japanese.

Run this replacement-character search:

```powershell
rg -n "\x{FFFD}|\\uFFFD" frontend\src
```

Also manually scan obvious UI display strings in the inspected files for mojibake-looking text. If shell encoding makes non-ASCII regex searches unreliable, rely on browser-rendered UI and source review instead of expanding scope.

If bad user-facing strings are found:

- Correct them to readable Japanese or concise English.
- Keep wording concise.
- Do not rewrite the whole UI copy.

If matches are false positives or none are found, report that.

### Console / Layout

After adding the favicon, browser verification should no longer show favicon 404.

Keep all existing views loading:

- Dashboard
- Playing
- Records
- Analytics
- Courses
- Lounge
- Settings

## Constraints

- Frontend-only.
- No new npm dependencies.
- No backend/API/schema/migration changes.
- No Docker, GHCR, GitHub Actions, or Portainer changes.
- Do not change routing or app behavior.
- Do not add screenshots to the repo.
- Do not use copyrighted game art for the favicon.
- Keep this small. If you find broad wording/design issues, report them instead of expanding scope.

## Non Goals

- No visual redesign.
- No new feature panels.
- No data cleanup.
- No map/image asset work.
- No PWA manifest.
- No deployment verification in this implementation handoff.

## Verification

Run from repo root:

```powershell
cd frontend
npm run typecheck
npm run build
```

Browser/manual verification:

- App loads.
- Browser requests `/favicon.svg` successfully.
- No `favicon.ico 404` remains.
- Browser console has no JavaScript/React errors.
- All views listed above load.
- 375px width has no horizontal overflow on at least Dashboard, Playing, Records, Lounge, and Settings.

If local backend is unavailable, use build/typecheck and verify the app shell/error states. Report blocked live-data checks clearly.

## Expected Report

- Changed files
- Summary
- Text audit result
- Verification results
- Blocked checks
- Screenshots/temp files created and removed, if any
- Design questions for Codex
