# Settings UI Scope

## Context

The Playing UI can record ranked and Lounge races, but the user cannot manage
VR accounts or Lounge settings from the web UI yet. The backend already exposes
settings and VR account endpoints.

## Decision

Implement a minimal Settings UI before expanding analytics, course notes, or
Lounge sync.

The first Settings UI slice should cover:

- VR account list
- create VR account
- edit display name, current VR, initial VR, and sort order
- activate one VR account
- delete inactive accounts only
- edit `lounge_player_id`
- toggle `lounge_auto_sync`

This slice should use the existing backend APIs and should not introduce new
schema or deployment changes.

## Reason

Playing UI depends on an active VR account for ranked sessions. Without a UI for
account setup and activation, the app is still awkward for real personal use.
The existing backend surface is enough for a practical first settings screen.

## Constraints

- Keep this frontend-focused unless a small API client helper is needed.
- Do not implement character, vehicle, item table, or Lounge API sync in this
  slice.
- Do not change ranked or Lounge recording semantics.

## Do Not Change Casually

- Do not make `selected_vr_account_id` the source of truth for Playing until
  the backend and Playing UI are intentionally changed together.
- For now, the active VR account remains the account with `is_active = true`.
