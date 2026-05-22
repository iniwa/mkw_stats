Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add a minimal Settings screen for VR account management and Lounge settings.

This should make the app usable without backend-only setup commands: the user
should be able to create VR accounts, activate one account, edit account values,
delete inactive accounts, and update Lounge settings from the web UI.

## Background

The backend already exposes:

```text
GET    /api/v1/settings
PATCH  /api/v1/settings
GET    /api/v1/vr-accounts
POST   /api/v1/vr-accounts
PATCH  /api/v1/vr-accounts/{id}
DELETE /api/v1/vr-accounts/{id}
POST   /api/v1/vr-accounts/{id}/activate
```

The Playing UI currently reads active VR accounts via `GET /vr-accounts`.
The active VR account remains `is_active = true`; do not switch Playing to
`settings.selected_vr_account_id` in this slice.

Design decision:

- `docs/decisions/2026-05-22-settings-ui-scope.md`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/api.ts`
- `frontend/src/PlayingView.tsx`
- `backend/app/api/settings.py`
- `backend/app/api/vr_accounts.py`
- `backend/app/schemas/__init__.py`
- `docs/decisions/2026-05-22-settings-ui-scope.md`

## Files To Edit

Create or edit only:

- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/SettingsView.tsx`
- `README.md` only if you add a short note about the Settings screen

Do not edit:

- backend files
- database migrations or models
- deploy, Docker, GHCR, Portainer, or workflow files
- docs except this handoff's report is not required to edit docs
- secrets, credentials, `.env`, or local settings

## Required API Client Additions

Add typed client helpers for the existing endpoints:

```ts
updateSettings(body)
createVrAccount(body)
updateVrAccount(id, body)
activateVrAccount(id)
deleteVrAccount(id)
```

Use the existing `Settings` and `VrAccount` types where possible. Add request
body types if helpful.

## Required UI Behavior

Add a `SettingsView` and wire the existing `Settings` nav item to it.

Settings screen must include:

- Loading state
- Inline error state
- Reload button
- VR account list sorted as returned by the API
- Active account clearly marked
- Create account form with:
  - internal `name`
  - display name
  - initial VR
  - optional current VR
- Per-account edit controls for:
  - display name
  - initial VR
  - current VR
  - sort order
- Activate button for inactive accounts
- Delete button for inactive accounts
- Active account delete should be disabled or hidden, matching backend behavior
- Lounge settings form:
  - `lounge_player_id`
  - `lounge_auto_sync`
  - save button

After create/edit/activate/delete/save:

- Refresh settings/accounts from the backend.
- Show success or at least clear stale errors.
- Disable the relevant buttons while a request is running to avoid double submit.

## UX / Styling Requirements

- Match the existing restrained operational UI.
- Do not use marketing-style layout.
- Use full-width panels or simple forms; do not nest cards inside cards.
- Ensure button text and inputs fit on narrow screens.
- Keep the screen usable on both desktop and mobile widths.

## Constraints

- Frontend-only change.
- Do not change backend semantics.
- Do not add new dependencies.
- Do not implement characters, vehicles, item tables, Lounge API sync, analytics, records search, course notes, or file uploads.
- Do not change Playing UI behavior except for normal App routing if needed.
- Do not commit automatically.

## Verification

Run and report:

- `npm run typecheck` from `frontend/`
- `npm run build` from `frontend/`

If a live backend is available, optionally smoke test:

- load Settings screen
- create a test VR account
- activate it
- edit current VR
- save Lounge settings
- delete the inactive test account if applicable

If no live backend is available, report that blocker and rely on type/build checks.

## Expected Report

- Changed files
- Summary
- Settings UI behavior implemented
- Verification results
- Blocked checks
- Bugs found
- Design questions for Codex
