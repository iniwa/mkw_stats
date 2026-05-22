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

## Raspberry Pi Deployment (Portainer Stack)

1. Set `DATA_DIR=/home/iniwa/docker/mkw-stats` in the Portainer stack environment.
2. Paste `docker-compose.yml` into the Portainer Stack Web Editor.
3. The images are pulled from GHCR automatically on push to `main`.

Data is persisted to `$DATA_DIR/postgres/` and `$DATA_DIR/uploads/` on the Pi.

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
