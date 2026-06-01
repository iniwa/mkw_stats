Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Expose the newly added `lounge_host_note.md` content inside the web app as a practical Lounge host guide.

The UI should make the 12p FFA / 24p FFA difference immediately visible with button-style switching, and should include lightweight host checklists so the page is useful during live Lounge hosting.

## Background

The user added `lounge_host_note.md` at the repository root. It contains notes for hosting Lounge rooms, especially the operational differences between 12p FFA and 24p FFA.

Current app structure:

- `frontend/src/App.tsx` owns the top navigation and view switching.
- `frontend/src/ItemTablesView.tsx` is the newest example of a small standalone reference page.
- `frontend/src/LoungeView.tsx` is for Lounge stats/history and should not become a static guide page.
- `frontend/src/App.css` holds global page/component styles.

Recommended UX:

- Add a standalone navigation tab near `Lounge`, for example `Host`.
- Create a dedicated `LoungeHostGuideView.tsx`.
- Use a segmented/button control for `12p FFA` vs `24p FFA`.
- Keep the page operational, not prose-heavy: summary cards, settings table, warning cards, and checklists.

Important: when Codex read `lounge_host_note.md` through PowerShell, the Japanese appeared mojibake. Before using the note as source text, verify whether the file itself is valid Japanese in your editor/tooling. If the file content is actually corrupted, do not copy mojibake into the UI; stop and report that the note must be re-saved as UTF-8 or replaced with readable Japanese.

## Files To Inspect

- `lounge_host_note.md`
- `frontend/src/App.tsx`
- `frontend/src/ItemTablesView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.css`
- `issues.md`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `frontend/src/LoungeHostGuideView.tsx` (new)
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`
- `issues.md` only if there is a matching unchecked item for this work, or if you add a small completed note under an existing Lounge/host-related section.

Optional only if useful and readable:

- `docs/design/lounge-host-guide.md` (new living design/reference doc distilled from `lounge_host_note.md`)

Do not edit backend files for this slice.

## Constraints

- No new npm dependencies.
- Do not add a markdown renderer dependency.
- Do not fetch external content at runtime.
- Do not make Lounge API or MMR sync changes.
- Do not change existing Lounge session/stat behavior.
- Do not embed unreadable mojibake text. If `lounge_host_note.md` is not readable as Japanese, stop and report that as blocked.
- Keep the guide concise enough for use while hosting. Prefer structured cards/checklists over a long markdown wall.
- Use existing visual patterns where possible: `panel`, `panel__title`, `segmented`, `tag`, `notice`/`hint`-style text, compact grids.
- The UI must fit 375px width without horizontal overflow.
- Use ASCII in source identifiers; Japanese UI text is fine where existing files already use Japanese UI text.

## Required UI Behavior

Add a new top navigation item:

- Label: `Host`
- Place it next to `Lounge` or immediately after `Lounge`.
- It renders `LoungeHostGuideView`.

`LoungeHostGuideView` should include:

1. Header
   - Title: `ラウンジホストガイド`
   - Short description: host checklist / 12p vs 24p confirmation.

2. Mode switch
   - Button-style segmented control with `12p FFA` and `24p FFA`.
   - Default selection: `12p FFA`.
   - Selected mode changes all mode-specific cards below.

3. Mode-specific summary
   - For `12p FFA`:
     - COM: `No COM`
     - Start basis: wait for all 12 players.
     - Missing-player start: not allowed.
     - Invalid race reminder: race started with fewer than 10 players is invalid.
     - Recommended when: first time hosting, safer/easier judgment, small room.
   - For `24p FFA`:
     - COM: `Hard COM`
     - Start basis: normally wait for all 24 players.
     - Missing-player start: may be allowed only under conditions; verify room thread/rules when unsure.
     - Invalid race reminder: race started with fewer than 20 players and missing players across 2+ teams is invalid.
     - Recommended when: familiar with 24p hosting, many participants, comfortable with sub/reopen decisions.

4. Common room settings card
   - Class: `150cc`
   - Teams: `No Teams`
   - Items: `Normal Items`
   - Race Count: `12 Races`
   - Intermission: `10 Seconds`
   - COM row must reflect selected mode (`No COM` for 12p, `Hard COM` for 24p).
   - Visually warn when showing the COM row because 12p/24p mix-up is a high-risk mistake.

5. Checklist cards with local checkbox state
   - At minimum:
     - Before queue: `/ch` is included, host-restricted state is not active, stream/recording screen does not expose Room ID.
     - Before posting Room ID: format/teams are decided, Room ID is uppercase, Room ID is not shared outside participants.
     - Before race start: 150cc, Normal Items, No Teams, 12 Races, 10 Seconds, selected-mode COM, selected-mode start condition.
     - During match: track missing players, track valid connection errors/reopen requests, keep required screenshots/records.
   - Include a small `リセット` button to clear checkboxes.
   - Checkbox state can be component-local only; no persistence is required.

6. Reopen / host handoff quick notes
   - Include a compact warning panel for cases that often require reopen or host replacement:
     - wrong room settings
     - valid connection error before start/restart
     - non-participant entered
     - invalid race condition met
     - room closed
     - required reopen/host handoff denied can lead to penalty

7. Source/reference note
   - Mention that the page is distilled from `lounge_host_note.md`.
   - Do not expose raw file paths as if they are clickable unless the file is actually served by the frontend.

## Styling Requirements

- Add `.host-guide*` classes in `App.css`.
- Keep card radius and density consistent with existing app panels.
- Use responsive grids with `minmax(0, 1fr)` to avoid mobile overflow.
- Do not use nested cards.
- Button labels must not overflow at 375px.

## Non Goals

- No backend changes.
- No database persistence for checklist state.
- No markdown rendering.
- No full rulebook reproduction.
- No Discord bot integration.
- No automatic rule validation against live Lounge state.
- No changes to item table page, course images, route images, or annotations.

## Verification

Run:

- `npm run typecheck`
- `npm run build`
- `git diff --check`

Manual/browser verification if feasible:

- `Host` nav item appears and renders the new page.
- `12p FFA` / `24p FFA` buttons switch COM and start-condition content.
- Checklist boxes can be toggled and reset.
- No JS/React console errors.
- 375px viewport has no horizontal overflow.
- Existing `Lounge`, `Items`, `Playing`, and `Settings` tabs still render.

## Expected Report

- Changed files
- Whether `lounge_host_note.md` was readable as Japanese or blocked by encoding/mojibake
- Summary of Host guide UI and mode-specific behavior
- Verification results
- Blocked checks
- Design questions for Codex
