Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Improve Courses -> map annotations so annotation coordinates can be placed visually on a surface instead of only typing X/Y numbers.

This is the first visual annotation placement slice. Keep it frontend-only and conservative.

## Background

Current state:

- Courses view lets the user select one course or route target.
- `AnnotationEditor` can create/edit/delete annotations for that selected target.
- Coordinates are normalized `x` / `y` values in `0..1`.
- Existing UI has numeric X/Y inputs and a simple normalized preview.
- Playing already has `WorldMapPicker` with normalized-coordinate marker placement for map points.
- Route image display exists through local assets under `frontend/public/assets/routes/<route_id>.png`.
- A world map asset may exist later at `frontend/public/assets/maps/world.png`.

User direction:

- Ideally, points should be placed by drag-and-drop on the real image.
- Route image should be shown when selecting route targets.
- Text/numeric fallback should remain.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/RouteImage.tsx`
- `frontend/src/WorldMapPicker.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

Do not edit backend files.

## Required Behavior

### Visual Surface

Replace or extend the current `.ann__preview` panel with an interactive visual placement surface.

The surface should show a background image when available:

- route target:
  - try `/assets/routes/<route_id>.png`
- course target:
  - try `/assets/maps/world.png`

If the image fails to load or is not present:

- keep a neutral fallback surface similar to the current normalized preview
- no broken image icon
- no console error from React code

Do not hotlink external images.

### Coordinate Creation

When creating a new annotation:

- clicking/tapping the visual surface sets `createX` and `createY`
- values are normalized to `0..1`
- the create form's numeric inputs update immediately
- show a temporary/preview marker for the pending create coordinates
- preserve manual numeric entry; if the user types X/Y, the preview marker moves

Clicking the surface should not create the annotation immediately. The existing create button remains the commit action.

### Coordinate Editing

For existing annotations with X/Y:

- show their markers on the same surface
- clicking a marker starts editing that annotation, same as the existing edit button
- while an annotation is in edit mode, dragging its marker updates `editX` and `editY`
- dragging should update local edit fields only; the existing save button remains the commit action
- canceling edit should discard unsaved drag changes

For existing annotations without X/Y:

- keep them in the list
- they do not appear as placed markers until coordinates are assigned

### Marker Display

Markers should be readable but compact:

- use a dot/pin marker for all annotation types in this slice
- show label beside the marker when present
- title/tooltip can use `hover_text` or label
- selected/editing marker should be visually distinct

Do not implement type-specific shapes (`arrow`, `area`, etc.) in this slice.

### Existing Forms

Keep the existing create/edit fields:

- type
- label
- hover text
- X
- Y
- priority
- note link

Do not remove numeric X/Y inputs. They are important fallback controls.

### Layout

The visual surface should appear in the annotation section before the create form or immediately after the create form. Choose the placement that keeps the workflow clear.

Recommended order:

1. visual placement surface
2. create form
3. annotation list

Keep mobile usable:

- no horizontal overflow at 375px
- markers should not force the surface wider than its container
- long labels should truncate or wrap without breaking layout

### State Safety

When switching selected target:

- clear pending create coordinates only if they belonged to the previous target
- clear editing state as current code already does
- visual surface should update to the new target's image/markers

### Error Handling

No new backend calls are needed beyond existing create/update/delete.

If image load fails:

- silently switch to fallback surface

If save/create/delete fails:

- preserve current error behavior

## Constraints

- Frontend-only.
- No backend/API/schema/migration changes.
- No new npm dependencies.
- No new image downloads in this slice.
- Do not change Playing map point calibration.
- Do not change route image display in Playing.
- Do not remove existing numeric coordinate inputs.
- Do not commit screenshots or temporary files.
- Keep the implementation small enough to review.

## Non Goals

- No advanced annotation geometry for `arrow` or `area`.
- No image upload UI.
- No world map asset creation.
- No automatic route image download.
- No bulk annotation import.
- No backend coordinate validation changes.
- No changes to `MapAnnotation` schema.

## Verification

Run from repo root:

```powershell
cd frontend
npm run typecheck
npm run build
```

Browser/manual verification if possible:

- Courses view loads.
- Select a course target; visual surface appears.
- If `/assets/maps/world.png` is missing, fallback surface appears without broken UI.
- Select a route target with a local route image asset; image-backed surface appears.
- Select a route target without local image; fallback surface appears.
- Click surface while create form is visible; X/Y inputs update and pending marker appears.
- Create annotation after selecting by click; marker appears in surface and list.
- Edit an existing annotation; dragging its marker updates edit X/Y fields.
- Save edit; marker persists at new location after reload or target reselect.
- Cancel edit; unsaved marker movement is discarded.
- Existing delete behavior still works.
- 375px width has no horizontal overflow.
- Browser console has no JavaScript/React errors.

If local backend is unavailable, run typecheck/build and report blocked browser checks clearly.

## Expected Report

- Changed files
- Summary
- Verification results
- Blocked checks
- Whether course image fallback and route image fallback were tested
- Whether click-to-place and drag-to-edit were tested
- Screenshots/temp files created and removed, if any
- Design questions for Codex
