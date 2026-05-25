Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, docs/decisions/2026-05-25-map-image-asset-policy.md, and this handoff file before implementation.
Queued handoff: do not implement until Codex has reviewed the route image assets slice and explicitly says this handoff is ready.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add a visual world-map picker to Playing.

The picker should use one world map image with map-point/course markers overlaid, while preserving the existing searchable text picker as fallback.

## Background

Design direction:

- base map: `/assets/maps/world.png`
- course icons: `/assets/course-icons/<course_id>.png`
- coordinates: existing `map_points.x/y`, normalized `0.0` to `1.0`
- normal Playing mode: click/tap markers to select start/destination
- existing `POST /course-selection/resolve` remains the only source of route/course resolution

This slice assumes route image display has already been handled or can coexist with it.

## Files To Inspect

- `frontend/src/PlayingView.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`
- `docs/decisions/2026-05-25-map-image-asset-policy.md`

## Files To Edit

- `frontend/src/PlayingView.tsx`
- `frontend/src/WorldMapPicker.tsx` or another clearly named reusable component
- `frontend/src/App.css`
- `frontend/src/api.ts` only if small type/helper changes are needed

Do not edit backend APIs in this slice.

## Constraints

- Do not implement coordinate dragging/calibration in this slice.
- Do not add backend endpoints.
- Do not add image upload/storage.
- Do not scrape or download assets in this slice.
- Missing `world.png` or course icons must not break the UI.
- Preserve existing searchable picker.
- 375px viewport must remain usable.
- Normal Playing selection must not move coordinates.

## Required Behavior

In the Playing course selection phase:

- display a visual world-map picker when `/assets/maps/world.png` exists.
- overlay one selectable marker per map point using normalized `x/y`.
- use `/assets/course-icons/<course_id>.png` for markers when present.
- fall back to compact text markers when an icon is missing.
- visually distinguish selected start and destination.
- support selecting start and destination through map markers.
- support same-point selection for normal course selection.
- keep the searchable picker visible or easily accessible as fallback.
- keep search picker state and map picker state synchronized.
- route/course resolution must still go through `POST /course-selection/resolve`.

If `world.png` is missing:

- do not show a broken image.
- continue showing the searchable picker and any existing selection summary.

## Non Goals

- Coordinate calibration.
- Map point update API.
- Route image acquisition.
- Upload API.
- Annotation drag/drop.
- Advanced route geometry drawing.

## Verification

Run:

```text
npm run typecheck
npm run build
```

Manual/browser check if feasible:

- map picker displays when `world.png` exists.
- app works when `world.png` is absent.
- icon markers show when course icons exist.
- text markers show when course icons are missing.
- clicking markers updates start/destination.
- same-point selection still resolves to a normal course.
- search picker and map picker remain synchronized.
- route/course confirmation still works.
- 375px viewport has no horizontal overflow.
- console has no React/JavaScript errors.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
