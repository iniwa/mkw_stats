Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, and this handoff file before implementation.
This handoff is ready for implementation after Codex review of the result-model, Playing-flow, and Records correction implementations.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Split the current analytics behavior into clearer VR and Lounge analytics surfaces using the new numeric result model.

This slice should reduce overlap between Analytics and Lounge while keeping implementation lightweight.

## Background

Depends on:

- `docs/design/ui-redesign-roadmap.md`
- `docs/handoffs/archive/2026-05-25-result-model-redesign.md`
- `docs/handoffs/archive/2026-05-25-playing-flow-redesign.md`
- `docs/handoffs/archive/2026-05-25-records-correction-ui.md`

The current Analytics and Lounge views overlap. Long term:

- VR Analytics focuses on ranked VR.
- Lounge Analytics focuses on Lounge score/MMR/match behavior.
- Lounge overview remains an operational recent-match page.

Current implementation assumptions:

- ranked records have numeric `placement`, `rating_before`, `rating_after`, and `rating_delta`.
- Lounge records have numeric `placement` and `score`.
- hidden records are excluded by default from `getSessionRaces`.
- Records can hide mistaken records; do not add hidden-record recovery here.

## Files To Inspect

- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`

## Files To Edit

- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.tsx` only if navigation labels/routes need adjustment
- `frontend/src/App.css`
- `frontend/src/api.ts` only if type gaps are found

Do not add backend endpoints unless Codex explicitly re-scopes the task.

## Constraints

- No charting library in this slice.
- Use simple CSS/HTML summaries and lightweight inline visual elements.
- Do not implement Lounge API/MMR sync.
- Do not implement map/image work.
- Hidden race records should be excluded by default.
- Cancelled race records should not count toward normal performance metrics unless explicitly labeled as cancelled/ignored.

## Required Behavior

### VR Analytics

The existing Analytics view should become clearly ranked-focused, or create an internal section labeled VR Analytics.

Show:

- ranked session count
- ranked race count
- current active VR account and current VR when available
- total / average / best / worst VR delta
- placement distribution using numeric placement
- top-course or route usage for ranked races
- recent ranked sessions

If graphing is simple without a dependency, a CSS-only or table-based trend is acceptable. Do not introduce a chart library.

### Lounge Analytics

The Lounge view should stop duplicating broad generic analytics and should focus on Lounge-specific summaries.

Show:

- Lounge session count
- completed Lounge race count
- average placement
- average score
- warning count by flag
- most-used targets
- recent Lounge sessions

MMR panels may be placeholders only if no MMR data exists yet. Label them clearly as unavailable/not synced rather than inventing values.

### Date Filter

Keep existing date filters where present.

Date filtering should continue to affect the displayed aggregate numbers.

## Non Goals

- MMR sync implementation.
- Real graphing library.
- Backend aggregation endpoints.
- Course win-rate if the result data cannot support it yet.

## Verification

Run:

```text
npm run typecheck
npm run build
```

Manual/browser check if feasible:

- Analytics displays ranked-only metrics.
- Lounge displays Lounge-only metrics.
- date filters still work.
- hidden/cancelled records do not distort primary metrics.
- all main views render.
- 375px viewport has no horizontal overflow.
- console has no React/JavaScript errors.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
