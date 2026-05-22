# MKWorld Stats Manager

Personal Mario Kart World stats and play-assist web tool.

## Services

| Service  | Local port | Description                  |
|----------|-----------|------------------------------|
| frontend | 3000      | React UI (nginx)             |
| backend  | 8000      | FastAPI JSON API             |
| postgres | 5432      | PostgreSQL 16 database       |

## Quick Start (local)

```sh
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/api/v1/health

## Image Strategy

This project has separate backend and frontend services, so two GHCR images are published:

| Image | Tag |
|-------|-----|
| `ghcr.io/iniwa/mkw-stats-backend` | `latest` |
| `ghcr.io/iniwa/mkw-stats-frontend` | `latest` |

The source repository may be hosted on Gitea, but GHCR publication requires a GitHub mirror or GitHub remote where `.github/workflows/docker-publish.yml` can run.

## Raspberry Pi Deployment (Portainer Stack)

1. Open Portainer Stack Web Editor.
2. Paste `deploy/portainer-stack.yml`.
3. Set `DATA_DIR=/home/iniwa/docker/mkw-stats` in the Portainer stack environment.
4. Set a real `POSTGRES_PASSWORD` value.
5. Deploy the stack.

Data is persisted to `$DATA_DIR/postgres/` and `$DATA_DIR/uploads/` on the Pi.

See `docs/design/deployment.md` for the Portainer workflow, migration, seed, and smoke test steps.

## Database Migrations & Seed

Run from the `backend/` directory. `DATABASE_URL` must point to a running PostgreSQL instance.

```sh
cd backend

# Apply all migrations
alembic upgrade head

# Load initial master data (idempotent — safe to run multiple times)
python -m app.seed.initial_data
```

For local development the default `.env` values work with `docker compose up`:

```sh
export DATABASE_URL=postgresql+psycopg://mkw:changeme@localhost:5432/mkw_stats
```

## Backend Tests

```sh
cd backend
pip install -r requirements.txt
pytest
```

Tests that do not require a live PostgreSQL connection run without any setup.
DB-level migration tests require a running PostgreSQL instance and are not included in the default suite.
