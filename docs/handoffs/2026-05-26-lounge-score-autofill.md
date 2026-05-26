Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add Lounge score auto-fill in the Playing result form.

When the user enters or changes Lounge placement, the score field should automatically update from a Mario Kart World placement score table. The user must still be able to manually override the score.

## Background

Current behavior:

- Lounge race result input is in `frontend/src/PlayingView.tsx` (`LoungeResultForm`).
- The form currently asks for numeric `placement` and numeric `score`.
- Score defaults to `0`.
- The backend already accepts `CompleteLoungeBody { placement, score }`.
- Records and Lounge analytics already read `race.score`.

User issue:

```text
Lounge:
- 順位を入れてもスコアが自動入力されない
```

Use the Mario Kart World point spread as the auto-fill table:

```text
1: 15
2: 12
3: 10
4: 9
5: 9
6: 8
7: 8
8: 7
9: 7
10: 6
11: 6
12: 6
13: 5
14: 5
15: 5
16: 4
17: 4
18: 4
19: 3
20: 3
21: 3
22: 2
23: 2
24: 1
```

Reference checked by Codex:

- `https://www.mariowiki.com/Mario_Kart_World`
- The page documents the Mario Kart World point spread for 1st through 24th place.

This auto-fill is a convenience default only. It must not prevent manual score correction.

`issues.md` is now tracked as the project backlog scratch list. It may be updated only if the implemented item is completed.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `issues.md`
- `frontend/src/PlayingView.tsx`
- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `frontend/src/PlayingView.tsx`
- `frontend/src/App.css` if a small hint/style is needed
- `docs/design/ui-redesign-roadmap.md`
- `issues.md`

Do not edit backend files unless type definitions show an unavoidable mismatch. No backend behavior should be needed.

## Required Work

### 1. Add A Local Score Table Helper

In `PlayingView.tsx`, add a small helper near the Lounge form or shared constants:

- map placement `1..24` to the score table above
- return `null` for unsupported placements

Keep it frontend-only.

### 2. Auto-Fill Score On Placement Change

Update `LoungeResultForm`:

- score should initialize from the current placement default (`placement = 1` -> `score = 15`)
- when placement changes through the numeric input, update score to the table value for that placement
- clamp or validate placement against `session.player_count` as the existing form does
- if placement is unsupported or outside the table, do not crash; keep score editable

### 3. Preserve Manual Override

Manual score edits must still work.

Expected behavior:

- user enters placement `1` -> score becomes `15`
- user enters placement `5` -> score becomes `9`
- user manually changes score to `8` -> score input shows `8`
- if user changes placement again to `6`, score should update to `8` from the table

This means the score is not permanently detached after manual edit. Placement changes intentionally recalculate the suggested score.

### 4. Add Clear UI Hint

Add a compact hint near the score input, for example:

```text
順位から自動入力されます。必要なら修正できます。
```

Reuse existing hint styles if possible. Add CSS only if needed.

### 5. Update Docs / Issues

Update `docs/design/ui-redesign-roadmap.md` to record this slice under completed Lounge/Playing foundation once implemented.

Update `issues.md`:

- mark the Lounge score auto-fill item as completed only after implementation and verification pass

## Constraints

- Do not add backend/API changes.
- Do not add database changes.
- Do not add npm dependencies.
- Do not remove manual score editing.
- Do not change Lounge MMR sync behavior.
- Do not change Records/Lounge analytics aggregation.
- Do not change ranked flow.
- Do not alter route/course image assets.
- Do not commit or push unless explicitly requested.

## Non Goals

- No team scoring logic beyond the placement-to-score convenience default.
- No score table settings UI.
- No format-specific score table customization.
- No backend validation of score table.
- No Pi deployment.
- No full Lounge 12-race regression unless it is cheap.

## Verification

Run:

- `npm run typecheck`
- `npm run build`

Browser verification:

- Start a Lounge session.
- Select any course/route target.
- Reach Lounge result form.
- Confirm default placement `1` sets score `15`.
- Change placement to `5`; score becomes `9`.
- Manually edit score; value changes.
- Change placement again; score recalculates from table.
- Save a Lounge result and confirm race history shows placement/score.
- Confirm ranked flow is unchanged at a smoke level.

At 375px:

- Lounge result form has no horizontal overflow.

Console:

- no JavaScript/React errors.

If temporary play data is created, finish sessions and clean up when possible. Report any residual data.

## Expected Report

- Changed files
- Summary
- Score table behavior
- Verification results
- Browser results
- 375px results
- Console/network errors
- Any temporary data created and cleanup result
- Blocked checks
- Design questions for Codex
