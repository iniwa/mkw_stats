Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Create the initial MKWorld Stats Manager application scaffold so the project has a working Docker-based backend/frontend/database foundation.

The target outcome is:

- FastAPI backend container starts and serves `GET /api/v1/health`.
- React + TypeScript frontend container starts and displays a minimal app shell.
- PostgreSQL container starts with persistent data volume.
- `docker-compose.yml` can be used as a local test compose file and as a Portainer Stack starting point.
- Project has basic ignore/config files for safe future work.

This handoff is only for the scaffold. Do not implement the full MVP flow yet.

## Background

MKWorld Stats Manager is a personal Mario Kart World stats and play-assist web tool. The initial v0.1 design is in `mkworld_stats_manager_docs_v0_1/`.

Codex has decided to implement the project in small reviewable handoffs. This first handoff establishes the repository structure and minimal runnable services before DB schema, APIs, and Playing UI are added in later handoffs.

Runtime target:

- Raspberry Pi 4
- Docker
- `linux/arm64`
- LAN-only initial operation
- GHCR image convention: `ghcr.io/iniwa/mkw-stats:latest`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/README.md`
- `mkworld_stats_manager_docs_v0_1/00_index.md`
- `mkworld_stats_manager_docs_v0_1/01_design.md`
- `mkworld_stats_manager_docs_v0_1/07_implementation_tasks.md`
- `mkworld_stats_manager_docs_v0_1/08_initial_implementation_prompt.md`

## Files To Edit

Create or edit only these paths unless a small wiring file is strictly required:

- `README.md`
- `.env.example`
- `.gitignore`
- `.dockerignore`
- `.claudeignore`
- `docker-compose.yml`
- `backend/**`
- `frontend/**`
- `.github/workflows/docker-publish.yml`

Do not edit:

- `AGENTS.md`
- `CLAUDE.md`
- `mkworld_stats_manager_docs_v0_1/**`
- `docs/handoffs/**`
- `docs/decisions/**`
- secrets, credentials, `.env`, or local settings

## Required Structure

Create a structure close to:

```text
backend/
frontend/
data/
  postgres/
  uploads/
backups/
docker-compose.yml
.env.example
.dockerignore
.claudeignore
README.md
.github/workflows/docker-publish.yml
```

If `data/` or `backups/` should not be committed directly, keep placeholder `.gitkeep` files only where useful and ignore runtime contents.

## Backend Requirements

Use:

- Python
- FastAPI
- Uvicorn

Implement:

- `GET /api/v1/health`

Response should be simple JSON, for example:

```json
{
  "status": "ok",
  "service": "mkw-stats-backend"
}
```

Include enough dependency/config files for Docker build and local container startup.

Do not implement SQLAlchemy, Alembic, or business APIs in this handoff unless the scaffold clearly needs a placeholder. Those belong to later handoffs.

## Frontend Requirements

Use:

- React
- TypeScript
- Vite or another lightweight React build setup

Implement a minimal app shell with:

- App name: `MKWorld Stats Manager`
- Basic navigation labels or placeholders for Dashboard, Playing, Records, Analytics, Courses, Lounge, Settings
- A small backend health status area that can call `/api/v1/health` if practical within the scaffold

Keep styling modest and utilitarian. This is an operational tool, not a marketing page.

## Docker Requirements

`docker-compose.yml` must include:

- `postgres`
- `backend`
- `frontend`

Required container behavior:

- `restart: unless-stopped`
- `TZ=Asia/Tokyo`
- PostgreSQL data persisted under a project volume/path suitable for local testing
- Ports documented in `README.md`

Use arm64-compatible base images.

Do not add external exposure, Cloudflare Tunnel, or production reverse proxy configuration.

## GitHub Actions Requirements

Add `.github/workflows/docker-publish.yml` for GHCR image publishing.

Constraints:

- Target `linux/arm64`
- Image should resolve to `ghcr.io/iniwa/mkw-stats:latest` if feasible for this repository
- Do not require secrets beyond GitHub's normal `GITHUB_TOKEN`

If a single-root Docker image is not appropriate because the project has backend and frontend services, document the chosen image strategy in `README.md` and keep the workflow minimal.

## Constraints

- Preserve the design direction in `AGENTS.md`.
- Keep changes scoped to scaffold and configuration only.
- Do not implement DB schema, migrations, seed data, course selection, VR recording, Lounge logic, analytics, image upload, or real Lounge API sync.
- Do not add OCR, video analysis, Discord bot, multi-user support, external publishing, or Cloudflare Tunnel behavior.
- Do not touch secrets, `.env`, credentials, or local settings.
- Do not commit automatically.

## Non Goals

- Full MVP implementation.
- Alembic migrations.
- Course/race data model.
- Playing UI flow.
- Lounge API integration.
- Production deployment verification on Raspberry Pi.
- UI polish beyond a clean minimal shell.

## Verification

Run what is practical and report exact results:

- Backend syntax/import check.
- Frontend install/build or typecheck if dependencies can be installed.
- `docker compose config` if Docker is available.
- `docker compose up` smoke test if practical.
- Manual check that backend health endpoint and frontend shell are reachable if services are started.

If dependency installation, Docker, or network access is blocked, report the blocked check and the reason.

## Expected Report

- Changed files
- Summary
- Verification results
- Blocked checks
- Any design questions for Codex
