Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
If verification would require direct Docker Compose management on Raspberry Pi outside Portainer, stop and ask before proceeding.

## Goal

Verify the current MKWorld Stats Manager scaffold and DB schema through the Raspberry Pi Portainer Stack workflow.

This is a verification handoff, not a feature implementation handoff.

## Background

The project now has:

- Docker scaffold for backend/frontend/postgres
- SQLAlchemy/Alembic initial DB schema
- Idempotent seed data
- Portainer-specific stack source at `deploy/portainer-stack.yml`

The user wants Raspberry Pi deployment managed through Portainer, not direct `docker compose up` over SSH.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/design/deployment.md`
- `deploy/portainer-stack.yml`
- `docker-compose.yml`
- `backend/Dockerfile`
- `backend/alembic.ini`
- `backend/alembic/versions/001_initial_schema.py`
- `backend/app/seed/initial_data.py`
- `.github/workflows/docker-publish.yml`

## Files To Edit

Prefer no edits. This handoff is primarily verification.

If verification finds a small issue in deployment docs or stack configuration, edit only:

- `README.md`
- `docs/design/deployment.md`
- `deploy/portainer-stack.yml`
- `backend/Dockerfile`

If a deeper code/schema issue is found, stop and report it instead of making broad changes.

Do not edit:

- `AGENTS.md`
- `CLAUDE.md`
- `mkworld_stats_manager_docs_v0_1/**`
- frontend application files
- secrets, credentials, `.env`, or local settings

## Verification Scope

### 1. Image Availability

Confirm whether the expected images are available:

- `ghcr.io/iniwa/mkw-stats-backend:latest`
- `ghcr.io/iniwa/mkw-stats-frontend:latest`

If they are not available, report whether the blocker is:

- GitHub Actions/GHCR not configured
- repository is on Gitea and not mirrored to GitHub
- package permissions
- image build failure
- network/authentication

Do not invent a deployment workaround without approval.

### 2. Portainer Stack Deployment

Use Portainer Stack Web Editor, not direct compose management.

Stack source:

```text
deploy/portainer-stack.yml
```

Use stack name:

```text
mkw-stats
```

Set Portainer environment variables:

```text
DATA_DIR=/home/iniwa/docker/mkw-stats
POSTGRES_DB=mkw_stats
POSTGRES_USER=mkw
POSTGRES_PASSWORD=<real test password>
FRONTEND_PORT=3030
BACKEND_PORT=8001
```

Do not commit or report the actual password.

### 3. Container Health

Confirm these services start:

- `postgres`
- `backend`
- `frontend`

Collect high-level status and relevant error logs if any container fails.

### 4. Migration And Seed

From the backend container console in Portainer, run:

```sh
alembic upgrade head
python -m app.seed.initial_data
```

Then run the seed command a second time to confirm idempotency:

```sh
python -m app.seed.initial_data
```

Report exact success/failure output, excluding secrets.

### 5. Smoke Tests

Confirm:

```text
http://<pi-host>:8001/api/v1/health
http://<pi-host>:3030
```

Expected health response:

```json
{"status":"ok","service":"mkw-stats-backend"}
```

Frontend should show the `MKWorld Stats Manager` shell and backend health status.

## Constraints

- Manage Raspberry Pi deployment through Portainer.
- Do not run direct `docker compose up` on Raspberry Pi unless explicitly approved later.
- Do not change external exposure or Cloudflare Tunnel settings.
- Do not touch secrets, credentials, `.env`, or local settings.
- Do not commit automatically.

## Expected Report

- Changed files, if any
- Image availability result
- Portainer stack deployment result
- Container statuses
- Migration result
- Seed result and second-run idempotency result
- Backend health smoke test result
- Frontend smoke test result
- Blocked checks
- Design or deployment questions for Codex
