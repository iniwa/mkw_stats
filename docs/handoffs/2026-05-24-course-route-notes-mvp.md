Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Implement the MVP for course/route notes.

Users should be able to create, view, edit, pin, filter, and soft-delete notes attached to either a course or a route.

Keep this slice practical and small:

- backend CRUD API for existing `course_notes` table
- frontend Notes/Courses view wired into the existing nav
- tests for core API behavior

## Background

Course and route masters are now stable and verified on Pi:

- 30 courses
- 203 routes
- route metadata visible in Playing and Records

The DB model already exists:

- `backend/app/models/courses.py::CourseNote`
- table: `course_notes`
- fields include:
  - `id`
  - `course_id`
  - `route_id`
  - `title`
  - `body_markdown`
  - `priority`
  - `tags`
  - `is_pinned`
  - `is_active`
  - `created_at`

Important model constraint:

- exactly one of `course_id` or `route_id` must be set

Relevant decisions:

- `docs/decisions/2026-05-24-course-route-notes-mvp.md`
- `docs/decisions/2026-05-22-course-master-seed-strategy.md`
- `docs/decisions/2026-05-22-route-master-seed-strategy.md`
- `docs/decisions/2026-05-23-route-detail-ui-scope.md`

## Files To Inspect

- `backend/app/models/courses.py`
- `backend/app/schemas/__init__.py`
- `backend/app/api/courses.py`
- `backend/app/api/__init__.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/RouteDetail.tsx`
- `frontend/src/RecordsView.tsx`
- `frontend/src/PlayingView.tsx`

## Files To Edit

Backend:

- `backend/app/schemas/__init__.py`
- `backend/app/api/__init__.py`
- `backend/tests/test_api.py`

Create if useful:

- `backend/app/api/notes.py`
- `backend/app/services/notes.py`

Frontend:

- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/App.css`

Create:

- `frontend/src/NotesView.tsx`

Do not edit Alembic migrations unless you discover the existing schema cannot support this slice. If that happens, stop and ask before editing migrations.

## Backend Requirements

Add schemas:

- `CourseNoteRead`
- `CourseNoteCreate`
- `CourseNoteUpdate`

Recommended schema behavior:

- `CourseNoteRead`
  - `id: UUID`
  - `course_id: str | None`
  - `route_id: str | None`
  - `title: str | None`
  - `body_markdown: str | None`
  - `priority: int`
  - `tags: list | None`
  - `is_pinned: bool`
  - `is_active: bool`
  - `created_at: datetime`
- `CourseNoteCreate`
  - exactly one of `course_id` or `route_id`
  - optional `title`
  - optional `body_markdown`
  - `priority` default `0`
  - `tags` default `None`
  - `is_pinned` default `False`
- `CourseNoteUpdate`
  - allow updating `title`, `body_markdown`, `priority`, `tags`, `is_pinned`
  - do not allow changing `course_id` / `route_id` in this slice

Add endpoints under `/api/v1`:

- `GET /notes`
  - query params:
    - `course_id?: str`
    - `route_id?: str`
    - `include_inactive?: bool = false`
  - default returns active notes only
  - order: pinned first, then priority descending, then created_at descending
  - if both `course_id` and `route_id` are provided, return 400
- `POST /notes`
  - validates target exists
  - creates note
  - response `201`
- `PATCH /notes/{note_id}`
  - updates editable fields
  - 404 if not found
- `DELETE /notes/{note_id}`
  - soft delete by setting `is_active = false`
  - 404 if not found
  - return 204 or the updated note; choose one and test it

Validation:

- POST with neither target -> 422 or 400
- POST with both targets -> 422 or 400
- POST with unknown `course_id` -> 404
- POST with unknown `route_id` -> 404
- PATCH must not revive inactive notes unless explicitly updating `is_active`; this slice should not expose revive behavior.

Router:

- add the new notes router to `backend/app/api/__init__.py`

## Backend Tests

Add focused tests in `backend/tests/test_api.py` using existing SQLite fixtures:

- create course note successfully
- create route note successfully
- reject both course_id and route_id
- reject missing target
- reject unknown course/route
- list filters by course_id
- list filters by route_id
- pinned/priority ordering
- patch editable fields
- delete soft-deletes and hides by default
- include_inactive shows soft-deleted note

Keep tests deterministic and avoid depending on live PostgreSQL.

## Frontend Requirements

Add API types/methods in `frontend/src/api.ts`:

- `CourseNote`
- `CourseNoteCreateBody`
- `CourseNoteUpdateBody`
- `getNotes(options?)`
- `createNote(body)`
- `updateNote(id, body)`
- `deleteNote(id)`

Add `NotesView.tsx` and wire it into `App.tsx`.

Navigation:

- The existing nav has `Courses`. Use `Courses` for this view unless you decide `Notes` is clearer.
- If renaming nav item to `Notes`, make sure existing placeholders still behave reasonably.

UI behavior:

- Load courses, routes, and notes in parallel.
- Show loading, error, and empty states.
- Filter by target type:
  - all
  - course
  - route
- Provide target picker for creating a note:
  - choose Course or Route
  - choose specific course/route from searchable or select control
  - title input
  - body textarea
  - pinned checkbox
  - priority numeric input
  - create button
- Show note list:
  - pinned marker
  - target name
  - title or fallback `(無題)`
  - body text, preserving line breaks
  - priority
  - edit button
  - delete button
- Editing:
  - inline edit is sufficient
  - allow title/body/pinned/priority changes
  - do not allow changing target in edit mode
- Deleting:
  - call soft-delete endpoint
  - remove from default active list after success
- Use existing UI classes where possible.
- Keep layout dense and usable on mobile.
- Do not render markdown as HTML. Plain text display with preserved line breaks is enough.

Optional but useful:

- Show route metadata detail using existing `RouteDetail` for the selected route target if it does not make the UI too large.

## Constraints

- Keep this slice within existing schema.
- No Alembic migration unless blocked.
- No map annotations.
- No file uploads.
- No image embedding.
- No rich markdown renderer.
- No full text search.
- No external exposure or Docker/Portainer changes.
- No new npm dependencies.
- Do not hard-delete notes in normal API/UI flow.

## Verification

Run:

```bash
cd backend
python -m py_compile app/schemas/__init__.py app/api/__init__.py app/api/notes.py tests/test_api.py
python -m pytest tests
```

If you add `backend/app/services/notes.py`, include it in py_compile.

Run:

```bash
cd frontend
npm run typecheck
npm run build
```

Browser checks if backend is available:

- open Notes/Courses view
- create a course note
- create a route note
- edit title/body/pinned/priority
- delete a note and confirm it disappears from active list
- reload and confirm remaining notes persist
- no console errors

If browser/live backend verification is blocked, report exactly why.

## Non Goals

- No Pi deployment verification in this handoff.
- No map annotation UI.
- No note search beyond basic filters.
- No analytics.
- No import/export.
- No markdown preview.
- No media/file attachment.

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

