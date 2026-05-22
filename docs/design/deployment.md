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

## Migration And Seed

After first deployment or after schema changes, run these commands from the backend container console in Portainer:

```sh
alembic upgrade head
python -m app.seed.initial_data
```

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
