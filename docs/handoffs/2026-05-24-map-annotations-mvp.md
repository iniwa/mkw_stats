Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Implement the MVP for map annotations.

Users should be able to create, view, edit, filter, and delete lightweight annotations attached to either a course or a route.

Keep this slice practical and small:

- backend CRUD API for existing `map_annotations` table
- frontend annotation editor inside the existing `Courses` view
- tests for core API behavior

## Background

The project already has:

- 30 courses
- 203 routes
- Course/Route Notes API and UI
- `backend/app/models/courses.py::MapAnnotation`
- `backend/app/models/enums.py::AnnotationType`

Relevant decisions:

- `docs/decisions/2026-05-24-map-annotations-mvp.md`
- `docs/decisions/2026-05-24-course-route-notes-mvp.md`
- `docs/decisions/2026-05-22-course-master-seed-strategy.md`
- `docs/decisions/2026-05-22-route-master-seed-strategy.md`

Important model constraints:

- `map_annotations` targets exactly one of `course_id` or `route_id`
- optional `note_id` can link to a `course_notes` row
- current table has no `is_active`, so DELETE may hard-delete annotations in this MVP

## Files To Inspect

- `backend/app/models/courses.py`
- `backend/app/models/enums.py`
- `backend/app/schemas/__init__.py`
- `backend/app/api/notes.py`
- `backend/app/api/courses.py`
- `backend/app/api/__init__.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/RouteDetail.tsx`
- `frontend/src/App.css`

## Files To Edit

Backend:

- `backend/app/schemas/__init__.py`
- `backend/app/api/__init__.py`
- `backend/tests/test_api.py`

Create if useful:

- `backend/app/api/map_annotations.py`
- `backend/app/services/map_annotations.py`

Frontend:

- `frontend/src/api.ts`
- `frontend/src/NotesView.tsx`
- `frontend/src/App.css`

Create if useful:

- `frontend/src/AnnotationEditor.tsx`

Do not edit Alembic migrations unless you discover the existing schema cannot support this slice. If that happens, stop and ask before editing migrations.

## Backend Requirements

Add schemas:

- `MapAnnotationRead`
- `MapAnnotationCreate`
- `MapAnnotationUpdate`

Recommended schema behavior:

- `MapAnnotationRead`
  - `id: UUID`
  - `course_id: str | None`
  - `route_id: str | None`
  - `note_id: UUID | None`
  - `type: AnnotationType`
  - `icon_type: str | None`
  - `x: float | None`
  - `y: float | None`
  - `width: float | None`
  - `height: float | None`
  - `rotation: float | None`
  - `label: str | None`
  - `hover_text: str | None`
  - `priority: int`
  - `style: dict | None`
- `MapAnnotationCreate`
  - exactly one of `course_id` or `route_id`
  - optional `note_id`
  - `type` default `pin`
  - optional `icon_type`
  - optional `x`, `y`, `width`, `height`, `rotation`
  - optional `label`, `hover_text`
  - `priority` default `0`
  - optional `style`
- `MapAnnotationUpdate`
  - allow updating `note_id`, `type`, `icon_type`, `x`, `y`, `width`, `height`, `rotation`, `label`, `hover_text`, `priority`, `style`
  - do not allow changing `course_id` / `route_id` in this slice

Validation:

- POST with neither target -> 422 or 400
- POST with both targets -> 422 or 400
- POST with unknown `course_id` -> 404
- POST with unknown `route_id` -> 404
- POST/PATCH with unknown `note_id` -> 404
- If `note_id` is provided, it must target the same `course_id` or `route_id` as the annotation; mismatch -> 400
- For `x`, `y`, `width`, and `height`, if present, require `0.0 <= value <= 1.0`
- For `type`, use the existing `AnnotationType` enum values: `pin`, `icon`, `arrow`, `text`, `area`

Add endpoints under `/api/v1`:

- `GET /map-annotations`
  - query params:
    - `course_id?: str`
    - `route_id?: str`
    - `note_id?: UUID`
  - if both `course_id` and `route_id` are provided, return 400
  - order: priority descending, then label ascending, then id ascending
