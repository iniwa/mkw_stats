Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, and this handoff file before implementation.
Queued handoff: do not implement until Codex has reviewed the course-notes target view implementation and explicitly says this handoff is ready.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Introduce the first practical map-image foundation for course/route selection and note context.

This handoff intentionally starts with asset structure and read-only display. It should not jump directly to a full advanced editor unless Codex re-scopes it.

## Background

The roadmap wants a Mario Kart World-style map/image selection UI eventually:

- click map points on an image
- show notes/annotations on the map
- use course icons/images in histories

Image sourcing is unresolved. This handoff must only proceed after Codex confirms:

- which image assets are allowed
- where assets should live
- how coordinates map to `map_points.x/y`

Image sourcing/storage has been scoped by:

- `docs/decisions/2026-05-25-map-image-asset-policy.md`

Use optional local frontend assets only. Do not scrape, download, or commit fan-site images.

## Files To Inspect

- `docs/design/ui-redesign-roadmap.md`
- `docs/decisions/2026-05-25-map-image-asset-policy.md`
- `backend/app/models/courses.py`
- `backend/app/schemas/__init__.py`
- `backend/app/api/courses.py`
- `frontend/src/PlayingView.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`

## Files To Edit

- `frontend/src/PlayingView.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`
- `frontend/public/assets/maps/.gitkeep`
- `frontend/public/assets/course-icons/.gitkeep`

Backend/schema edits require Codex confirmation before implementation.

## Constraints

- Do not download or bundle fan-site images unless Codex explicitly says they are allowed.
- Do not scrape, download, or generate third-party image assets in this slice.
- Do not add external exposure or CDN usage.
- Do not add image upload/storage backend in this slice unless re-scoped.
- Preserve text/search target selection as fallback.
- 375px viewport must remain usable.
- Missing images must not show broken-image UI or block race recording.

## Required Behavior For First Asset Slice

Create the optional frontend asset directories:

```text
frontend/public/assets/maps/
frontend/public/assets/course-icons/
```

Use this optional lookup convention:

```text
/assets/maps/world.png
/assets/course-icons/<course_id>.png
```

If assets are present:

- display a map image or course/route image in the assist area.
- overlay existing annotation markers using normalized `x/y` where possible.
- keep markers read-only.
- clicking markers may show label/hover text if simple.
- do not require the image to record a race.

If assets are not available:

- keep the existing text/search and normalized annotation preview behavior.
- do not display broken image placeholders.
- report that no real image assets were present.

## Non Goals

- Full image picker replacement.
- Drag/drop annotation editor.
- Upload API.
- Asset scraping.
- Graphing or analytics.

## Verification

Run:

```text
npm run typecheck
npm run build
```

Manual/browser check if feasible:

- assist panel displays image when target has one.
- notes/annotations still render without image.
- marker positions are stable at desktop and 375px width.
- text fallback still works.
- console has no React/JavaScript errors.

## Expected Report

Report in Japanese:

- Changed files
- Asset source and storage used
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
