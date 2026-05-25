Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
This is a verification-only handoff. Do not edit source files.
If verification would require code changes, stop and report the finding instead of editing.

## Goal

Verify Raspberry Pi / Portainer deployment behavior for commit `ea4a694` (`Add Lounge MMR sync`) or a later commit that contains it.

Confirm that:

- Alembic migration `003_lounge_mmr_sync` applies successfully on the Pi PostgreSQL database.
- Settings can store Lounge season/game/player identifier.
- `POST /api/v1/lounge/mmr-sync` can call MKCentral Lounge public JSON API from the Pi.
- Lounge view can manually sync and display session-level MMR values.
- Existing views still render after deployment.

## Background

Implementation handoff:

- `docs/handoffs/archive/2026-05-25-lounge-mmr-session-sync.md`

Design context:

- `docs/design/ui-redesign-roadmap.md`

Implemented behavior:

- `app_settings` now has:
  - `lounge_season`, default `2`
  - `lounge_game`, default `mkworld24p`
- `play_sessions` now has:
  - `lounge_mmr_before`
  - `lounge_mmr_after`
  - `lounge_mmr_delta`
  - `lounge_mmr_table_id`
  - `lounge_mmr_synced_at`
- `POST /api/v1/lounge/mmr-sync`:
  - reads `lounge_player_id`, `lounge_season`, and `lounge_game` from settings.
  - treats numeric `lounge_player_id` as `mkcId`.
  - treats non-numeric `lounge_player_id` as `name`.
  - calls `https://lounge.mkcentral.com/api/player/details`.
  - attaches the newest unsynced `mmrChanges[].changeId` to the closest completed Lounge session within a two-hour window.
  - does not modify active sessions.
  - is idempotent by stored `lounge_mmr_table_id`.

Important deployment context:

- Gitea `main` mirrors to GitHub.
- GitHub Actions publishes GHCR images.
- Portainer uses:
  - `ghcr.io/iniwa/mkw-stats-backend:latest`
  - `ghcr.io/iniwa/mkw-stats-frontend:latest`
- Pi containers:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- Pi host ports:
  - frontend: `3030`
  - backend: `8001`
- Portainer does not automatically redeploy new `latest` images. If containers are still on an older image, redeploy the existing Portainer stack with image pull enabled. Do not use local `docker compose up`.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/handoffs/archive/2026-05-25-lounge-mmr-session-sync.md`
- `docs/design/ui-redesign-roadmap.md`
- `backend/alembic/versions/003_lounge_mmr_sync.py`
- `backend/app/api/lounge.py`
- `backend/app/services/lounge_mmr.py`
- `backend/app/models/vr.py`
- `backend/app/models/sessions.py`
- `frontend/src/LoungeView.tsx`
- `frontend/src/SettingsView.tsx`
- `frontend/src/api.ts`

## Files To Edit

None.

## Constraints

- Verification only.
- Do not change source files.
- Do not change Portainer stack configuration unless the stack is not using the already documented image names/ports.
- Do not run local `docker compose up` for deployment verification.
- Do not hard-delete user data.
- Do not commit or push.
- It is acceptable to update settings via the Web GUI or API for verification, but report any setting values changed.
- It is acceptable to create one short Lounge test session if no suitable completed Lounge session exists for MMR matching. If created, finish it and report the residual record.
- Avoid repeatedly calling MKCentral API. One or two manual sync attempts are enough.

## Verification

### 1. GHCR / Image Availability

Confirm `latest` images include commit `ea4a694` or a later commit containing it.

Acceptable checks:

- GitHub Actions success for the relevant commit, if available.
- GHCR `latest` pull success.
- SHA tag availability, if public/accessible.
- Container files contain:
  - `backend/alembic/versions/003_lounge_mmr_sync.py`
  - `backend/app/services/lounge_mmr.py`
- Frontend bundle contains `MMR同期` or another reliable Lounge MMR sync string after redeploy.

### 2. Portainer / Containers

If needed, redeploy the existing Portainer stack with image pull enabled.

Confirm all containers are Up:

- `mkw-postgres`
- `mkw-backend`
- `mkw-frontend`

Confirm reachability:

- `http://<pi-host>:8001/api/v1/health`
- `http://<pi-host>:3030/api/v1/health`
- `http://<pi-host>:3030`