- `POST /map-annotations`
  - validates target exists
  - validates optional note consistency
  - creates annotation
  - response `201`
- `PATCH /map-annotations/{annotation_id}`
  - updates editable fields
  - validates optional note consistency against the existing annotation target
  - 404 if annotation not found
- `DELETE /map-annotations/{annotation_id}`
  - hard-delete is acceptable for this MVP because the existing table has no `is_active`
  - return `204`

Router:

- add the new map annotations router to `backend/app/api/__init__.py`

## Backend Tests

Add focused tests in `backend/tests/test_api.py` using existing SQLite fixtures:

- create course annotation successfully
- create route annotation successfully
- reject both course_id and route_id
- reject missing target
- reject unknown course/route
- reject x/y outside normalized range
- create annotation linked to matching course note
- reject note linked to a different target
- list filters by course_id
- list filters by route_id
- patch editable fields
- delete removes annotation
- deleted annotation returns 404 on fetch/update/delete behavior if applicable

Keep tests deterministic and avoid depending on live PostgreSQL.

## Frontend Requirements

Add API types/methods in `frontend/src/api.ts`:

- `AnnotationType`
- `MapAnnotation`
- `MapAnnotationCreateBody`
- `MapAnnotationUpdateBody`
- `getMapAnnotations(options?)`
- `createMapAnnotation(body)`
- `updateMapAnnotation(id, body)`
- `deleteMapAnnotation(id)`

Add annotation UI inside the existing `Courses` view (`NotesView.tsx`) or a small child component.

UI behavior:

- Load courses, routes, notes, and annotations.
- Keep the existing notes functionality working.
- Add an annotations section with:
  - target type selector: course / route
  - target picker
  - annotation type selector: pin / icon / text / arrow / area
  - label input
  - hover text textarea
  - x and y numeric inputs or sliders, normalized 0 to 1
  - priority numeric input
  - optional note link selector filtered to the same target
  - create button
- Show a simple normalized preview surface:
  - no real map image
  - render annotation markers positioned by x/y when both values are present
  - show label near marker
  - for missing x/y, show the annotation in the list only
- Show annotation list:
  - type
  - target name
  - label or fallback `(untitled)`
  - x/y if present
  - linked note title if present
  - priority
  - edit button
  - delete button
- Editing:
  - inline edit is sufficient
  - allow changing annotation fields listed above
  - do not allow changing target in edit mode
- Deleting:
  - call delete endpoint
  - remove from list after success

Use existing UI classes where possible. Keep layout dense and usable on mobile.

## Constraints

- Keep this slice within existing schema.
- No Alembic migration unless blocked.
- No map image.
- No route geometry drawing.
- No file uploads.
- No new npm dependencies.
- No external exposure or Docker/Portainer changes.
- Do not change existing Notes API behavior.
- Do not hard-delete notes.

## Verification

Run:

```bash
cd backend
python -m py_compile app/schemas/__init__.py app/api/__init__.py app/api/map_annotations.py tests/test_api.py
python -m pytest tests
```

If you add `backend/app/services/map_annotations.py`, include it in py_compile.

Run:

```bash
cd frontend
npm run typecheck
npm run build
```

Browser checks if backend is available:

- open Courses view
- existing notes still load
- create a course annotation
- create a route annotation
- edit label/hover text/type/x/y/priority
- link an annotation to a note with the same target
- delete an annotation
- reload and confirm remaining annotations persist
- no console errors
- narrow viewport remains usable

If browser/live backend verification is blocked, report exactly why.

## Non Goals

- No Pi deployment verification in this handoff.
- No real map image.
- No map asset upload.
- No route line drawing.
- No annotation drag-and-drop.
- No markdown rendering.
- No annotation import/export.
- No analytics.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- API endpoints added
- UI behavior added
- Verification results
- Browser checks performed or blocked
- Any blocked checks and why
- Design questions for Codex
