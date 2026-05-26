Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Integrate the user-provided world map image into the existing asset path and verify the current map-based UI uses it correctly.

This is primarily an asset-placement and verification slice. Do not redesign the picker.

## Background

The user has provided a world map image and placed it in the repository, but it is currently at:

```text
frontend/public/assets/world.png
```

The existing frontend expects the world map at:

```text
frontend/public/assets/maps/world.png
```

Existing implemented behavior:

- `WorldMapPicker` loads `/assets/maps/world.png`.
- `AnnotationEditor` uses `/assets/maps/world.png` for course targets.
- `map_points.x/y` are normalized coordinates.
- Map point calibration mode already exists in Playing and saves through `PATCH /api/v1/map-points/{id}`.
- If the world image is missing, UI falls back gracefully.

`issues.md` is currently an untracked user scratch note. Do not edit or commit it in this handoff.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-25-map-image-asset-policy.md`
- `docs/design/ui-redesign-roadmap.md`
- `frontend/src/WorldMapPicker.tsx`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/PlayingView.tsx`
- `frontend/src/App.css`
- `frontend/public/assets/`

## Files To Edit

- `frontend/public/assets/maps/world.png`
- `frontend/public/assets/world.png` (remove only by moving it to the correct path)

Do not edit frontend/backend source code unless a clear bug prevents the existing image-loading behavior from working.

Do not edit `issues.md`.

## Required Work

### 1. Move The Asset To The Expected Path

If `frontend/public/assets/world.png` exists:

- move it to `frontend/public/assets/maps/world.png`
- keep the filename exactly `world.png`
- do not resize, crop, recompress, or otherwise modify the image

If `frontend/public/assets/maps/world.png` already exists and appears to be the same user-provided map, report that and do not duplicate it.

### 2. Local Build Verification

Run:

- `npm run typecheck`
- `npm run build`

from the frontend project as appropriate.

### 3. Browser Verification

Using local dev server or deployed Pi if available, verify:

- Playing view loads.
- Starting a ranked/野良VR flow shows the world map picker image instead of fallback.
- Map markers render over the world map.
- Missing course icon images still fall back to text markers without broken images.
- Selecting map points via the image still updates the text picker state.
- Same-point selection still resolves a normal course.
- Different-point selection still resolves a route where applicable.
- Calibration mode can be entered and exited.
- Do not perform full 30-point calibration in this handoff.

If a temporary session or record is created for verification, clean it up before reporting. Prefer UI paths that do not leave persistent data.

### 4. Courses / Annotation Surface Spot Check

Verify:

- Courses view loads.
- Selecting a course target shows the visual annotation surface using the world map image.
- Clicking the annotation surface populates X/Y pending values.
- Cancel/clear or navigate away so no unintended annotation is saved.

### 5. Responsive / Console

At 375px width:

- Playing map picker has no horizontal overflow.
- Courses annotation surface has no horizontal overflow.

Check browser console:

- no JavaScript/React errors.
- no broken `/assets/maps/world.png` request.

## Manual Follow-Up For User

Do not try to complete this manually inside the handoff unless explicitly asked:

- visually calibrating all 30 map points
- choosing or preparing course icon images
- choosing additional route images not already in seed metadata

Report these as manual follow-up items if the image loads correctly.

## Constraints

- Keep the user-provided image unchanged.
- Do not edit `issues.md`.
- Do not add new image sources.
- Do not download images in this handoff.
- Do not change map point coordinates unless the user explicitly asks you to calibrate them.
- Do not commit automatically unless explicitly requested.
- Do not push.

## Non Goals

- No route image download.
- No course icon generation.
- No Courses page redesign.
- No full map point coordinate calibration.
- No backend/API changes.
- No deployment changes.

## Verification

Expected result:

- `frontend/public/assets/maps/world.png` exists.
- `frontend/public/assets/world.png` no longer exists.
- Typecheck/build pass.
- Playing and Courses use the map image instead of fallback.
- No horizontal overflow at 375px.
- No console errors from this change.

## Expected Report

- Changed files
- Summary
- Verification results
- Browser results
- 375px results
- Console/network errors
- Any temporary data created and cleanup result
- Manual follow-up items for the user
- Blocked checks
- Design questions for Codex
