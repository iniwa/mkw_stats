# Operations

Daily maintenance runbook for MKWorld Stats Manager deployed on Raspberry Pi via Portainer.

## Normal Deploy Flow

After a code change is committed:

1. Push to `main` on Gitea.
2. Gitea mirror pushes to GitHub `main`.
3. GitHub Actions runs `.github/workflows/docker-publish.yml` and publishes new images to GHCR.
4. Open Portainer → Stacks → `mkw-stats` → **Redeploy**.
5. Enable **Pull latest image** before deploying.
6. Confirm stack environment variables are still present (see below).

Portainer does **not** auto-pull new images. A manual redeploy with image pull is required after every push.

## Portainer Stack Environment Variables

These must be present in the Portainer stack environment. Never omit them during a redeploy — missing values cause compose to fall back to defaults, binding the backend to port `8000` which conflicts with Portainer's own Edge tunnel.

```text
DATA_DIR=/home/iniwa/docker/mkw-stats
POSTGRES_DB=mkw_stats
POSTGRES_USER=mkw
POSTGRES_PASSWORD=<real password>
FRONTEND_PORT=3030
BACKEND_PORT=8001
```

## Post-Deploy Checks

```sh
# Container status
docker ps | grep mkw

# Backend health (direct)
curl http://192.168.1.205:8001/api/v1/health
# Expected: {"status":"ok","service":"mkw-stats-backend"}

# Frontend health (through nginx proxy)
curl http://192.168.1.205:3030/api/v1/health

# Migration state (when a schema change was included)
docker exec mkw-backend alembic current
```

After a **frontend** redeploy, do a hard reload in the browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) if the old JS bundle is still served.

### Runtime status and build identity

The existing `/api/v1/health` response is process liveness only and remains unchanged. It does not establish database connectivity.

| Endpoint | Purpose | Expected result |
|----------|---------|-----------------|
| `/api/v1/ready` | Read-only database connectivity (`SELECT 1`) | HTTP 200 with `database: "ok"`; HTTP 503 with `database: "error"` on a database failure |
| `/api/v1/version` | Backend image identity, independent of the database | `commit` and `built_at`; unavailable build values are `null` |

The main app header checks readiness at startup and every 30 seconds, and provides a manual recheck. Each frontend check times out after 5 seconds; a failed or timed-out check must not continue showing a healthy state. Overlay and styleguide views do not poll readiness. This is a connectivity check, not a schema/migration or application-data integrity check. Neither new endpoint returns database connection details or changes records, and both disable response caching.

Settings shows frontend and backend build information separately, with build dates displayed in Japan time (including year and timezone). The frontend value identifies the JavaScript bundle loaded by that browser; the backend value comes from `/api/v1/version`. Different known commits indicate that the browser bundle and backend belong to different revisions. Check the existing Portainer image-pull update and hard reload the browser as needed. Backend information can still load when database-backed settings are unavailable.

Build metadata is public commit/time information only. Local builds without supplied metadata display an explicit unknown state; no runtime Git lookup, registry lookup, or credentials are required.

## Migration and Seed

Run from within the Portainer-managed backend container via SSH:

```sh
ssh iniwapi
docker exec mkw-backend alembic upgrade head
docker exec mkw-backend python -m app.seed.initial_data
```

Or use the backend container console in Portainer (Exec).

Always run migration before seed after schema changes.

The seed command is idempotent — it upserts master data (courses, map points, routes) and does not touch user play data. Existing map-point calibration (`map_points.x/y/radius`) is preserved: those coordinates are user-managed after a point is first inserted, so a re-seed refreshes seed-owned fields (course, labels) but never overwrites calibrated positions. See `docs/decisions/2026-06-19-preserve-map-point-calibration-during-seed.md`.

## Backup

### What to back up

| Path on Pi | Contents |
|------------|----------|
| `/home/iniwa/docker/mkw-stats/postgres/` | PostgreSQL data directory (all user data) |
| `/home/iniwa/docker/mkw-stats/uploads/` | Uploaded assets (if user file uploads are added) |

Take a backup before any schema migration or destructive operation.

### pg_dump example

```sh
ssh iniwapi
docker exec mkw-postgres pg_dump -U mkw mkw_stats > ~/mkw_stats_backup_$(date +%Y%m%d).sql
```

Backup destination: `/mnt/nas/pi_backup/` (SMB, Synology DS420j @ 192.168.1.190)

## Restore

1. Stop the stack in Portainer (or stop `mkw-backend` and `mkw-frontend` at minimum).
2. Restore data using one of:

```sh
# Option A: load from pg_dump
cat mkw_stats_backup.sql | docker exec -i mkw-postgres psql -U mkw mkw_stats

# Option B: replace postgres data directory
# Stop stack, remove /home/iniwa/docker/mkw-stats/postgres/, replace with backup copy,
# then redeploy via Portainer.
```

3. Redeploy through Portainer (not via SSH `docker compose`).
4. Run post-deploy checks above.

Always redeploy through Portainer to keep container names, env values, and port bindings correct.

## Data Reset

Current record data is non-critical, but a reset should still be deliberate.

### Option A — Full reset

Use only when a clean slate is clearly intended:

1. Take a `pg_dump` backup.
2. Stop the stack in Portainer.
3. Remove or rename `/home/iniwa/docker/mkw-stats/postgres/`.
4. Redeploy via Portainer (Postgres re-initialises a fresh database).
5. `docker exec mkw-backend alembic upgrade head`
6. `docker exec mkw-backend python -m app.seed.initial_data`

### Option B — Record-only cleanup

A reviewed script is available at `scripts/record_only_cleanup.sql`.

Steps:

1. Take a `pg_dump` backup first (see Backup section).
2. Review the script — confirm it deletes only user play data and resets `vr_accounts.current_vr` to `initial_vr`.
3. Run the script (it defaults to `ROLLBACK`):
   ```sh
   cd /path/to/mkw_stats
   docker exec -i mkw-postgres psql -U mkw mkw_stats < scripts/record_only_cleanup.sql
   ```
4. Check the pre/post row counts in the output.
5. If counts look correct, edit the script: comment out `ROLLBACK` and uncomment `COMMIT`, then re-run.

The script preserves: courses, routes, map_points, vr_accounts, app_settings, and uploaded_files.

## External Dependency Notes

### MKCentral API

Lounge MMR sync calls `https://lounge.mkcentral.com/api/player/details`.

- If MKCentral returns a non-JSON body (e.g., HTML maintenance page) with HTTP 200, the backend converts it to a `502 Bad Gateway`.
- HTTP 4xx/5xx from MKCentral are also returned as `502`.

### MMR Sync Configuration

MMR sync depends on these settings (configured in the Settings UI):

| Setting | Role |
|---------|------|
| `lounge_player_id` | MKCentral numeric ID or player name |
| `lounge_season` | Current Lounge season number |

Player count determines the game endpoint:

| `player_count` | Season | Game |
|----------------|--------|------|
| 12 | any | `mkworld` |
| 24 | ≤ 1 | `mkworld` (shared stream) |
| 24 | ≥ 2 | `mkworld24p` |

If sync returns "対応する完了済み Lounge セッションが見つかりませんでした", the MMR change timestamp did not match any completed Lounge session within ±2 hours.

## GHCR Images

Images are public:

```text
ghcr.io/iniwa/mkw-stats-backend:latest
ghcr.io/iniwa/mkw-stats-frontend:latest
```

Do not add GHCR credentials to Portainer unless private package access is intentionally required.

If Portainer returns `401` on pull, check for stale registry credentials in Portainer Settings → Registries before changing image visibility.
