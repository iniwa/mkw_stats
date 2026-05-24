Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Surface existing course/route notes and map annotations inside the Playing flow as a read-only assist panel.

The user should be able to see relevant reminders while confirming a selected course/route and while entering a ranked result, without switching to the Courses view.

## Background

The app already has:

- Course/route notes CRUD in `Courses`
- Map annotations CRUD in `Courses`
- Route metadata display in Playing confirmation and Records
- API methods in `frontend/src/api.ts`:
  - `api.getNotes({ course_id })`
  - `api.getNotes({ route_id })`
  - `api.getMapAnnotations({ course_id })`
  - `api.getMapAnnotations({ route_id })`

Relevant design decision:

- `docs/decisions/2026-05-25-playing-target-assist-scope.md`

The backend is already sufficient for this slice. This should be frontend-only.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-24-course-route-notes-mvp.md`
- `docs/decisions/2026-05-24-map-annotations-mvp.md`
- `docs/decisions/2026-05-25-playing-target-assist-scope.md`
- `frontend/src/api.ts`
- `frontend/src/PlayingView.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/RouteDetail.tsx`
- `frontend/src/App.css`

## Files To Edit

- `frontend/src/PlayingView.tsx`
- `frontend/src/App.css`

Optional, if it keeps `PlayingView.tsx` manageable:

- `frontend/src/TargetAssist.tsx`

Do not edit backend files for this handoff.

## Requirements

### Target Assist Panel

Create a reusable read-only panel for a single target:

- target type: `course` or `route`
- target ID
- display name

It should fetch, for that target only:

- active notes
- map annotations

Sort notes by:

1. pinned first
2. priority descending
3. newest first

Sort annotations by:

1. priority descending
2. label ascending

Display:

- Notes:
  - pinned badge when applicable
  - title, or `(無題)` when missing
  - body text with line breaks preserved
  - priority when non-zero
- Annotations:
  - type badge
  - label or `(untitled)`
  - normalized position when both `x` and `y` exist
  - hover text when present
  - linked note title if the annotation has `note_id` and that note is in the fetched note list

States:

- loading
- error with retry button
- compact empty state when both notes and annotations are empty

Errors must not block recording. The user should still be able to confirm or complete a race.

### Playing Integration

Show the target assist panel in:

1. `SelectionConfirm`
   - for `kind=course`, use `resolved.course.id`
   - for `kind=route`, use `resolved.route.id`
   - keep existing `RouteDetail` for route targets

2. `RankedResultForm`
   - show assist for the `draftRace` target while entering ranked result
   - if `draftRace.course_id` exists, use course target
   - if `draftRace.route_id` exists, use route target

Do not add the panel to the sidebar race history in this slice.

### Styling

Add concise styles consistent with the existing app:

- no nested cards
- use existing `panel`, `tag`, `notice`, `btn`, and `hint` patterns where practical
- compact enough for the Playing form
- mobile width around 375px must not horizontally overflow

## Constraints

- Frontend-only.
- Do not add dependencies.
- Do not add backend endpoints, models, migrations, or tests.
- Do not mutate notes or annotations from Playing.
- Do not fetch all notes or all annotations for every selection; use filtered API calls for the active target.
- Do not change race recording behavior.
- Do not change route selection, warning, undo, or finish semantics.
- Do not change deployment files.
- Do not commit automatically.

## Non Goals

- Editing notes or annotations from Playing.
- Adding map images.
- Drawing annotations on a real map.
- Showing assist in Records, Analytics, Dashboard, Lounge, or Courses beyond existing behavior.
- Backend search/filter changes.

## Verification

Run:

```text
cd frontend
npm run typecheck
npm run build
```

Browser/dev verification if possible:

- Playing confirmation for a course target with notes shows the assist panel.
- Playing confirmation for a route target with notes/annotations shows notes, annotations, and the existing route detail.
- A target with no notes/annotations shows the compact empty state.
- API error state shows retry and does not block the confirm button.
- Ranked draft result input shows the same target assist for the draft target.
- 375px viewport has no horizontal overflow.
- Browser console has no app errors.

If no local backend is available, use typecheck/build and report that live Playing verification is blocked until Pi deployment.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Verification results
- Blocked checks
- Any screenshots or temporary files created
- Design questions for Codex
