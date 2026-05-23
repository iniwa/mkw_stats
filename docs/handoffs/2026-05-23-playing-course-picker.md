Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Improve the Playing view course selection UI so 30 courses are quick and reliable to choose during play.

The current UI uses two plain `<select>` controls. Replace that with a compact searchable picker for start and destination map points while keeping the backend resolve flow unchanged.

## Background

The route master seed is now deployed and verified on Pi:

- 30 courses
- 30 map points
- 203 routes

The current `CourseSelector` in `frontend/src/PlayingView.tsx` works, but with 30 courses it is slower than necessary during actual play.

Relevant decisions:

- `docs/decisions/2026-05-23-playing-course-picker-scope.md`
- `docs/decisions/2026-05-23-same-point-course-selection.md`
- `docs/decisions/2026-05-22-route-master-seed-strategy.md`

Important behavior to preserve:

- Same start/destination means normal course and should resolve as `kind=course`.
- Different start/destination should resolve through backend route lookup.
- Frontend must continue calling `api.resolveSelection(fromId, toId)` and must not duplicate route matching logic.

## Files To Inspect

- `frontend/src/PlayingView.tsx`
- `frontend/src/App.css`
- `frontend/src/api.ts`
- `docs/decisions/2026-05-23-same-point-course-selection.md`
- `docs/decisions/2026-05-23-playing-course-picker-scope.md`

## Files To Edit

- `frontend/src/PlayingView.tsx`
- `frontend/src/App.css`

Do not edit backend files for this slice.

## Constraints

- Keep this frontend-only.
- Do not add npm dependencies.
- Do not change API types or endpoint calls unless unavoidable.
- Do not change session/race flow behavior.
- Do not change same-point behavior.
- Do not create map image or coordinate UI.
- Do not create a route detail page.
- Do not alter Records or Settings views except if a shared CSS class would otherwise break them.
- Keep layout dense, stable, and usable on desktop and mobile.
- Do not use oversized hero-style elements, nested cards, or decorative backgrounds.
- Text must not overflow buttons or picker rows.

## Required UI Behavior

Replace the two plain `<select>` controls inside `CourseSelector` with a searchable map-point picker:

- Start picker and destination picker each have:
  - search input
  - filtered candidate list
  - selected value display
  - clear button or equivalent way to reset selection
- Filtering should match:
  - Japanese label (`label_ja`)
  - English label (`label_en`)
  - map point id
  - related course id if available
- Filtering should be case-insensitive for ASCII.
- If the query is empty, show all active map points in current API order.
- If there are no matches, show a compact empty state.
- Candidate rows should be buttons, not plain text.
- Selected row should be visually distinct.
- Candidate list height should be bounded and scrollable so the page does not grow unpredictably.
- Keep the existing "到着を出発と同じにする" action.
- Add a quick swap action:
  - swaps start and destination
  - disabled unless both are selected
- Add a compact summary line such as:
  - start selected name
  - destination selected name
  - expected kind hint: same point = 通常コース, different = 道中コース
- The "コースを確認" button remains disabled unless both start and destination are selected.
- While resolving, avoid double submit and keep existing busy behavior.

## Suggested Component Shape

Keep everything local to `PlayingView.tsx` unless a tiny helper type/function makes it clearer.

Possible structure:

- `CourseSelector`
- `MapPointPicker`
- helper functions:
  - `mapPointLabel(mp)`
  - `matchesMapPoint(mp, query)`

Use stable IDs for input labels. Avoid brittle random IDs.

## Accessibility / Usability

- Inputs need visible labels.
- Candidate buttons need meaningful text.
- The selected state should not rely only on color; include a small label like `選択中`.
- Keyboard users should be able to tab into the search input and candidate buttons.
- Use existing `.btn`, `.input`, `.field`, `.tag`, `.hint`, `.panel__title` styling where appropriate.

## Verification

Run:

```bash
cd frontend
npm run typecheck
npm run build
```

If possible, run the frontend locally and verify the error-free render. If a live backend is unavailable locally, that is acceptable; report it clearly.

Recommended browser checks when a backend is available:

- Playing view loads with 30 courses.
- Search Japanese text, for example `ピーチ`, filters to matching rows.
- Search English text, for example `rainbow`, filters to Rainbow Road.
- Search id fragment, for example `dk`, finds DK-related point(s).
- Select Peach Stadium -> Rainbow Road and confirm backend resolve still works.
- Select DK Snow Mountain -> same destination via the same-point button and confirm it resolves as 通常コース.
- Swap selected start/destination and confirm summary updates.
- No console errors.
- Layout fits desktop and mobile widths without overlapping text.

## Non Goals

- No backend changes.
- No DB changes.
- No route metadata display from `tags`.
- No map image.
- No actual route geometry.
- No Lounge 12-player banned-route classification.
- No persistent "recently used" storage in localStorage or backend.

## Expected Report

Report in Japanese:

- Changed files
- Summary of UI behavior
- Verification results
- Browser checks performed or blocked
- Any blocked checks and why
- Design questions for Codex

