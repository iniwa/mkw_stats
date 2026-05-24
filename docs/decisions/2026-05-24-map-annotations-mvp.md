# Map Annotations MVP

## Context

Course and route masters are stable, route metadata is visible, and course/route notes are implemented and verified on the Raspberry Pi deployment.

The initial schema already contains `map_annotations`, but the app does not yet expose annotation APIs or UI.

The real map image and final point coordinates are still not settled. Current `map_points` use placeholder coordinates, so this slice should not depend on a production-quality map asset.

## Decision

Implement map annotations as the next MVP slice using the existing `map_annotations` table.

Support annotations attached to exactly one target:

- `course_id`
- or `route_id`

Expose CRUD APIs and a compact frontend annotation editor inside the existing `Courses` view.

For the first UI, use a neutral normalized preview surface instead of a real map image. Store coordinates as normalized `x` / `y` values in the existing table. This keeps the data portable when a real map image is added later.

## Reason

Annotations are the natural next step after notes: users can mark important locations, labels, and reminders for a course or route without waiting for full map-image support.

Keeping the first editor normalized and image-free avoids blocking on asset selection, coordinate calibration, route geometry, or file upload.

## Constraints

- Keep the existing DB schema; no Alembic migration for this slice.
- Preserve the existing XOR rule: an annotation targets exactly one course or one route.
- Do not introduce map images, uploaded files, route geometry drawing, or rich canvas tools in this slice.
- Treat `x`, `y`, `width`, and `height` as normalized `0.0` to `1.0` coordinates when present.
- API must validate referenced course/route/note IDs.
- If `note_id` is provided, the linked note should target the same course or route as the annotation.
- Do not hard-delete annotations unless the existing schema prevents soft delete. The current table has no `is_active`; for this MVP, DELETE may hard-delete annotations, but do not hard-delete notes.

