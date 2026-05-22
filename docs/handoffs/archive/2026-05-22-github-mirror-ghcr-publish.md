Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
If the work requires secrets, GitHub credentials, or registry tokens, stop and ask the user to perform that step.

## Goal

Unblock Portainer verification by confirming that the repository is mirrored or pushed to GitHub and that GitHub Actions publishes the expected GHCR images.

This handoff is for repository/deployment pipeline verification. Do not change application code.

## Background

The Portainer deployment verification handoff was blocked at image availability:

- `ghcr.io/iniwa/mkw-stats-backend:latest` does not exist or is not accessible.
- `ghcr.io/iniwa/mkw-stats-frontend:latest` does not exist or is not accessible.

Root cause: the current repo remote is Gitea, but the project relies on GitHub Actions and GHCR.

Codex decision:

- Keep Gitea as primary if desired.
- Add/use a GitHub mirror or GitHub remote to run `.github/workflows/docker-publish.yml`.
- Continue using GHCR images for Portainer.

## Files To Inspect

- `AGENTS.md`
- `docs/decisions/2026-05-22-ghcr-via-github-mirror.md`
- `.github/workflows/docker-publish.yml`
- `deploy/portainer-stack.yml`
- `docs/handoffs/2026-05-22-portainer-deployment-verification.md`

## Files To Edit

Prefer no edits.

If a small documentation correction is needed, edit only:

- `README.md`
- `docs/design/deployment.md`
- `AGENTS.md`

Do not edit application code, Dockerfiles, compose files, secrets, `.env`, or local settings.

## Verification Steps

### 1. Confirm GitHub Repository

Confirm whether a GitHub repository exists for this project, expected path:

```text
github.com/iniwa/mkw_stats
```

If it does not exist, ask the user to create it or configure a Gitea-to-GitHub mirror. Do not create repositories or handle credentials yourself unless explicitly authorized.

### 2. Confirm GitHub Remote Or Mirror

Confirm one of these is true:

- local repo has a GitHub remote that can receive pushes, or
- Gitea has a push mirror configured to GitHub.

If neither is true, report the exact missing setup.

### 3. Trigger GitHub Actions

After GitHub receives `main`, confirm `.github/workflows/docker-publish.yml` runs.

Expected workflow:

```text
Docker Publish
```

Expected matrix jobs:

- backend
- frontend

### 4. Confirm GHCR Images

Confirm both images exist and are pullable by Portainer:

```text
ghcr.io/iniwa/mkw-stats-backend:latest
ghcr.io/iniwa/mkw-stats-frontend:latest
```

If package visibility is private and Portainer is unauthenticated, report that package visibility or registry credentials must be configured.

### 5. Resume Portainer Verification

Only after both images are available, tell Codex/user that the active handoff can resume:

```text
docs/handoffs/2026-05-22-portainer-deployment-verification.md
```

Do not archive the Portainer verification handoff from this task.

## Constraints

- Do not commit automatically.
- Do not change registry names.
- Do not replace GHCR with another registry.
- Do not run direct Docker Compose deployment on Raspberry Pi.
- Do not handle or print secrets.

## Expected Report

- Changed files, if any
- Whether GitHub repo exists
- Whether GitHub remote or mirror exists
- GitHub Actions run result
- GHCR backend image availability
- GHCR frontend image availability
- Whether Portainer verification can resume
- Blocked checks
- Questions for Codex/user
