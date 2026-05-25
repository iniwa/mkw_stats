Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, and this handoff file before implementation.
Queued handoff: do not implement until Codex has reviewed the result-model and Playing-flow implementations and explicitly says this handoff is ready.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Update Records so it can correct the new numeric race result model and hide records that were entered by mistake.

This is not a broad Records redesign. It is the correction/maintenance UI for the new result fields.

## Background

Depends on:

- `docs/handoffs/2026-05-25-result-model-redesign.md`
- `docs/handoffs/2026-05-25-playing-flow-redesign.md`
- `docs/design/ui-redesign-roadmap.md`

Expected prior state:

- `RaceRecord` has numeric `placement`, optional `score`, `is_hidden`, and `hidden_at`.
- ranked records use `rating_after` as user-entered result VR.
- Lounge records use `placement` and `score`.
- backend exposes hide support for erroneous input.

## Files To Inspect

- `frontend/src/RecordsView.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`
- `backend/app/schemas/__init__.py`
- `backend/app/services/race_flow.py`
- `backend/app/api/races.py`

## Files To Edit

- `frontend/src/RecordsView.tsx`
- `frontend/src/api.ts` only if needed
- `frontend/src/App.css`

Backend edits should be avoided unless a missing API field is discovered and Codex agrees to expand the scope.

## Constraints

- Keep Records focused on correction and review.
- Do not implement a full recovery/trash view in this slice.
- Do not hard-delete records.
- Hide/delete action should mean "entered by mistake, exclude from normal history and analytics."
- Cancel action should remain distinct: "race happened but is cancelled."
- Preserve memo editing.
- Preserve date/source/status filters.
- Preserve route detail display.

## Required UI Behavior

### Display

Race rows should display:

- race number
- target course/route name
- race status
- player count when present
- numeric placement when present
- ranked VR before -> after and delta when present
- Lounge score when present
- memo when present
- warnings when present

Do not display `placement_band`.

### Edit

Allow inline correction for:

- memo
- player count
- placement
- ranked `rating_after`
- Lounge score

Rules:

- empty memo should save as `null`.
- placement should be numeric.
- `rating_after` edit should call the backend update API and then refresh the race list.
- If the backend cannot repair snapshots/current VR fully, surface the backend behavior in the report rather than inventing client-side correction.

### Hide / Delete

Add a clear action such as `非表示` or `削除`.

Behavior:

- show a confirmation dialog explaining it is for mistaken input and will hide the record from normal history.
- call backend hide API.
- refresh the selected race list.
- hidden race disappears from the default list.

Do not add hidden-record recovery UI yet.

### Cancel

Keep cancel behavior:

- confirmation dialog
- cancelled row remains visible when `include_cancelled=true`
- cancel action hidden for already-cancelled rows

## Non Goals

- Hard delete.
- Full trash/recovery view.
- Analytics split.
- Map-image UI.
- Lounge MMR sync.

## Verification

Run:

```text
npm run typecheck
npm run build
```

Manual/browser check if feasible:

- Select a ranked session and edit placement/result VR.
- Select a Lounge session and edit placement/score.
- Memo edit still works.
- Cancel still works.
- Hide action removes a race from default selected race list.
- Date/source/status filters still work.
- 375px viewport has no horizontal overflow.
- Console has no React/JavaScript errors.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Verification results
- Blocked checks
- Any temporary files/screenshots created and removed
- Design questions for Codex

