Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add world-map target selection to the Courses view so course notes and annotations can be opened by clicking the map, not only by using the course/route select boxes.

This addresses the remaining `issues.md` item:

- `Courses`
  - `ワールドマップからコースを選び、ノートを出せるようにしてほしい`

Do not mark the issue complete unless implementation and verification pass.

## Background

Current behavior:

- `frontend/src/NotesView.tsx` has a segmented target type (`course` / `route`) and a select box.
- Course notes and annotations are scoped by `selectedTargetType` and `selectedTargetId`.
- `frontend/src/WorldMapPicker.tsx` already exists and is used in Playing.
- `WorldMapPicker` supports:
  - selecting from/to map points
  - map-point calibration
  - icon/text marker fallback
  - `onMapPointUpdated`
- `api.resolveSelection(fromMapPointId, toMapPointId)` returns:
  - `kind: 'course' | 'route'`
  - `course` / `route`
  - display metadata

The Courses view should reuse existing map selection logic rather than adding a new map component.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `issues.md`
- `frontend/src/NotesView.tsx`
- `frontend/src/WorldMapPicker.tsx`
- `frontend/src/PlayingView.tsx` for current picker usage
- `frontend/src/api.ts`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `frontend/src/NotesView.tsx`
- `frontend/src/App.css` only if small layout tweaks are needed
- `docs/design/ui-redesign-roadmap.md`
- `issues.md`

## Required Behavior

### Data Loading

In `NotesView.tsx`, load map points in addition to courses, routes, and notes:

```ts
api.getMapPoints()
```

Store them in local state.

### Map Picker

Render `WorldMapPicker` near the top of Courses, before or next to the existing target selector.

State needed:

- `fromMapPointId`
- `toMapPointId`
- `mapPoints`
- resolve/loading/error state if needed

Expected selection behavior:

- Clicking the same map point for from/to resolves to a normal course.
- Clicking different map points resolves to a route.
- After a successful resolve:
  - if `kind === 'course'`, set `selectedType = 'course'`, `selectedId = course.id`
  - if `kind === 'route'`, set `selectedType = 'route'`, `selectedId = route.id`
  - clear any note edit state
- Keep the existing select box fully functional.
- When a user changes the select box manually, keep map state as-is or clear it; choose the simpler behavior that avoids confusing stale errors.

### Calibration

Preserve `WorldMapPicker` calibration behavior in Courses:

- pass `onMapPointUpdated`
- update local `mapPoints` state in place after successful save

Do not create a second calibration implementation.

### Error Handling

- If `resolveSelection` returns 404/400 for a pair, show a compact notice near the map or selector.
- Do not crash.
- Do not block the existing select box.

### Empty / Missing Map

- If `/assets/maps/world.png` is missing, `WorldMapPicker` currently returns `null` after image error.
- Courses view should still work via the existing select box.

### Route Detail

- Existing `RouteDetail compact` display for selected routes should remain.
- If selecting a route via the map, it should appear the same as selecting it from the dropdown.

## Constraints

- Frontend only.
- No backend/API/schema changes.
- No new npm dependencies.
- Reuse `WorldMapPicker`; do not duplicate the map UI.
- Do not change Playing behavior.
- Do not change WorldMapPicker public behavior in a way that would break Playing.
- Keep 375px layout clean; no horizontal overflow.
- Do not mark the `issues.md` item complete unless verified.

## Non Goals

- Image acquisition.
- Course icon acquisition.
- Changing map point coordinates.
- Changing note/annotation schema.
- Bulk note operations.
- Pi deployment.

## Verification

Run from `frontend/`:

```bash
npm run typecheck
npm run build
```

If browser verification is available:

- Courses loads with world map and existing select boxes.
- Same map point selection opens a course target.
- Different map point selection opens a route target.
- Existing dropdown selection still works.
- RouteDetail appears for route target selected via map.
- Calibration mode still updates marker position and does not break notes.
- 375px width has no horizontal overflow.
- Console has no JS/React errors.

## Expected Report

- Changed files
- Summary
- Map selection behavior
- Dropdown compatibility
- Verification results
- Blocked checks
- Design questions for Codex
