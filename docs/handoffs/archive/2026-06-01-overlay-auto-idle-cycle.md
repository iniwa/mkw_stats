Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Change the stream rate overlay `mode=auto` fallback behavior.

Current behavior:

- active Lounge session -> MMR
- active ranked session -> VR
- no active sessions -> VR

Required behavior:

- active Lounge session -> MMR
- active ranked session -> VR
- no active sessions -> alternate between VR and MMR slowly

Use a slightly slow switching speed. Recommended interval: 8 seconds per value.

## Background

The stream overlay is implemented in:

- `frontend/src/RateOverlayView.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`

The Settings URL section includes:

- `/?view=overlay&mode=auto&compact=1`

The current `resolveDisplay(mode, activeSessions)` in `RateOverlayView.tsx` returns `vr` when no active sessions exist. The user wants auto mode to be more useful on stream standby screens by showing both current VR and Lounge MMR when nothing is actively being recorded.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `frontend/src/RateOverlayView.tsx`
- `frontend/src/SettingsView.tsx`
- `frontend/src/App.css`
- `docs/design/user-guide.md`

## Files To Edit

- `frontend/src/RateOverlayView.tsx`
- `docs/design/user-guide.md` if the auto-mode explanation should be synchronized

Do not edit backend files.
Do not edit Docker/deploy files.
Do not change the Settings overlay URL list unless the implementation makes its wording inaccurate.

## Required Behavior

### Auto Mode Priority

Keep this priority order:

1. If there is any active Lounge session, show MMR.
2. Else if there is any active ranked session, show VR.
3. Else, show VR and MMR alternately.

If both Lounge and ranked sessions are active, Lounge/MMR still wins.

### Idle Alternation

When `mode === 'auto'` and there are no active sessions:

- alternate between `vr` and `mmr`
- switch slowly; use about 8 seconds per displayed value
- start with VR on initial load
- keep the existing 2-second data polling behavior
- do not reset the displayed value every time polling succeeds unless necessary
- avoid layout jumps beyond the existing VR/MMR content differences

Recommended implementation shape:

- Add local state such as `idleAutoDisplay` with initial value `vr`.
- Add a `useEffect` that only runs an interval when:
  - `mode === 'auto'`
  - no active Lounge session exists
  - no active ranked session exists
- Clear the interval when the mode changes or an active session appears.
- Update display resolution to use this idle value only for the no-active-session auto case.

Do not rely on wall-clock math in render if a small state/interval is clearer.

### Manual Modes

Do not change:

- `mode=vr`
- `mode=mmr`
- compact mode
- `bg=solid`
- copy URLs in Settings

### Empty Values

If MMR is selected during idle alternation but MMR is not synced yet, keep the existing `MMR --` empty state.
If VR is selected but no active account exists, keep the existing `VR --` empty state.

## Constraints

- Frontend-only.
- No new dependencies.
- No backend/API/database changes.
- Do not change MMR sync behavior.
- Do not trigger syncing from the overlay.
- Do not change `VrAccount.current_vr` semantics.
- Keep ranked VR and Lounge MMR separate.
- Keep Japanese UI labels readable. Do not introduce mojibake strings.

## Non Goals

- User-configurable cycle speed.
- New URL query parameter for cycle speed.
- Animation/fade effects.
- Stream scene automation.
- OBS plugin integration.
- New Settings controls.

## Verification

Run from `frontend/`:

```text
npm run typecheck
npm run build
```

Manual verification:

1. Open `/?view=overlay&mode=auto&compact=1`.
2. With no active sessions, confirm the display starts on VR.
3. With no active sessions, confirm the display switches to MMR after about 8 seconds.
4. Confirm it switches back to VR after another interval.
5. Confirm data still refreshes through the existing polling.
6. Start or simulate an active Lounge session and confirm auto mode stays on MMR instead of cycling.
7. Start or simulate an active ranked session with no active Lounge session and confirm auto mode stays on VR instead of cycling.
8. Confirm `mode=vr` and `mode=mmr` still do not cycle.

If active session states cannot be created locally, state which checks were manual/code-inspected only.

## Expected Report

- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
