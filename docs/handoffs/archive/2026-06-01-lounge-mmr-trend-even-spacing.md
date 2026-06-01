Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Change the Lounge MMR trend chart so x-axis spacing is based on match order, not real elapsed time.

The current graph uses actual timestamps for x positions. With a small number of synced Lounge matches, this makes gaps visually inconsistent and confusing. For this personal tool, the main use case is reading MMR progression by match sequence, so points should be evenly spaced in chronological order.

## Background

`issues.md` currently includes:

- `MMR推移の横幅がよくわからない`
- Note: when 3 matches are recorded, the horizontal distance between match 1 -> 2 and 2 -> 3 appears very different.

Current implementation is in `frontend/src/LoungeView.tsx`:

- `buildTrendPoints()` sorts each stream chronologically and limits to `MMR_TREND_LIMIT`.
- `MmrTrendChart()` calculates `allTimes`, `tMin`, `tMax`, `tRange`, and maps `completed_at ?? started_at` into x positions.

That time-based x mapping is the behavior to replace.

## Files To Inspect

- `issues.md`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `frontend/src/LoungeView.tsx`
- `docs/design/ui-redesign-roadmap.md`
- `issues.md`

Only edit `frontend/src/App.css` if a small visual adjustment is required after changing the chart.

## Constraints

- Keep the existing SVG chart approach. Do not introduce a charting library or new dependency.
- Keep 12p and 24p streams visually separate with the existing colors and legend.
- Keep `MMR_TREND_LIMIT`.
- Preserve chronological ordering.
- Use evenly spaced x positions by match sequence.
- Do not change backend APIs or database schema.
- Do not change MMR sync behavior.
- Do not change the history list below the chart.
- Keep the chart responsive at 375px width.
- Mark only the relevant `issues.md` item complete after implementation.

## Required Behavior

For each stream:

- A stream with 0 points is not drawn.
- A stream with 1 point should place that point at the horizontal center of the chart area.
- A stream with 2 or more points should distribute points evenly from left edge to right edge of the chart area.
- The order should remain oldest -> newest.

For two streams:

- 12p and 24p can each use their own evenly spaced sequence. They do not need to align by calendar date.
- The y-axis range should still be calculated from all visible points across both streams, as it is today.

## Suggested Implementation

Inside `MmrTrendChart()`:

- Remove `allTimes`, `tMin`, `tMax`, and `tRange`.
- Replace `tx(iso: string)` with a sequence-based helper, for example:

```ts
const txIndex = (index: number, total: number): number => {
  if (total <= 1) return padL + chartW / 2
  return padL + (index / (total - 1)) * chartW
}
```

- Update `toPoints()` and circle rendering to pass `index` and `pts.length`.

If you choose a different implementation, keep the required behavior above.

## Verification

Run:

```text
npm run typecheck
npm run build
```

Also perform a static/manual check:

- Confirm `MmrTrendChart()` no longer uses real timestamps for x-axis positioning.
- Confirm a 1-point stream is centered.
- Confirm 2+ points are evenly spaced.
- Confirm 12p/24p legend and colors remain.
- Confirm no 375px horizontal overflow is introduced, either by browser check or by explaining why CSS/layout is unchanged and safe.

## Expected Report

- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
