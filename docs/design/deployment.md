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
FRONTEND_PORT=3000
BACKEND_PORT=8000
```

`POSTGRES_PASSWORD=changeme` is only a local default. Use a real value on Raspberry Pi.

## Images

The stack uses image-only deployment:

```text
ghcr.io/iniwa/mkw-stats-backend:latest
ghcr.io/iniwa/mkw-stats-frontend:latest
postgres:16-alpine
```

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
http://<pi-host>:8000/api/v1/health
http://<pi-host>:3000
```

Expected backend health response:

```json
{"status":"ok","service":"mkw-stats-backend"}
```