### 3. Alembic Migration

Inside the deployed backend container, run:

```bash
alembic upgrade head
alembic current
```

Expected:

- Upgrade reaches `003 (head)`.
- If already applied, it should report current head cleanly.

Confirm DB columns exist:

- `app_settings.lounge_season`
- `app_settings.lounge_game`
- `play_sessions.lounge_mmr_before`
- `play_sessions.lounge_mmr_after`
- `play_sessions.lounge_mmr_delta`
- `play_sessions.lounge_mmr_table_id`
- `play_sessions.lounge_mmr_synced_at`

Also confirm existing core data remains present:

- courses
- routes
- vr_accounts
- play_sessions

### 4. Backend API Sanity

Confirm:

- `GET /api/v1/settings` returns `lounge_season` and `lounge_game`.
- `PATCH /api/v1/settings` can save:
  - `lounge_player_id`
  - `lounge_season`
  - `lounge_game`
- `POST /api/v1/lounge/mmr-sync` is present in OpenAPI.
- `POST /api/v1/lounge/mmr-sync` without `lounge_player_id` returns a clear 400.

If a valid `lounge_player_id` is available:

- Set `lounge_player_id` to the MKCentral ID or player name chosen by the user.
- Use `lounge_season=2` and `lounge_game=mkworld24p` unless the user explicitly wants Season 1.
- Call `POST /api/v1/lounge/mmr-sync`.

Expected success shapes:

- HTTP 200 with `current_mmr`.
- If a matching completed Lounge session exists:
  - `updated_session` is non-null.
  - `updated_session.lounge_mmr_before/after/delta/table_id/synced_at` are populated.
- If no matching completed session exists:
  - HTTP 200.
  - `updated_session` is null.
  - message says no matching completed Lounge session was found.

Expected failure shapes:

- MKCentral unreachable or HTTP error should return HTTP 502 with a clear message.
- It should not modify local session data on failure.

### 5. Idempotency / Active Session Safety

If a session is updated by sync:

1. Call `POST /api/v1/lounge/mmr-sync` again.
2. Confirm the same MKCentral `changeId` is not attached to another session.
3. Confirm repeated sync either finds another valid unsynced change or returns no matching session.

Confirm active Lounge sessions, if any, do not receive `lounge_mmr_*` fields from sync.

### 6. Web GUI Checks

Settings view:

- Lounge player field shows the MKCentral ID/name hint.
- Season field exists and saves.
- Game mode select exists and saves.
- Reloading Settings preserves the saved values.

Lounge view:

- MMR panel is visible.
- Manual `MMR同期` button is visible.
- Button disabled/loading state appears while syncing.
- On success, current MMR and sync message are displayed.
- If a session is updated, the MMR panel refreshes and shows:
  - current/latest MMR
  - previous delta
  - before value
  - synced count
- If no matching session exists, the no-match message is visible and UI does not crash.
- Browser console has no React/JavaScript errors.

Regression spot checks:

- Dashboard renders.
- Playing renders.
- Records renders.
- Analytics renders.
- Courses renders.
- Settings renders.
- 375px viewport has no horizontal overflow on Settings and Lounge.

## Expected Report

Report in Japanese:

- Changed files (`なし` expected)
- GHCR / GitHub Actions status
- Portainer / container status
- Alembic migration results
- DB column/data sanity results
- Backend API results
- MKCentral API sync result
- Settings UI results
- Lounge UI results
- Regression / responsive results
- Blocked checks
- Settings values changed for verification
- Residual test data, if any
- Bugs found
- Design questions for Codex
