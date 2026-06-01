Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
If verification would require repository source edits, stop and ask before editing.

## Goal

Verify the stream rate overlay on the Raspberry Pi deployment and in an OBS/browser-source-like viewport.

This is verification-only. Do not change application code, Docker files, deployment files, database schema, seed data, or documentation unless Codex explicitly asks for a follow-up fix.

## Background

The stream overlay implementation was committed as:

```text
b7e2099 Add stream rate overlay
```

The overlay is a frontend-only view selected by URL query parameters:

- `/?view=overlay&mode=vr`
- `/?view=overlay&mode=mmr`
- `/?view=overlay&mode=auto`

Expected Pi frontend:

```text
http://192.168.1.205:3030
```

Expected backend:

```text
http://192.168.1.205:8001
```

Relevant behavior to verify:

- VR overlay shows the active VR account `current_vr`.
- MMR overlay shows current Lounge MMR from Settings based on `settings.lounge_game`.
- Auto mode shows MMR when an active Lounge session exists, ranked VR when an active ranked session exists, otherwise VR.
- Values refresh by polling, without manual browser reload.
- Transparent overlay mode works for OBS-style browser capture; `bg=solid` gives a readable fallback.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/user-guide.md`
- `docs/design/operations.md`
- `frontend/src/RateOverlayView.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `deploy/portainer-stack.yml`

## Files To Edit

None.

This handoff is read-only verification. If a bug is found, report it with exact reproduction steps and proposed fix scope instead of editing.

## Constraints

- Do not run destructive database cleanup.
- Do not reset volumes or delete user records.
- Do not change Portainer stack configuration.
- Do not change Cloudflare Tunnel or external exposure.
- Do not trigger unnecessary Lounge MMR sync repeatedly. One manual sync is acceptable only if needed and the user is okay with using the current Lounge settings.
- Do not commit.
- Treat any unrelated local diffs as user-owned.

## Verification

### 1. Deployment/Health

Confirm the Pi deployment is serving the current frontend after the implementation commit is deployed.

Check:

```text
GET http://192.168.1.205:3030/api/v1/health
GET http://192.168.1.205:8001/api/v1/health
```

Expected: both return backend health OK through direct backend and frontend proxy.

If the Pi has not yet been redeployed with commit `b7e2099`, report that overlay verification is blocked until redeploy.

### 2. Overlay URL Rendering

Open these URLs in a browser:

```text
http://192.168.1.205:3030/?view=overlay&mode=vr
http://192.168.1.205:3030/?view=overlay&mode=mmr
http://192.168.1.205:3030/?view=overlay&mode=auto
http://192.168.1.205:3030/?view=overlay&mode=vr&compact=1
http://192.168.1.205:3030/?view=overlay&mode=mmr&bg=solid
```

Expected:

- Normal header/nav/main app chrome is absent.
- VR mode shows active account name, numeric VR, and `VR`.
- MMR mode shows `Lounge MMR`, a `12p` or `24p` badge, and numeric MMR or a clear unsynced empty state.
- Auto mode does not crash and chooses the expected current source from active sessions.
- `compact=1` hides mode buttons.
- `bg=solid` adds the solid/transparent dark background.

### 3. Normal App Regression Check

Open:

```text
http://192.168.1.205:3030
```

Expected:

- Existing app shell, header, nav, and tabs still render.
- Dashboard, Playing, VR, Lounge, Records, and Settings still load enough to confirm no overlay-mode leakage.

### 4. VR Freshness

Use a safe manual VR update path:

1. Open the VR overlay in one browser window.
2. In the normal app Settings view, edit the active VR account current VR by a small known value.
3. Confirm the overlay updates within about 2 seconds without reload.
4. Restore the VR value if the edit was only for verification.

Alternative if the user is actively recording ranked races:

- Complete a ranked race with a result VR and confirm the overlay updates after saving.

Expected: overlay value follows `VrAccount.current_vr`.

### 5. MMR Freshness

Use the least disruptive available path:

- If Lounge MMR is already synced, confirm MMR overlay displays the same current MMR shown in the normal Lounge/Dashboard UI.
- If the user approves a live sync check, run one manual Lounge MMR sync from the normal Lounge UI and confirm the overlay updates within about 2 seconds after sync succeeds.
- If a Lounge session is naturally completed with auto-sync enabled during testing, confirm the overlay updates after auto-sync succeeds.

Expected: overlay value follows `settings.lounge_mmr_12p` or `settings.lounge_mmr_24p` according to `settings.lounge_game`.

### 6. OBS-Style Viewport

Check the overlay in browser/devtools responsive sizes:

```text
320 x 120
480 x 160
```

Expected:

- Text is readable.
- No clipping of value, label, mode controls, or stale indicator.
- Transparent mode does not show the normal app background.
- `bg=solid` remains readable over light and dark page/background tests.

If OBS is available, add it as a browser source and verify the same URLs. OBS verification is useful but not required if browser viewport checks pass and OBS is not available.

### 7. Failure/Stale State

If safe to simulate without disrupting the running app, briefly test a backend-unavailable or bad-proxy condition. If not safe, skip this step and report it as not tested.

Expected:

- Overlay keeps the last known value.
- A small disconnected/stale indicator appears.
- No React crash or blank page.

## Expected Report

- Environment verified: Pi deployed commit/image status if known
- Changed files: should be none
- Verification results by section
- Any blocked checks and why
- Screenshots or viewport notes if available
- Bugs found with exact URL, steps, expected behavior, actual behavior
- Design questions for Codex
