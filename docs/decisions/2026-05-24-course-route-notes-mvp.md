# Course / Route Notes MVP

## Context

Course and route IDs are now stable:

- 30 course masters
- 203 route masters
- Playing can resolve and record course or route races
- Records can show route metadata

The initial schema already contains `course_notes`, but the app does not yet expose note APIs or UI.

## Decision

Implement notes as the next MVP slice using the existing `course_notes` table.

Support notes attached to exactly one target:

- `course_id`
- or `route_id`

Expose basic CRUD APIs and a compact frontend Notes/Courses view for creating, editing, pinning, filtering, and soft-deleting notes.

## Reason

Notes are useful once route/course identity is stable. Implementing them before map annotations keeps the data model simple and gives the user immediate value without requiring map images or coordinate work.

## Constraints

- Keep the existing DB schema; no Alembic migration for this slice.
- Preserve the existing XOR rule: a note targets exactly one course or one route.
- Use soft delete via `is_active = false`; do not hard-delete notes in normal UI/API flows.
- Do not implement map annotations, file upload, image embedding, markdown preview, search indexing, or analytics in this slice.
- Treat `body_markdown` as plain user-authored markdown text for storage and display; do not render raw HTML.

