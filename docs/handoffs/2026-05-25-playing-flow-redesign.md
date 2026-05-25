Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, and this handoff file before implementation.
Queued handoff: do not implement until Codex has reviewed the result-model redesign implementation and explicitly says this handoff is ready.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Redesign the Playing view around the new three-step flow:

1. Select target course or route.
2. Review play assist information.
3. Record the result.

This slice should focus on the user-facing Playing workflow after the result data model has been updated.

## Background

Depends on:

- `docs/handoffs/2026-05-25-result-model-redesign.md`
- `docs/design/ui-redesign-roadmap.md`

Expected prior state:

- Ranked races use numeric `placement` and `rating_after`.
- Lounge races use numeric `placement` and `score`.
- Lounge course selection creates a draft race and requires result completion.
- `TargetAssist` already exists and should be reused.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/ui-redesign-roadmap.md`
- `frontend/src/PlayingView.tsx`
- `frontend/src/TargetAssist.tsx`
- `frontend/src/RouteDetail.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`

## Files To Edit

- `frontend/src/PlayingView.tsx`
- `frontend/src/TargetAssist.tsx` only if the assist layout needs small improvements
- `frontend/src/App.css`
- `frontend/src/api.ts` only if the previous result-model slice left minor type gaps

Do not edit backend files in this slice unless Codex has explicitly re-scoped it.

## Constraints

- Preserve the current searchable map-point picker as the functional target selector.
- Do not implement map-image selection yet.
- Do not implement advanced annotation editing.
- Do not implement Lounge MMR sync.
- Do not add new frontend dependencies.
- Keep UI practical and usable on 375px width.
- Do not show normal ranked memo input in Playing.
- Preserve existing session resume, undo, finish, and warning behavior.

## Required UI Behavior

### Overall flow

Playing should read as a stable three-step workflow:

- Target
- Assist
- Result

The exact visual treatment can follow the current design language, but the user should understand where they are in the flow.

### Target selection

Keep the existing searchable picker behavior:

- select start map point
- select destination map point
- support same-point normal course selection
- support route selection
- support swap and same-as-start controls

Improve only if needed for clarity. Do not rebuild this as an image picker.

### Assist review

After resolving the target, show:

- target type: normal course or route
- target display name
- route detail when target is route
- `TargetAssist` for course/route notes and annotations
- clear actions to choose again or continue to result input

The assist step should not immediately record a result.

### Ranked result input

Result form should ask for:

- player count numeric input
- placement numeric input
- result VR (`rating_after`) numeric input

Show:

- current/before VR
- calculated delta preview
- validation hints when placement is outside `1..player_count`

On save:

- call the ranked completion API from the result-model slice
- refresh VR accounts and race history
- return to target selection

### Lounge result input

Result form should ask for:

- placement numeric input
- score numeric input

Show:

- target name
- warning flags from draft, if any
- `TargetAssist`

On save:

- call the Lounge completion API from the result-model slice
- refresh race history and session state
- return to target selection unless the backend completed the session after race 12

### Resume

If resuming a session with a draft:

- ranked draft returns to ranked result form
- Lounge draft returns to Lounge result form
- completed history is restored from the API

## Non Goals

- Map-image selection.
- Course icon history display.
- Records editing.
- Analytics changes.
- MMR sync.

## Verification

Run:

```text
npm run typecheck
npm run build
```

Manual/browser check if feasible:

- Ranked: select course, review assist, enter player count/placement/result VR, save.
- Lounge: select course/route, review assist/warnings, enter placement/score, save.
- Resume ranked draft returns to ranked result form.
- Resume Lounge draft returns to Lounge result form.
- Undo still cancels the latest draft/completed race.
- Finish still works.
- 375px viewport has no horizontal overflow.
- Console has no React/JavaScript errors.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Verification results
- Blocked checks
- Screenshots/temp files created and removed
- Design questions for Codex

