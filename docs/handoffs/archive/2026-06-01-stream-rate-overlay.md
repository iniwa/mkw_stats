Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add a streaming-friendly overlay view that displays the current ranked VR or current Lounge MMR, with a visible switch between VR and MMR.

The overlay must keep values fresh:

- VR updates should appear shortly after the user records a ranked result VR or edits the active account current VR.
- MMR updates should appear shortly after Lounge MMR sync succeeds, including Playing-driven auto-sync and manual Lounge sync.

## Background

The app is a personal LAN tool intended for Raspberry Pi / Portainer deployment. This feature is for OBS or another streaming browser source on the LAN.

Current data ownership:

- Ranked VR is manual input. Do not assume an official ranked VR API exists.
- `VrAccount.current_vr` is the current display value for VR.
- Completing a ranked race updates `VrAccount.current_vr` in `backend/app/services/race_flow.py`.
- Editing the active VR account in Settings can also update `current_vr`.
- Lounge MMR sync persists current MMR snapshots on `AppSettings` as `lounge_mmr_12p`, `lounge_mmr_24p`, and `lounge_mmr_synced_at`.
- Lounge MMR values are separated from ranked VR. Do not merge MMR into VR fields.

The frontend currently has no router. It can still expose an OBS-friendly view by checking query parameters in `App.tsx`, for example:

- `/?view=overlay`
- `/?view=overlay&mode=vr`
- `/?view=overlay&mode=mmr`

Nginx already falls back to `index.html`, so query-param routing should work in local Vite and deployed frontend containers without nginx changes.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `frontend/src/App.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`
- `frontend/src/DashboardView.tsx`
- `frontend/src/VrView.tsx`
- `frontend/src/LoungeView.tsx`
- `backend/app/services/race_flow.py`
- `backend/app/api/lounge.py`
- `docs/design/user-guide.md`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `frontend/src/App.tsx`
- `frontend/src/api.ts` if a small helper/type is useful
- `frontend/src/App.css`
- `frontend/src/RateOverlayView.tsx` or another clearly named new frontend component
- `docs/design/user-guide.md` only if you add a short user-facing note about the overlay URL

Do not edit backend files unless inspection proves the existing API cannot supply the needed current values. If backend edits are needed, stop and report the proposed endpoint shape before editing.

## Required Behavior

### Overlay Entry

- When the URL query has `view=overlay`, render only the overlay view.
- Hide the normal app header, nav, main layout chrome, health indicator, and tabs in overlay mode.
- Keep the normal app behavior unchanged when `view=overlay` is absent.

Recommended URLs:

- `http://<frontend-host>:3030/?view=overlay&mode=vr`
- `http://<frontend-host>:3030/?view=overlay&mode=mmr`
- `http://<frontend-host>:3030/?view=overlay&mode=auto`

### Display Modes

Provide a compact control in the overlay itself so the user can switch display mode without leaving the overlay.

Supported modes:

- `vr`: show active ranked VR account display name and `current_vr`.
- `mmr`: show Lounge MMR. Prefer the configured/current Lounge game from Settings:
  - if `settings.lounge_game` is `mkworld24p`, show `lounge_mmr_24p`;
  - if `settings.lounge_game` is `mkworld12p` or `mkworld`, show `lounge_mmr_12p`;
  - also show a small 12p/24p label so the stream display is unambiguous.
- `auto`: choose MMR if a Lounge session is active, otherwise choose VR if a ranked session is active, otherwise default to VR.

If query `mode` is missing or invalid, default to `vr`.

### Freshness

- Poll the minimal existing APIs on an interval, recommended every 2 seconds:
  - `GET /api/v1/vr-accounts`
  - `GET /api/v1/settings`
  - `GET /api/v1/play-sessions/active` only if implementing `auto` mode.
- Also refresh once when the overlay mounts.
- Do not call `POST /api/v1/lounge/mmr-sync` from the overlay. The overlay only displays the latest synced values.
- The overlay should tolerate transient API errors without blanking the last known value. Show a small disconnected/stale indicator if the latest poll fails.
- Show a small last-success timestamp such as `Updated HH:mm:ss`.

### Visual Requirements

- Design for OBS browser source with transparent background by default.
- Use high-contrast, readable text and tabular numbers.
- Keep the overlay compact and stable: no layout jumps when values change.
- Avoid decorative background cards that make chroma/alpha composition awkward.
- Do not add large explanatory copy.
- Empty states:
  - VR: if no active VR account exists, show `VR --` and a short readable Japanese equivalent of "active account not configured".
  - MMR: if the selected MMR value is null, show `MMR --` and a short readable Japanese equivalent of "MMR not synced".

### Optional Query Parameters

Implement these only if they stay small and do not complicate the slice:

- `compact=1`: hide the mode switch control after initial setup.
- `bg=solid`: use a subtle solid background for environments where transparent OBS source is hard to read.

If skipped, do not block the core overlay.

## Constraints

- Preserve ranked VR and Lounge MMR separation.
- Do not add websocket/SSE infrastructure for this slice.
- Do not add dependencies.
- Do not change Docker, Portainer, GHCR, ports, or Cloudflare/external exposure behavior.
- Do not change Lounge sync behavior or trigger syncing from the overlay.
- Do not change `VrAccount.current_vr` semantics.
- Do not change Records correction behavior.
- Keep the implementation frontend-only unless a concrete backend gap is found.
- Keep Japanese UI labels readable; do not introduce mojibake strings.

## Non Goals

- Stream scene switching automation.
- OBS plugin integration.
- Public internet exposure.
- Authentication or per-user overlay settings.
- Full overlay customization UI.
- Historical graph display in the overlay.
- New MMR sync sources or ranked VR automation.

## Verification

Run:

```text
npm run typecheck
npm run build
```

from `frontend/`.

Manual verification:

1. Normal app URL without `view=overlay` still shows the existing app shell and tabs.
2. `/?view=overlay&mode=vr` shows only the overlay, active account name, and current VR.
3. Editing the active VR account current VR in Settings, or completing a ranked result VR, updates the overlay within the polling interval.
4. `/?view=overlay&mode=mmr` shows current Lounge MMR from Settings and the selected 12p/24p label.
5. Running manual Lounge MMR sync, or completing a Lounge session with auto-sync enabled, updates the overlay within the polling interval after sync succeeds.
6. API failure or backend unavailable state shows a small stale/disconnected indicator without throwing a React crash.
7. Browser source sized around 320x120 and 480x160 remains readable with no clipping.

If local test data cannot cover VR/MMR changes, report exactly which checks were simulated and which need Pi/manual verification.

## Expected Report

- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
