Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Enhance VR Analytics with:

1. A ranked VR change/trend panel.
2. Course/route target stats that include pick rate and average placement.

This addresses the remaining `issues.md` Analytics/Lounge items:

- `VRにもレート変動が欲しい`
- `コース毎のピック率･平均順位等は出せるか？`

Do not mark those issues complete unless this implementation and verification pass.

## Background

`frontend/src/AnalyticsView.tsx` is already ranked-only:

- `api.getSessions({ source: 'ranked', ... })`
- all session races fetched with `api.getSessionRaces(s.id, true)`
- current panels include Ranked summary, VR delta metrics, placement distribution, top targets by count, and recent sessions.

The current "VR デルタ" panel is useful but not a trend. The top target list counts picks but does not show pick rate or average placement.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `issues.md`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx` for the existing SVG MMR trend pattern
- `frontend/src/App.css`
- `frontend/src/api.ts`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `frontend/src/AnalyticsView.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`
- `issues.md`

## Required Behavior

### VR Trend Panel

Add a new panel in `AnalyticsView.tsx`, near the existing VR delta panel, titled for example:

```text
VR 推移
```

Use completed ranked races with `rating_after != null`.

Show:

- An inline SVG trend chart using the chronological order of completed ranked races.
- Plot `rating_after` as the y-value.
- Include at least:
  - start VR
  - latest VR
  - min / max range, or labels that make the trend understandable
- Handle safely:
  - 0 points: show compact empty state.
  - 1 point: show a single point/flat display without NaN layout.
  - identical min/max values.
- Keep the chart responsive and non-overflowing at 375px width.

Implementation can follow the `MmrTrendChart` pattern in `frontend/src/LoungeView.tsx`, but keep this local to `AnalyticsView.tsx`.

### Target Stats Panel

Replace or extend the current "よく使うコース/ルート（上位8件）" panel.

For each target, compute from ranked non-cancelled races:

- target type: course / route
- display name
- pick count
- pick rate: `count / validTargetRaceCount * 100`
- completed count
- average placement from completed races with `placement != null`
- average VR delta from completed races with `rating_delta != null`

Sort default:

1. pick count desc
2. average placement asc when both exist
3. display name asc

Show top 10 entries.

Use concise columns/rows that still fit mobile. Example labels:

- `回数`
- `ピック率`
- `平均順位`
- `平均VR`

If there are no valid targets, keep a compact `データなし` empty state.

### Issues Update

After verification passes:

- Mark `VRにもレート変動が欲しい` as completed.
- Mark `コース毎のピック率･平均順位等は出せるか？` as completed.
- Add short sub-bullets if useful, but keep `issues.md` concise.

## Constraints

- Frontend only.
- No backend/API/schema changes.
- No new npm dependencies.
- Do not change Lounge MMR chart behavior.
- Do not change Records/Playing behavior.
- Do not rename routes or nav labels in this slice.
- Do not fetch more than the already loaded ranked sessions/races.
- Keep all calculations client-side from the existing `sessions` and `allRaces`.
- Keep 375px layout clean; no horizontal scrolling.

## Non Goals

- Per-date aggregation beyond the existing date filter.
- Exporting analytics.
- Chart library adoption.
- Backend analytics endpoints.
- Pi deployment or live Pi verification.
- Course image/icon work.

## Verification

Run from `frontend/`:

```bash
npm run typecheck
npm run build
```

If browser verification is available:

- Analytics with no ranked sessions: no crash, sensible empty states.
- Analytics with at least one ranked race: VR trend panel appears.
- Target stats show pick count, pick rate, average placement, and average VR.
- 375px width: no horizontal overflow.
- Console: no JS/React errors.

## Expected Report

- Changed files
- Summary
- Trend chart behavior
- Target stats calculation rules
- Verification results
- Blocked checks
- Design questions for Codex
