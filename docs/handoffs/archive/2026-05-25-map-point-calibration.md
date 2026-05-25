Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, docs/decisions/2026-05-25-map-image-asset-policy.md, and this handoff file before implementation.
This handoff is ready for implementation after Codex review of the world-map picker slice.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add explicit map point coordinate calibration for the world-map picker.

This lets the user drag map point markers on the real world map image and save normalized `x/y` coordinates.

## Background

Current `map_points.x/y` values were initially placeholders. Once a real `world.png` is available, points need to be calibrated against that image.

Calibration must be separate from normal Playing selection so race recording cannot accidentally move coordinates.

## Files To Inspect

- `backend/app/models/courses.py`
- `backend/app/schemas/__init__.py`
- `backend/app/api/courses.py`
- `backend/tests/test_api.py`
- `frontend/src/PlayingView.tsx`
- `frontend/src/WorldMapPicker.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`

## Files To Edit

- `backend/app/schemas/__init__.py`
- `backend/app/api/courses.py`
- `backend/tests/test_api.py`
- `frontend/src/PlayingView.tsx`
- `frontend/src/WorldMapPicker.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`

Do not add Alembic migrations unless the existing `map_points` columns prove insufficient.

## Constraints

- Calibration/edit mode must be explicit.
- Normal Playing selection must not move coordinates.
- Coordinate update API should only update `x`, `y`, and optionally `radius`.
- Do not allow changing `id`, `course_id`, labels, or ownership in this slice.
- Coordinates must remain normalized `0.0..1.0`.
- Do not implement annotation drag/drop.
- Do not add image upload/storage.
- 375px viewport must remain usable.

## Required Behavior

### Backend API

Add:

```text
PATCH /api/v1/map-points/{map_point_id}
```

Request body:

- `x`: float `0.0..1.0`, optional
- `y`: float `0.0..1.0`, optional
- `radius`: float `0.0..1.0`, optional nullable if current model allows

Behavior:

- return 404 for unknown map point
- validate normalized bounds
- update only provided coordinate fields
- return updated `MapPointRead`

### Frontend Calibration Mode

In the world-map picker:

- provide an explicit calibration/edit toggle.
- in normal mode, marker click/tap selects start/destination and does not move coordinates.
- in calibration mode, markers can be dragged.
- after moving a marker, save the new normalized `x/y`.
- show saving and error states.
- after reload/refetch, the marker remains at the saved position.
- provide a way to exit calibration mode.

Prefer a deliberate save action after drag rather than silent accidental saves, unless the implementation keeps accidental movement very well guarded.

## Non Goals

- World-map picker initial implementation.
- Route image acquisition.
- Annotation drag/drop.
- Editing map labels or course ownership.
- Asset upload.

## Verification

Run:

```text
python -m py_compile app/api/courses.py app/schemas/__init__.py tests/test_api.py
python -m pytest tests/
npm run typecheck
npm run build
```

Manual/browser check if feasible:

- normal Playing mode cannot move points.
- calibration mode can move a point.
- saved point persists after reload/refetch.
- invalid API updates are rejected.
- unknown map point returns 404.
- 375px viewport remains usable.
- console has no React/JavaScript errors.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
