Read AGENTS.md, CLAUDE.md, `docs/decisions/2026-06-18-seed-vr-account-idempotency.md`, the archived implementation handoff, and this handoff before starting.
If repository state differs materially from this handoff, or publication would include unrelated changes, stop and report before committing or pushing.

## Goal

Publish the reviewed VR seed idempotency fix through the established source pipeline:

```text
local main -> Gitea origin/main -> GitHub mirror/main
```

This handoff explicitly authorizes one scoped commit and push to `origin/main`.

The application image build may run because backend code changes, but do not deploy or operate on the Raspberry Pi in this handoff.

## Background

The production seed previously failed when:

- a user-created VR account such as `iniwa` was already active
- the default seed account `main` was absent
- seed attempted to insert `main` with `is_active=True`

The reviewed fix now:

- creates `main` as active on an empty database
- creates missing `main` as inactive when another account is active
- leaves an existing `main` and all existing VR account values unchanged
- succeeds on repeated execution

Codex review reproduced:

- `python -m pytest -q` -> `155 passed`
- `python -m py_compile app/seed/initial_data.py` -> success
- `git diff --check` -> no whitespace errors

The implementation handoff is archived at:

- `docs/handoffs/archive/2026-06-18-fix-seed-vr-idempotency.md`

## Files Expected In The Commit

Application change:

- `backend/app/seed/initial_data.py`
- `backend/tests/test_smoke.py`

Decision and handoff lifecycle:

- `docs/decisions/2026-06-18-seed-vr-account-idempotency.md`
- `docs/handoffs/README.md`
- `docs/handoffs/archive/2026-06-18-fix-seed-vr-idempotency.md`
- `docs/handoffs/2026-06-18-publish-seed-vr-idempotency.md`
- move `docs/handoffs/2026-06-18-time-attack-publish.md` to `docs/handoffs/archive/2026-06-18-time-attack-publish.md`
- `docs/handoffs/archive/2026-06-18-time-attack-pi-deploy.md`

No other file should be included unless it is clearly required and reported before commit.

## Required Work

### 1. Confirm Repository Scope

Run:

```sh
git branch --show-current
git status --short
git diff --check
git diff --name-status
```

Confirm:

- branch is `main`
- application changes are limited to the two reviewed backend files
- all documentation changes are the listed decision or handoff lifecycle records
- no secrets, credentials, `.env`, dumps, screenshots, generated output, deployment configuration, frontend files, migrations, or unrelated user changes are present

Treat the Time Attack publish move and Pi deploy archive file as Codex-authored lifecycle bookkeeping, not part of the seed implementation authorship.

If unexpected changes exist, do not include them. Stop if they cannot be separated safely.

### 2. Final Verification

Run:

```sh
cd backend
python -m pytest -q
python -m py_compile app/seed/initial_data.py

cd ..
git diff --check
```

Required:

- all backend tests pass
- seed module compiles
- no whitespace errors

### 3. Review The Final Diff

Confirm specifically:

- missing `main` is inserted inactive when any active account exists
- empty installations still receive active `main`
- existing accounts are never synchronized or overwritten by this block
- repeated seed execution does not duplicate `main`
- course, map-point, and route seed behavior is unchanged
- no schema, migration, API, frontend, dependency, Docker, workflow, or deployment change exists

### 4. Create One Scoped Commit

Stage only the files listed under `Files Expected In The Commit`.

Before committing:

```sh
git diff --cached --name-status
git diff --cached --check
```

Commit message:

```text
Preserve active VR account during seed
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

This handoff explicitly authorizes that push. Report the full commit SHA.

### 6. Confirm Mirror And Backend Image

Confirm the same commit reaches GitHub `main`.

If the Docker Publish workflow runs, confirm its final result and verify at least the backend image tag for the commit:

- `ghcr.io/iniwa/mkw-stats-backend:sha-<short-sha>`

Also report whether backend `latest` resolves to the same manifest digest.

Use read-only GitHub or registry checks. Do not change repository settings, package visibility, credentials, mirror configuration, workflows, image tags, or deployment.

If mirror, Actions, or GHCR publication is pending, wait and re-check for a reasonable period. If it fails, collect the failure state and stop.

## Constraints

- One commit only.
- Include only the reviewed application change and listed documentation lifecycle files.
- Do not amend, squash, rebase, force-push, reset, or rewrite history.
- Do not modify application code during publication.
- Do not deploy or restart Pi containers.
- Do not run Alembic or seed on the Pi.
- Do not modify Portainer.
- Do not change Dockerfiles, workflows, GHCR visibility, registry credentials, mirrors, ports, secrets, `.env`, or external exposure.
- Do not create a release tag.
- Do not delete unrelated files.

## Non Goals

- No additional seed refactor.
- No schema, migration, API, frontend, or dependency changes.
- No Raspberry Pi verification.
- No update or deletion of operational memory before the new image is published and the corrected seed is verified on the Pi.

## Verification

Required:

- repository scope exactly matches this handoff
- `155` or more backend tests pass
- seed module compilation passes
- staged whitespace check passes
- one commit is created and pushed
- GitHub mirror reaches the same commit
- backend image publication is confirmed if triggered

## Expected Report

- Files committed
- Commit SHA and message
- Local verification results
- Final diff review result
- Push result
- GitHub mirror status
- GitHub Actions status
- Backend GHCR commit-tag and `latest` digest status
- Final working-tree status
- Files excluded as unrelated
- Blocked checks
- Design questions for Codex
