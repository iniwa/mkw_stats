Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add a lightweight Lounge MMR trend panel to the existing Lounge view.

The tool already stores synced session-level MMR values on `PlaySession`:

- `lounge_mmr_before`
- `lounge_mmr_after`
- `lounge_mmr_delta`
- `lounge_mmr_table_id`
- `lounge_mmr_synced_at`
- `lounge_mmr_game`

Use those existing fields to show recent 12p and 24p MMR movement. Do not add backend APIs or database columns in this slice.

## Background

The Lounge MMR sync foundation is implemented and verified. The Lounge view currently shows current/latest MMR-style summary values, but it does not yet show movement over time.

The user has confirmed that 12p and 24p MMR are separate. The UI should keep those streams visually distinct.

This is a small frontend-only step before considering automatic sync or deeper Lounge analytics.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/ui-redesign-roadmap.md`
- `frontend/src/LoungeView.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`

## Files To Edit

- `frontend/src/LoungeView.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

Do not edit backend files.

## Required Behavior

Add a new panel in `LoungeView` near the existing MMR panel.

Panel title:

- `MMR 推移`

Data source:

- Use the already loaded `sessions` array.
- Include only Lounge sessions where:
  - `lounge_mmr_after != null`
  - `lounge_mmr_game` is either `mkworld` or `mkworld24p`
- Sort chronologically by `completed_at ?? started_at` ascending for charting.
- Display the most recent synced sessions if there are many. Suggested cap: last 20 points per stream.

Visual:

- Implement a simple inline SVG line chart or CSS chart. Do not add chart libraries.
- Show two separate streams:
  - 12p: `lounge_mmr_game === "mkworld"`
  - 24p: `lounge_mmr_game === "mkworld24p"`
- Use distinct non-confusing colors. Avoid relying on color alone; include text labels/legend.
- Show an empty state if there are no synced MMR sessions:
  - `同期済みのMMR履歴がありません`

Chart requirements:

- Use stable dimensions with responsive constraints.
- No horizontal overflow at 375px width.
- Handle one-point streams without broken paths.
- Handle equal min/max MMR values without division by zero.
- Do not show thousands of tick labels; keep the display compact.

Supplemental list:

- Under the chart, show a compact list of the latest synced sessions, newest first, up to 6 rows.
- Each row should include:
  - date/time
  - 12p or 24p label
  - `before -> after`
  - signed delta, e.g. `+24` or `-18`
- Use existing `fmtTime()` if suitable.

MMR panel summary:

- Keep the existing manual `MMR同期` button and summary panel behavior.
- Do not change sync API calls.
- Do not change Settings.

## Constraints

- Frontend-only implementation.
- No new dependencies.
- No backend/API/schema/migration changes.
- Do not change MMR matching rules.
- Do not change `lounge_game` settings behavior.
- Do not make this a full Lounge Analytics page.
- Do not create screenshot files in the repo.
- Keep existing Lounge panels working:
  - Lounge summary
  - MMR sync button
  - active sessions
  - recent sessions
  - warnings
  - top targets

## Non Goals

- No automatic/background MMR sync.
- No per-player table detail view.
- No score/placement trend graph.
- No route/course usage redesign.
- No new navigation tab.

## Verification

Run from repo root:

```powershell
cd frontend
npm run typecheck
npm run build
```

Browser/manual verification:

- Lounge loads with existing data.
- If synced MMR sessions exist, `MMR 推移` chart appears.
- 12p and 24p streams are labeled separately.
- Latest synced list shows newest rows first with signed deltas.
- If no synced MMR sessions exist, empty state appears without crashing.
- `MMR同期` button still works and, after a successful sync, the panel refreshes.
- 375px width has no horizontal overflow.
- Browser console has no JavaScript/React errors.

If local backend is unavailable, use typecheck/build and report browser checks as blocked. Do not modify `vite.config.ts` permanently.

## Expected Report

- Changed files
- Summary
- Verification results
- Blocked checks
- Screenshots/temp files created and removed, if any
- Design questions for Codex
