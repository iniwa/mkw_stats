Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Allow Ranked/VR player count to be entered earlier on the course confirmation step in Playing.

The final ranked result form should still be the authoritative confirmation, but the user wants to pre-fill the match player count after selecting a target and before pressing `結果を入力する`.

## Background

`issues.md` currently includes:

- `Playing > VR`
- `マッチング人数はマップ選択完了後の「プレイ中表示」の時にも入力できるようにしたい`
- Note: after course decision, the course confirmation screen should allow player count input as pre-input; the current result input screen remains the final confirmation.

Current behavior:

- `SelectionConfirm` shows the selected target, notes, annotations, and buttons.
- `RankedResultForm` owns its own `playerCount` state initialized from `defaultPlayerCount`.
- `CompleteRankedBody` sends `player_count` only when saving the ranked result.
- There is no backend requirement for player count at draft creation time.

## Files To Inspect

- `issues.md`
- `frontend/src/PlayingView.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `frontend/src/PlayingView.tsx`
- `frontend/src/App.css` if needed for compact layout
- `docs/design/ui-redesign-roadmap.md`
- `issues.md`

## Constraints

- Frontend-only change.
- Do not change backend APIs, schemas, database, or `CompleteRankedBody`.
- Do not send player count when drafting a race.
- Do not remove the player count control from `RankedResultForm`.
- The result form remains the final confirmation and can still change the player count.
- Show the pre-input only for ranked sessions, not Lounge sessions.
- Preserve the existing `SelectionConfirm` notes/annotations/TargetAssist behavior.
- Keep 375px layout free of horizontal overflow.
- Mark only this `issues.md` item complete after implementation.

## Required Behavior

During a ranked session:

- After selecting a course/route, the confirmation screen should show a player count control.
- The user can set the player count before pressing `結果を入力する`.
- When the result form opens, its initial player count should match the pre-input value.
- The result form can still change the player count before saving.

During a Lounge session:

- The confirmation screen should not show the ranked player count pre-input.
- Existing Lounge result behavior should remain unchanged.

Reset/resume behavior:

- Starting or leaving a session should reset the pre-input to a reasonable default, preferably 12.
- Resuming a ranked session should initialize the pre-input from `session.player_count` if present, otherwise 12.

## Suggested Implementation

In `PlayingView.tsx`:

- Add parent state such as:

```ts
const [rankedPlayerCountDraft, setRankedPlayerCountDraft] = useState(12)
```

- Reset it in `resetSessionState()`.
- When resuming a ranked session, initialize it from `target.player_count ?? 12`.
- Pass these props to `SelectionConfirm`:
  - `source={session.source}`
  - `rankedPlayerCount={rankedPlayerCountDraft}`
  - `onRankedPlayerCountChange={setRankedPlayerCountDraft}`
- Pass `defaultPlayerCount={rankedPlayerCountDraft}` to `RankedResultForm` instead of `session.player_count ?? 12`.

In `SelectionConfirm`:

- Render a compact participant count control only when `source === 'ranked'`.
- The control can reuse the existing stepper pattern from `RankedResultForm`.
- Clamp to 1..24.
- Add concise helper text such as:
  - `結果入力画面でも変更できます。`

CSS:

- Prefer existing `.field`, `.stepper`, `.hint` styles.
- Add CSS only if the confirmation screen needs spacing.

## Verification

Run:

```text
npm run typecheck
npm run build
```

Manual/static checks:

- Ranked flow: select target -> confirmation screen shows player count.
- Change the player count on confirmation -> result form opens with the same initial value.
- Change the player count again in result form -> save payload still uses the result form value.
- Lounge confirmation screen does not show the ranked player count control.
- 375px layout has no horizontal overflow.

## Expected Report

- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
