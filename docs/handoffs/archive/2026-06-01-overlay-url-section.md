Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add a dedicated in-app section that shows the OBS/browser-source URLs for the stream rate overlay.

The user should not need to remember or hand-build URLs such as:

```text
http://192.168.1.205:3030/?view=overlay&mode=vr&compact=1
```

## Background

The stream overlay was implemented in commit:

```text
b7e2099 Add stream rate overlay
```

The overlay is selected by query parameters:

- `view=overlay`
- `mode=vr`, `mode=mmr`, or `mode=auto`
- optional `compact=1`
- optional `bg=solid`

The current user-facing docs mention overlay URLs in `docs/design/user-guide.md`, but the app itself does not expose a convenient place to copy or inspect them.

The app is LAN-only. Do not add external exposure, Cloudflare Tunnel behavior, auth, or deployment changes.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `frontend/src/SettingsView.tsx`
- `frontend/src/App.css`
- `frontend/src/RateOverlayView.tsx`
- `frontend/src/App.tsx`
- `docs/design/user-guide.md`

## Files To Edit

- `frontend/src/SettingsView.tsx`
- `frontend/src/App.css`
- `docs/design/user-guide.md` if a short note should be synchronized

Do not edit backend files.

## Required Behavior

Add a new panel/section in the normal Settings view titled with readable Japanese equivalent to:

```text
OBS streaming overlay
```

Recommended placement:

- After Lounge settings, because the overlay is operational/configuration guidance rather than play recording.

The section must show at least these URLs:

- VR compact transparent:
  - `/?view=overlay&mode=vr&compact=1`
- VR compact solid background:
  - `/?view=overlay&mode=vr&compact=1&bg=solid`
- Lounge MMR solid background:
  - `/?view=overlay&mode=mmr&compact=1&bg=solid`
- Auto compact transparent:
  - `/?view=overlay&mode=auto&compact=1`

Build each full URL from the current frontend origin at runtime:

```ts
const baseUrl = window.location.origin
```

Do not hardcode `192.168.1.205`, `localhost`, or any PC/Pi host name in frontend code.

### UI Details

For each URL row, show:

- a short readable Japanese label, for example equivalent to `VR / transparent / compact`
- the full URL in a read-only text field or code-like box
- a copy control if it can be implemented without adding dependencies

Copy behavior:

- Prefer `navigator.clipboard.writeText(url)` when available.
- If clipboard write fails or is unavailable, fall back to selecting/focusing the URL text if using an input.
- Show a small readable Japanese success message equivalent to `copied`.
- Do not require clipboard support for the section to be useful.

Add short OBS guidance near the URL list:

- Browser source recommended size: `320 x 120` for compact mode, `480 x 160` for normal mode.
- Use transparent browser source for normal transparent URLs.
- Use `bg=solid` when the overlay is hard to read over gameplay.

Keep the section compact and practical. Avoid long explanatory copy.

## Constraints

- Frontend-only.
- No new dependencies.
- No backend/API/database changes.
- Do not change overlay polling, MMR sync, VR update, or `RateOverlayView` behavior.
- Do not change Docker, Portainer, GHCR, ports, or Cloudflare/external exposure behavior.
- Do not add a new top-level nav item for this small section.
- Keep Japanese UI labels readable. Do not introduce mojibake strings.
- Preserve existing Settings VR account and Lounge settings behavior.

## Non Goals

- Full overlay customization UI.
- Saving overlay preferences.
- OBS plugin integration.
- QR code generation.
- Public internet URLs.
- Auth or tokenized overlay URLs.
- Live preview inside Settings.

## Verification

Run from `frontend/`:

```text
npm run typecheck
npm run build
```

Manual verification:

1. Open Settings in the normal app.
2. Confirm the new OBS overlay URL section appears after Lounge settings.
3. Confirm URLs use the current browser origin, not a hardcoded host.
4. Confirm each listed URL opens the overlay view and hides the normal app chrome.
5. Confirm copy controls work where supported, or the URL text is still selectable when clipboard is unavailable.
6. Confirm existing Settings VR account editing and Lounge settings still render.
7. Confirm no horizontal overflow at mobile width around 375px.

If visual verification is done only locally and not on Pi, state that clearly.

## Expected Report

- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
