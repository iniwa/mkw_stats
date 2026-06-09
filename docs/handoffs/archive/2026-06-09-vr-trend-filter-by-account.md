Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Make the `VR` tab's `VR 推移` graph show only the completed ranked races that belong to the account currently represented by the VR tab.

When the user changes the active/selected VR account and reloads or revisits the VR tab, the graph must switch to that account's own VR progression instead of connecting races from multiple accounts into one line.

## Background

`frontend/src/VrView.tsx` currently:

- loads recent ranked sessions and their races;
- resolves `activeAccount` from `settings.selected_vr_account_id`, falling back to the account with `is_active`;
- builds `trendRaces` from every completed ranked race with `rating_after != null`;
- does not filter `trendRaces` by `vr_account_id`.

Both `PlaySession` and `RaceRecord` already expose `vr_account_id` in `frontend/src/api.ts`. Ranked race completion assigns the race account from its session, so this task should be solvable with existing frontend data and no API/schema change.

The existing VR tab has other summary, delta, placement, and recent-session sections. The reported issue is specifically that the `VR 推移` graph merges multiple accounts.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `frontend/src/VrView.tsx`
- `frontend/src/api.ts`
- `frontend/src/SettingsView.tsx`
- `docs/design/ui-redesign-roadmap.md`
- `docs/decisions/2026-05-22-settings-ui-scope.md`
- `docs/handoffs/archive/2026-05-26-vr-analytics-trends-targets.md`

## Files To Edit

- `frontend/src/VrView.tsx`

Only edit `frontend/src/App.css` if a small visual adjustment is genuinely required for an account-specific graph empty state. Do not edit other files without stopping and asking first.

## Required Behavior

### Account-Specific VR Trend

- Keep the existing `activeAccount` resolution used by the VR tab unless inspection proves it is incorrect for the current Settings behavior.
- Build the `VR 推移` graph from races that satisfy all of:
  - `status === 'completed'`
  - `rating_after != null`
  - `vr_account_id === activeAccount.id`
- Preserve the existing chronological sort by parent session `started_at`, then `race_no`.
- Changing the active/selected VR account and then loading the VR tab must show only that account's graph points.
- Never connect a point from one VR account to a point from another VR account.

### Empty And Edge States

- If no account can be resolved, do not show a merged all-account graph. Show a compact, understandable empty state.
- If the resolved account has no completed races with `rating_after`, show the existing compact no-data state or a clearer account-specific equivalent.
- Preserve safe rendering for one point and identical min/max values.
- Keep the graph responsive and non-overflowing at 375px width.

### Scope Of Other VR Panels

- Keep the change focused on `VR 推移`.
- Do not change the current behavior of Ranked summary, VR delta, placement distribution, or recent ranked sessions in this task.
- Do not change how `maxVr` / `minVr` are calculated unless it is strictly necessary to prevent the graph fix from producing incorrect or broken UI. If broader account filtering appears necessary, stop and report the design question to Codex before editing.

## Constraints

- Frontend only.
- No backend endpoint, query parameter, schema, migration, or seed changes.
- No new npm dependencies or charting library.
- Use the existing `RaceRecord.vr_account_id`; do not infer account ownership from timestamps, VR values, or display names.
- Preserve ranked VR and Lounge MMR separation.
- Do not change account activation or Settings behavior.
- Do not change Playing, Records, Lounge, Analytics, overlay, navigation, or deployment behavior.
- Keep the existing date and session-limit window semantics. This graph remains based on the ranked sessions already loaded by `VrView`.

## Non Goals

- Filtering every VR-tab metric by account.
- Adding an account picker inside the VR tab.
- Adding a backend `vr_account_id` filter to `GET /api/v1/play-sessions`.
- Recomputing or repairing historical VR values.
- Changing `VrAccount.current_vr` semantics.
- Pi deployment or live production data modification.

## Verification

Run from `frontend/`:

```bash
npm run typecheck
npm run build
```

Inspect the final implementation and confirm:

- `trendRaces` cannot contain a race whose `vr_account_id` differs from the resolved account ID.
- No-account and no-races-for-current-account states do not fall back to an all-account graph.
- Chronological sorting remains unchanged after filtering.

Manual/browser verification if feasible:

1. Prepare or identify two VR accounts, each with completed ranked races and visibly different `rating_after` values.
2. Activate/select account A, load the VR tab, and confirm `VR 推移` contains only account A points.
3. Activate/select account B, reload or revisit the VR tab, and confirm the graph switches to only account B points.
4. Confirm an account with no completed ranked races gets an empty state, not the other account's graph.
5. Confirm one-point and flat-value histories render without errors.
6. Confirm 375px width has no horizontal overflow and the browser console has no React/JavaScript errors.

Do not create or delete real user records solely for verification unless the user explicitly approves it. Report blocked manual checks precisely.

## Expected Report

- Changed files
- Summary
- Exact account-resolution and trend-filter rule used
- Verification results
- Blocked checks
- Design questions for Codex
