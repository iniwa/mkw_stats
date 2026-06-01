Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Allow existing route annotations to switch between the route path surface (`道中`) and goal surface (`道後`) after creation.

Currently `MapAnnotationCreate` accepts `is_goal_image`, but `MapAnnotationUpdate` does not. Users must delete and recreate an annotation if it was placed on the wrong route image surface. This handoff adds update support while preserving existing route/course target rules.

## Background

Current state from the 2026-05-31 audit:

- Route annotations have `is_goal_image: boolean`.
- `false` means the normal route path image: `frontend/public/assets/routes/<route_id>.png`.
- `true` means the goal/final-lap image: `frontend/public/assets/routes/<route_id>_goal.png` or `<route_id>_3lap_goal.png`.
- `AnnotationEditor` already has a `道中 / 道後` surface selector for creation and filters visible annotations by `is_goal_image`.
- Existing edit form can edit label, type, icon type, hover text, x/y, priority, and note link, but cannot edit `is_goal_image`.
- Course annotations must never have `is_goal_image = true`.

## Files To Inspect

- `backend/app/schemas/__init__.py`
- `backend/app/api/map_annotations.py`
- `backend/app/models/courses.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `backend/app/schemas/__init__.py`
- `backend/app/api/map_annotations.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/AnnotationEditor.tsx`
- `docs/design/ui-redesign-roadmap.md`
- `issues.md` only if it has a directly matching unchecked item

Do not edit files outside this list unless you stop and explain why.

## Constraints

- Do not add a migration. The database column already exists.
- Do not change create behavior except where necessary to share validation.
- Do not allow course annotations to become `is_goal_image = true`.
- Do not allow changing annotation target (`course_id` / `route_id`) in this slice.
- Do not change route image asset paths or acquire new images.
- Do not change annotation icon behavior.
- Preserve current Japanese UI labels:
  - `道中`
  - `道後`
- Keep the edit UI compact. Do not add a new panel or modal.
- If an update moves an annotation from the currently visible surface to the other surface, it is acceptable for the annotation to disappear from the current filtered list after save. It should reappear when the user switches the surface selector.

## Implementation Notes

Backend:

- Add `is_goal_image: bool | None = None` to `MapAnnotationUpdate`.
- In `PATCH /api/v1/map-annotations/{annotation_id}`:
  - Fetch the existing annotation first as today.
  - If payload includes `is_goal_image=True` and the existing annotation has no `route_id`, reject the request.
  - Prefer HTTP 422 for validation-style rejection, matching create validation behavior. If current endpoint patterns favor 400, use the local pattern and report it.
  - Apply `is_goal_image` like other editable fields when provided.
- Add tests:
  - Route annotation can PATCH `is_goal_image` from `false` to `true`.
  - Route annotation can PATCH `is_goal_image` from `true` to `false`.
  - Course annotation PATCH `is_goal_image=true` is rejected.
  - Updating other fields without `is_goal_image` preserves the current value.

Frontend:

- Add `is_goal_image?: boolean` to `MapAnnotationUpdateBody`.
- In `AnnotationEditor`:
  - Track edit-side state for route annotations, initialized from `a.is_goal_image` in `startEdit`.
  - In the edit form for route annotations, show a compact `道中 / 道後` control.
  - Include `is_goal_image` in the PATCH body only for route annotations.
  - After save, use the returned annotation object to update local state, preserving the existing sort behavior.
  - If editing is cancelled, discard any unsaved surface change.
- Use existing styling where possible. Only add CSS if the current layout cannot accommodate the control cleanly.

Docs:

- Update `docs/design/ui-redesign-roadmap.md` so it no longer says `MapAnnotationUpdate` cannot update `is_goal_image`.
- Record the new completed behavior briefly.

## Non Goals

- Do not implement annotation target reassignment.
- Do not add bulk migration or data cleanup.
- Do not change the path/goal image discovery logic.
- Do not add new route/course/image assets.
- Do not change `TargetImage` display behavior.
- Do not deploy to Pi.

## Verification

Run from the repository root unless noted:

```powershell
python -m pytest backend/tests/test_api.py -q
cd frontend
npm run typecheck
npm run build
cd ..
git diff --check
```

Manual or browser verification is optional for this slice. If done, verify:

- Create a route annotation on `道中`.
- Edit it and switch to `道後`.
- After save, it disappears from `道中` and appears on `道後`.
- Switch it back to `道中`.
- Course annotations do not expose a meaningful `道後` update path.

## Expected Report

- Changed files
- Summary
- Backend API behavior
- Frontend UI behavior
- Verification results
- Blocked checks
- Any residual test data
- Design questions for Codex
