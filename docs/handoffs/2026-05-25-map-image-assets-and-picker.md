Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, and this handoff file before implementation.
Queued handoff: do not implement until Codex has explicitly resolved image sourcing/storage and says this handoff is ready.
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

## Files To Inspect

- `docs/design/ui-redesign-roadmap.md`
- `backend/app/models/courses.py`
- `backend/app/schemas/__init__.py`
- `backend/app/api/courses.py`
- `frontend/src/PlayingView.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`

## Files To Edit

Exact files depend on the image-source decision. Expected scope may include:

- `frontend/src/PlayingView.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`
- static asset files under an agreed frontend asset directory

Backend/schema edits require Codex confirmation before implementation.

## Constraints

- Do not download or bundle fan-site images unless Codex explicitly says they are allowed.
- Do not add external exposure or CDN usage.
- Do not add image upload/storage backend in this slice unless re-scoped.
- Preserve text/search target selection as fallback.
- 375px viewport must remain usable.

## Required Behavior For First Asset Slice

If assets are available:

- display a map image or course/route image in the assist area.
- overlay existing annotation markers using normalized `x/y` where possible.
- keep markers read-only.
- clicking markers may show label/hover text if simple.
- do not require the image to record a race.

If assets are not available:

- create no fake image system.
- stop and report the missing asset decision.

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

