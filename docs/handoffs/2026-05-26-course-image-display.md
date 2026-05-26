Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Prepare course image display support for normal course targets.

After this slice, if a local file exists at:

```text
frontend/public/assets/courses/<course_id>.png
```

the app should show it in the same places where route images are currently useful. If the file is missing, the UI must gracefully fall back with no broken image.

This is display plumbing and documentation. It is not a full asset acquisition slice.

## Background

Current image behavior:

- Route images live at `frontend/public/assets/routes/<route_id>.png`.
- `frontend/src/RouteImage.tsx` renders route images and returns `null` after `onError`.
- `PlayingView` shows `RouteImage` in the route confirmation flow.
- `AnnotationEditor` uses:
  - routes: `/assets/routes/<route_id>.png`
  - courses: `/assets/maps/world.png`
- There is no equivalent normal-course image display.

Backlog in `issues.md` includes:

- `コース･道中ルートの全てにコース画像を配置`

The user may manually provide sample course images. Do not assume `sample.png` is ready for commit unless explicitly requested and renamed into the approved asset path.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `issues.md`
- `frontend/src/RouteImage.tsx`
- `frontend/src/PlayingView.tsx`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/App.css`
- `frontend/public/assets/`
- `docs/design/route-image-assets.md`
- `docs/design/course-icon-assets.md`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `frontend/src/RouteImage.tsx` or a new `frontend/src/TargetImage.tsx`
- `frontend/src/PlayingView.tsx`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/App.css`
- `docs/design/course-image-assets.md` (new)
- `docs/design/ui-redesign-roadmap.md`
- `issues.md` only if the implemented part should be marked or annotated

Optional:

- `frontend/public/assets/courses/.gitkeep` if the directory does not exist.

## Required Behavior

### Asset Path

Use this local-only path convention:

```text
frontend/public/assets/courses/<course_id>.png
```

Runtime URL:

```text
/assets/courses/<course_id>.png
```

Do not hotlink external images at runtime.

### Display Component

Create or extend a reusable component so both course and route targets can be displayed consistently.

Acceptable options:

- Add `CourseImage` next to `RouteImage`.
- Or replace `RouteImage` with a more generic `TargetImage`.

Required behavior:

- `kind="course"` uses `/assets/courses/<course_id>.png`.
- `kind="route"` uses `/assets/routes/<route_id>.png`.
- Missing image returns `null` after `onError`.
- Changing target id resets failure state.
- `alt=""` is acceptable because these images are decorative/contextual and names are already shown nearby.

### Playing Confirmation

In `PlayingView` confirmation step:

- For route targets: keep existing route image behavior.
- For course targets: show course image if present.
- If no image exists, keep the current layout with no broken image and no extra error text.

### Annotation Surface

In `AnnotationEditor`:

- For route targets: keep using route image as the surface background.
- For course targets: try `/assets/courses/<course_id>.png` as the surface background.
- If course image is missing, fall back to the current world map behavior or clean fallback surface.
- Do not remove world map annotation support; use course image only when it exists.

Implementation note:

- Because `img onError` only tells you after load failure, a simple fallback chain is fine:
  1. course image
  2. world map
  3. fallback panel

Keep this simple. Do not add prefetching or HEAD requests.

### Documentation

Create `docs/design/course-image-assets.md`.

It should include:

- path convention
- runtime URL
- local-only / no hotlink rule
- source note:
  - approved references can include the user-provided fan site and MarioWiki pages, but assets must be saved locally
- checklist for all 30 course ids
- current status as `missing` unless files are actually present
- note that route image assets remain documented separately in `docs/design/route-image-assets.md`

Do not mark the parent `issues.md` image item complete unless all course images are actually present and verified.

## Constraints

- Frontend only.
- No backend/API/db changes.
- No npm dependencies.
- Do not download images in this slice.
- Do not commit `sample.png` from repository root.
- Do not rename existing route images.
- Do not break current route image display.
- Do not change WorldMapPicker marker/icon behavior.
- 375px layout must not overflow.

## Non Goals

- Full course image acquisition.
- Course icon acquisition.
- Adding image URLs to seed data.
- Bulk scraping from external sites.
- Pi deployment.

## Verification

Run from `frontend/`:

```bash
npm run typecheck
npm run build
```

If browser verification is available:

- With no course image files present, course confirmation renders without broken image.
- With no course image files present, course annotation surface still falls back cleanly.
- Existing route image still appears for a route with an asset.
- Existing route image fallback still works for routes without assets.
- 375px width has no horizontal overflow.
- Console has no JS/React errors.

## Expected Report

- Changed files
- Summary
- Asset path convention
- Course image fallback behavior
- Route image regression check
- Verification results
- Blocked checks
- Design questions for Codex
