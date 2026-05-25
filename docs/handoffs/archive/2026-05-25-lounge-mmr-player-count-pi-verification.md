Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
This is a verification-only handoff. Do not edit source files.
If verification would require code changes, stop and report the finding instead of editing.

## Goal

Verify Raspberry Pi / Portainer deployment behavior for commit `ce0ee04` (`Split Lounge MMR sync by player count`) or a later commit that contains it.

Confirm that:

- Alembic migration `004_lounge_mmr_game` applies successfully on the Pi PostgreSQL database.
- `POST /api/v1/lounge/mmr-sync` calls MKCentral with a browser-like User-Agent and no longer fails with HTTP 403.
- MMR sync returns separated 12p / 24p MMR values.
- MMR matching uses local Lounge session `player_count` to choose the correct MKCentral game stream.
- Settings no longer implies a single manual Lounge game mode.
- Existing views still render after deployment.

## Background

Implementation handoffs:

- `docs/handoffs/archive/2026-05-25-lounge-mmr-session-sync.md`
- `docs/handoffs/archive/2026-05-25-lounge-mmr-player-count-game.md`

Previous Pi verification:

- `docs/handoffs/archive/2026-05-25-lounge-mmr-pi-verification.md`

Important findings already handled:

- MKCentral blocks Python urllib's default User-Agent. Commit `304ee24` adds `User-Agent: Mozilla/5.0`.
- MKWorld Lounge separates 12p and 24p MMR from Season 2 onward. Commit `ce0ee04` makes sync derive the MKCentral game from `PlaySession.player_count` instead of `settings.lounge_game`.

Expected game mapping:

- Season 2 and later:
  - 12-player session -> `mkworld`
  - 24-player session -> `mkworld24p`
- Season 0 and Season 1:
  - 12-player and 24-player sessions -> `mkworld`

The legacy `app_settings.lounge_game` field remains for compatibility but should no longer drive sync behavior.

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
- `docs/handoffs/archive/2026-05-25-lounge-mmr-player-count-game.md`
- `backend/alembic/versions/004_lounge_mmr_game.py`
- `backend/app/services/lounge_mmr.py`
- `backend/app/api/lounge.py`
- `backend/app/models/sessions.py`
- `backend/app/schemas/__init__.py`
- `frontend/src/LoungeView.tsx`
- `frontend/src/SettingsView.tsx`
- `frontend/src/api.ts`

## Files To Edit

None.

## Constraints

- Verification only.
- Do not change source files.
- Do not change Portainer stack configuration unless the stack is not using the documented image names/ports.
- Do not run local `docker compose up` for deployment verification.
- Do not hard-delete user data.
- Do not commit or push.
- It is acceptable to update settings via the Web GUI or API for verification, but report any setting values changed.
- It is acceptable to create one short Lounge test session if needed for UI smoke checks. If created, finish it and report the residual record.
- Avoid repeatedly calling MKCentral API. One or two manual sync attempts are enough.

## Verification

### 1. GHCR / Image Availability

Confirm `latest` images include commit `ce0ee04` or a later commit containing it.

Acceptable checks:

- GitHub Actions success for the relevant commit, if available.
- GHCR `latest` pull success.
- SHA tag availability, if public/accessible.
- Backend container files contain:
  - `backend/alembic/versions/004_lounge_mmr_game.py`
  - `backend/app/services/lounge_mmr.py` with `lounge_game_for_player_count`
- Frontend bundle contains reliable strings such as:
  - `12p MMR`
  - `24p MMR`
  - `12p`
  - `24p`

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

- Upgrade reaches `004 (head)`.
- If already applied, it should report current head cleanly.

Confirm DB columns exist:

- `play_sessions.lounge_mmr_game`
- Previous MMR columns still exist:
  - `lounge_mmr_before`
  - `lounge_mmr_after`
  - `lounge_mmr_delta`
  - `lounge_mmr_table_id`
  - `lounge_mmr_synced_at`

Also confirm existing core data remains present:

- courses
- routes
- vr_accounts
- play_sessions

### 4. Backend API Sanity

Confirm:

- `GET /api/v1/settings` still returns `lounge_season` and legacy `lounge_game`.
- `PATCH /api/v1/settings` can save:
  - `lounge_player_id`
  - `lounge_season`
- `POST /api/v1/lounge/mmr-sync` is present in OpenAPI.
- `POST /api/v1/lounge/mmr-sync` without `lounge_player_id` returns a clear 400.

Set `lounge_player_id` to the MKCentral ID or player name chosen by the user. Unless instructed otherwise, use:

- `lounge_season=2`
- current user value for `lounge_player_id`

Call:

```text
POST /api/v1/lounge/mmr-sync
```

Expected:

- No HTTP 403 from MKCentral.
- HTTP 200 if MKCentral is reachable.
- Response includes:
  - `current_mmr_12p`
  - `current_mmr_24p`
  - `updated_session`
  - `updated_game`
  - `message`
- `current_mmr_12p` and/or `current_mmr_24p` should be non-null if MKCentral has data for the player in that stream.
- If no matching local completed Lounge session exists, `updated_session` may be null. This is acceptable.
- If a matching session is updated, it must have:
  - `lounge_mmr_game`
  - `lounge_mmr_before`
  - `lounge_mmr_after`
  - `lounge_mmr_delta`
  - `lounge_mmr_table_id`
  - `lounge_mmr_synced_at`

### 5. 12p / 24p Matching Safety

If sync updates a session:

- If `updated_session.player_count == 12`, verify `updated_game == "mkworld"` for Season 2.
- If `updated_session.player_count == 24`, verify `updated_game == "mkworld24p"` for Season 2.
- Verify `updated_session.lounge_mmr_game == updated_game`.

If no session is updated:

- Confirm through API response that separated MMR fields are present.
- Report that local completed sessions did not match MKCentral change timestamps.

Do not force DB timestamps unless the user explicitly approves it. A no-match result is valid for this verification.

### 6. Idempotency / Active Session Safety

If a session is updated by sync:

1. Call `POST /api/v1/lounge/mmr-sync` again.
2. Confirm the same MKCentral `changeId` is not attached to another session.
3. Confirm repeated sync either finds another valid unsynced change or returns no matching session.

Confirm active Lounge sessions, if any, do not receive `lounge_mmr_*` fields from sync.

### 7. Web GUI Checks

Settings view:

- Lounge player field still exists.
- Season field still exists and saves.
- Manual game mode select is gone or disabled.
- Static helper text explains 12p/24p is selected from session player count.
- Reloading Settings preserves saved values.

Lounge view:

- MMR panel is visible.
- `12p MMR` and `24p MMR` are displayed separately.
- Manual MMR sync button is visible.
- Button disabled/loading state appears while syncing.
- On success or no-match, message is displayed and UI does not crash.
- If a session is updated, the panel refreshes and shows synced count and latest delta.
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

- Changed files (`None` expected)
- GHCR / GitHub Actions status
- Portainer / container status
- Alembic migration results
- DB column/data sanity results
- Backend API results
- MKCentral API sync result
- 12p / 24p matching result
- Settings UI results
- Lounge UI results
- Regression / responsive results
- Blocked checks
- Settings values changed for verification
- Residual test data, if any
- Bugs found
- Design questions for Codex
