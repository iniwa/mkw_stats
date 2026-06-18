Read AGENTS.md, CLAUDE.md, `docs/design/time-attack.md`, the archived Time Attack handoffs, and this handoff file before starting.
If the repository state differs materially from this handoff, or publication would include unrelated changes, stop and report before committing or pushing.

## Goal

Publish the reviewed Time Attack implementation through the established source and image pipeline:

```text
local main -> Gitea origin/main -> GitHub mirror/main -> GitHub Actions -> GHCR
```

This handoff explicitly authorizes one scoped commit and push to `origin/main` containing only the reviewed Time Attack feature, its documentation, and handoff bookkeeping.

Do not deploy or migrate the Raspberry Pi in this handoff. Portainer deployment and PostgreSQL migration will be handled after image publication is confirmed.

## Background

Codex has reviewed and accepted both implementation slices:

- `docs/handoffs/archive/2026-06-18-time-attack-backend.md`
- `docs/handoffs/archive/2026-06-18-time-attack-frontend.md`

Previously verified:

- Backend: `151 passed`
- Frontend: `npm run typecheck` passed
- Frontend: `npm run build` passed
- Alembic head: `008`
- Playwright mock verification covered category draft retention, strict validation, save/reload behavior, summary/differences, and 375px table overflow behavior

Current branch should be `main`.

The configured local remote is:

```text
origin -> gitea:iniwa/mkw_stats
```

GitHub Actions builds separate `linux/arm64` images on GitHub `main`:

- `ghcr.io/iniwa/mkw-stats-backend:latest`
- `ghcr.io/iniwa/mkw-stats-frontend:latest`

## Files Expected In The Commit

- `README.md`
- `backend/alembic/versions/008_time_attack_records.py`
- `backend/app/api/__init__.py`
- `backend/app/api/time_attack.py`
- `backend/app/models/__init__.py`
- `backend/app/models/courses.py`
- `backend/app/models/enums.py`
- `backend/app/schemas/__init__.py`
- `backend/tests/test_api.py`
- `backend/tests/test_smoke.py`
- `docs/design/README.md`
- `docs/design/time-attack.md`
- `docs/handoffs/README.md`
- `docs/handoffs/archive/2026-06-18-time-attack-backend.md`
- `docs/handoffs/archive/2026-06-18-time-attack-frontend.md`
- `docs/handoffs/2026-06-18-time-attack-publish.md`
- `frontend/src/App.css`
- `frontend/src/App.tsx`
- `frontend/src/TimeAttackView.tsx`
- `frontend/src/api.ts`
- `scripts/record_only_cleanup.sql`

No other file should be included unless it is clearly required and reported before commit.

## Required Work

### 1. Confirm Repository Scope

Run:

```sh
git branch --show-current
git status --short
git diff --check
git diff --name-only
```

Confirm:

- branch is `main`
- all changes belong to the Time Attack feature or its reviewed documentation/handoff lifecycle
- no secrets, `.env`, credentials, database dumps, screenshots, generated browser output, or unrelated user changes are present
- no deployment files, Dockerfiles, workflow behavior, or external exposure settings changed

If unexpected changes exist, do not include them. Stop if they cannot be separated safely.

### 2. Final Verification

Run:

```sh
cd backend
python -m pytest -q
python -m py_compile app/models/enums.py app/models/courses.py app/schemas/__init__.py app/api/time_attack.py
python -m alembic heads

cd ../frontend
npm run typecheck
npm run build

cd ..
git diff --check
```

Required results:

- backend tests pass
- Python compilation passes
- Alembic reports `008 (head)`
- frontend typecheck passes
- frontend build passes
- no diff whitespace errors

Do not proceed to commit if a required check fails.

### 3. Review The Final Diff

Review the complete staged intent before adding files.

Confirm specifically:

- migration is `008` with down revision `007`
- no TA seed rows are added
- TA records are explicitly preserved by `scripts/record_only_cleanup.sql`
- API supports saved-record listing and course/category upsert
- frontend has `TA` between `Courses` and `Records`
- strict `m:ss.mmm` validation rejects zero and seconds over 59
- no dependency changes

### 4. Create One Scoped Commit

Stage only the files listed under `Files Expected In The Commit`.

Before committing:

```sh
git diff --cached --name-only
git diff --cached --check
```

Commit message:

```text
Add Time Attack tracking
```

This handoff explicitly authorizes creating that commit.

After commit:

```sh
git status --short
git show --stat --oneline HEAD
```

The working tree should be clean. If unrelated untracked files remain, report them without deleting or committing them.

### 5. Push To Gitea Main

Push:

```sh
git push origin main
```

This handoff explicitly authorizes that push.

Report the resulting commit SHA.

### 6. Confirm Mirror And Image Publication

Confirm that the same commit reaches GitHub `main` through the established mirror.

Then confirm the Docker Publish workflow succeeds for both matrix jobs:

- backend
- frontend

Confirm GHCR exposes images associated with this release:

- `ghcr.io/iniwa/mkw-stats-backend:latest`
- `ghcr.io/iniwa/mkw-stats-frontend:latest`
- preferably the corresponding `sha-<short-sha>` tags

Use available GitHub/CLI/read-only registry checks. Do not change repository settings, package visibility, credentials, mirrors, workflows, or image tags.

If the Gitea-to-GitHub mirror or GitHub Actions run is still pending, wait and re-check for a reasonable period. If it fails, collect the failure state/log context and stop; do not alter workflow or deployment configuration in this handoff.

## Constraints

- One commit only.
- Include only the reviewed Time Attack scope.
- Do not amend, squash, rebase, force-push, reset, or rewrite history.
- Do not deploy or restart Pi containers.
- Do not run Alembic against the Pi database.
- Do not run seed on the Pi.
- Do not modify Portainer.
- Do not change Dockerfiles, GitHub Actions, GHCR visibility, registry credentials, mirror configuration, ports, secrets, `.env`, or external exposure.
- Do not create a release tag.
- Do not clean or delete unrelated files.

## Non Goals

- No application edits.
- No follow-up refactor.
- No Raspberry Pi backup, deployment, migration, or UI smoke test.
- No record cleanup.

## Verification

Required:

- final local test/build checks pass
- exact staged file list reviewed
- commit created with the requested message
- `git push origin main` succeeds
- GitHub mirror reaches the commit
- both GHCR images publish successfully

## Expected Report

- Changed files committed
- Commit SHA and message
- Final verification results
- Push result
- GitHub mirror status
- GitHub Actions backend/frontend job results
- GHCR tags confirmed
- Working tree status after commit
- Blocked checks
- Unexpected files excluded
- Design questions for Codex
