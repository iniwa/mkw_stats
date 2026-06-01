Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Show the current Lounge total score while recording a Lounge session in Playing.

The user wants to see the running total during a Lounge match. This should help during manual entry without changing backend behavior.

## Background

`issues.md` currently includes:

- `Playing > Lounge`
- `現在の合計スコアを表示してほしい`

Relevant current behavior:

- `frontend/src/PlayingView.tsx` stores completed races in `recordedRaces`.
- `recordedRaces` is refreshed from `api.getSessionRaces(session.id)` after each completed race.
- `LoungeResultForm` currently has the current draft race score input, but it does not know the already-recorded total.
- `SessionSidebar` already displays Lounge progress and race history. Each recorded race may show `score` as `Npt`.

## Files To Inspect

- `issues.md`
- `frontend/src/PlayingView.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `frontend/src/PlayingView.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`
- `issues.md`

## Constraints

- Frontend-only change. Do not change backend APIs or schemas.
- Do not alter Lounge score auto-fill behavior.
- Do not alter save payloads or completion behavior.
- Count only completed Lounge race scores that are already in `recordedRaces`.
- Ignore missing/null scores in the total.
- Keep the display responsive at 375px width.
- Mark only this `issues.md` item complete after implementation.

## Required Behavior

In a Lounge session:

- Show the current total score from completed recorded races.
- Show the total in the session sidebar near the existing `Race X / 12` progress.
- While entering a result in `LoungeResultForm`, show:
  - current total before saving the draft race
  - current input score
  - projected total after saving

Example display text can be Japanese and concise, such as:

- `合計スコア: 42pt`
- `保存後: 50pt`

For non-Lounge sessions:

- Do not show Lounge score totals.

For completed/finished sessions:

- No special new behavior is required beyond whatever `SessionSidebar` already shows when present.

## Suggested Implementation

In `PlayingView.tsx`:

- Add a helper to sum completed Lounge scores, for example:

```ts
const loungeScoreTotal = (races: RaceRecord[]): number =>
  races.reduce((sum, race) => sum + (race.status === 'completed' && race.score != null ? race.score : 0), 0)
```

- Compute `const currentLoungeScore = session?.source === 'lounge' ? loungeScoreTotal(recordedRaces) : 0`.
- Pass the total to:
  - `LoungeResultForm`
  - `SessionSidebar`

In `LoungeResultForm`:

- Add a `currentTotalScore` prop.
- Display current total, current race score, and projected total (`currentTotalScore + score`) near the score input.

In `SessionSidebar`:

- Add an optional/current total prop.
- Display it only for `session.source === 'lounge'`.

CSS:

- Use existing compact panel/sidebar styles where possible.
- Add a small class only if needed, e.g. `.sidebar__score-total` or `.result__score-total`.

## Verification

Run:

```text
npm run typecheck
npm run build
```

Manual/static checks:

- Confirm a Lounge session with no completed races shows `0pt`.
- Confirm completed Lounge races with scores sum correctly.
- Confirm a Lounge result form updates projected total when the score stepper/input changes.
- Confirm Ranked sessions do not show Lounge score totals.
- Confirm no 375px horizontal overflow is introduced.

## Expected Report

- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
