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
The Pi deployment defaults to frontend port `3030` and backend port `8001` to avoid existing services on `3000` and `8000`.

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

## API

All endpoints are served under `/api/v1` and return JSON.

| Area | Endpoints |
|------|-----------|
| Health | `GET /health` |
| Settings | `GET /settings`, `PATCH /settings` |
| VR accounts | `GET/POST /vr-accounts`, `PATCH/DELETE /vr-accounts/{id}`, `POST /vr-accounts/{id}/activate` |
| Courses | `GET /courses`, `GET /routes`, `GET /map-points`, `GET /course-search?q=`, `POST /course-selection/resolve` |
| Play sessions | `POST /play-sessions`, `GET /play-sessions/active`, `GET /play-sessions/{id}`, `POST /play-sessions/{id}/finish` |
| Race records | `POST /play-sessions/{id}/races/draft`, `PATCH /race-records/{id}/complete-ranked`, `PATCH /race-records/{id}`, `POST /race-records/{id}/cancel`, `POST /play-sessions/{id}/undo-last-race` |

Ranked races are drafted on course selection and finished via `complete-ranked`.
Lounge races complete immediately, the session auto-finishes after race 12, and
repick / 12p-banned warnings are returned but never block recording.

Interactive docs are available at `/docs` when the backend is running.

## Backend Tests

```sh
cd backend
pip install -r requirements.txt
pytest
```

The default suite runs without any setup: pure smoke tests plus API tests that
run against in-memory SQLite (the two PostgreSQL-only column types are taught to
compile on SQLite in `tests/conftest.py`).
DB-level migration tests require a running PostgreSQL instance and are not included in the default suite.
