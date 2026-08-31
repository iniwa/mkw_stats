# Deployment

## Portainer Stack

Raspberry Pi deployment is managed through Portainer Stack Web Editor.

Use this file as the stack source:

```text
deploy/portainer-stack.yml
```

The root `docker-compose.yml` is for local development and may contain `build:` entries. Do not paste it into Portainer unless local build behavior is explicitly desired.

## Portainer Environment Variables

Set these in the Portainer Stack environment:

```text
DATA_DIR=/home/iniwa/docker/mkw-stats
POSTGRES_DB=mkw_stats
POSTGRES_USER=mkw
POSTGRES_PASSWORD=<set a real password>
FRONTEND_PORT=3030
BACKEND_PORT=8001
```

`POSTGRES_PASSWORD=changeme` is only a local default. Use a real value on Raspberry Pi.

The Raspberry Pi already uses host ports `3000` and `8000` for other services. Keep the MKW stack defaults on `3030` and `8001` unless those ports become unavailable.

## Container Names

The Portainer stack uses fixed container names for easier verification and
maintenance commands:

```text
mkw-postgres
mkw-backend
mkw-frontend
```

## Images

The stack uses image-only deployment:

```text
ghcr.io/iniwa/mkw-stats-backend:latest
ghcr.io/iniwa/mkw-stats-frontend:latest
postgres:16-alpine
```

## Repository And GHCR Publishing

The source repository may be managed in Gitea, but GHCR publication requires GitHub Actions to run on GitHub.

Required publishing path:

```text
Gitea main -> GitHub mirror/main -> GitHub Actions -> GHCR
```

Portainer verification is blocked until both GHCR images exist and are pullable.

### Build identity

The existing Docker publish job passes the full source commit and the metadata action's UTC build timestamp to both image builds using `APP_COMMIT_SHA` and `APP_BUILD_TIMESTAMP`. It also applies the generated OCI labels. Image names, `latest`/SHA tags, action versions, and the `linux/arm64` publication route remain unchanged.

The backend image retains these two public values for `/api/v1/version`. The frontend build passes them to Vite as `VITE_APP_COMMIT_SHA` and `VITE_APP_BUILD_TIMESTAMP`, so the displayed frontend identity belongs to the loaded bundle. Only these public values are embedded; no secrets are passed to the frontend. Portainer stack environment variables do not need changes.

Do not set metadata to the current runtime date or guess a commit when it is missing. A local image built without these optional build arguments reports unknown build information. See the runtime checks in `operations.md` for interpreting the Settings display.

## Migration And Seed

After first deployment or after schema changes, run these commands against the Portainer-managed backend container:

```sh
alembic upgrade head
python -m app.seed.initial_data
```

Preferred path is the backend container console in Portainer.

SSH `docker exec` against the Portainer-created backend container is also acceptable for verification and maintenance when Portainer console access is inconvenient. The backend container name is `mkw-backend`. Do not use SSH to run `docker compose up` or otherwise manage the stack outside Portainer.

The seed command is idempotent.

## Smoke Test

After the stack is running:

```text
http://<pi-host>:8001/api/v1/health
http://<pi-host>:3030
```

Expected backend health response:

```json
{"status":"ok","service":"mkw-stats-backend"}
```
