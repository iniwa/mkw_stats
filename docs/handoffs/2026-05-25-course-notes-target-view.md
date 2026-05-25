Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, and this handoff file before implementation.
This handoff is ready for implementation after Codex review of the Analytics split.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Redesign the Courses view so notes and annotations are managed through a selected course/route target instead of showing all notes as the primary interface.

This prepares the app for having notes on most courses without making the page crowded.

## Background

Current Courses view includes note creation/listing and map annotation management. As notes grow, the all-notes list becomes noisy.

Roadmap direction:

- select a course/route first
- show notes and annotations for that target
- keep all-note browsing secondary or remove it from the primary screen
- keep advanced map-image editing for a later slice

Depends on:

- `docs/handoffs/archive/2026-05-25-analytics-split-vr-lounge.md`

## Files To Inspect

- `frontend/src/NotesView.tsx`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/RouteDetail.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`

## Files To Edit

- `frontend/src/NotesView.tsx`
- `frontend/src/AnnotationEditor.tsx` if needed
- `frontend/src/App.css`
- `frontend/src/api.ts` only if a small client helper is useful

## Constraints

- Do not implement map-image placement.
- Do not implement drag-and-drop annotation editing.
- Do not change note or annotation backend APIs.
- Preserve the ability to create/edit/delete notes.
- Preserve the ability to create/edit/delete annotations.
- Keep route metadata visible for selected route targets.
- 375px viewport must remain usable.

## Required Behavior

### Target selector

Courses view should start with a target selector:

- target type: course or route
- searchable/selectable target list or select control
- selected target summary

### Target-focused notes

Once a target is selected:

- show notes only for that target
- create note defaults to that target
- edit/delete still work
- pinned/priority ordering remains

### Target-focused annotations

Annotation editor should be scoped to the selected target:

- create annotation defaults to selected target
- annotation list shows only selected target annotations
- note-link dropdown should show only notes for the selected target

### Empty states

Show useful empty states:

- no target selected
- target selected with no notes
- target selected with no annotations

## Non Goals

- Map image.
- Icon asset upload.
- Visual drag/drop editor.
- Notes search across all courses.

## Verification

Run:

```text
npm run typecheck
npm run build
```

Manual/browser check if feasible:

- select course target and create/edit/delete note.
- select route target and create/edit/delete note.
- route target shows compact route detail.
- create/edit/delete annotation under selected target.
- note-link dropdown only shows notes for the selected target.
- target switching does not leak notes/annotations from previous target.
- 375px viewport has no horizontal overflow.
- console has no React/JavaScript errors.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
