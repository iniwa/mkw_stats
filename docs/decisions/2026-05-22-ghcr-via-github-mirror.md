# 2026-05-22: Publish GHCR images via GitHub mirror

## Context

Portainer deployment verification was blocked because the expected GHCR images do not exist.

The local repository remote is Gitea:

```text
origin -> gitea:iniwa/mkw_stats
```

The project's image publishing workflow is defined in `.github/workflows/docker-publish.yml`, but GitHub Actions only runs when the repository exists and receives pushes on GitHub.

## Decision

Use a GitHub mirror or GitHub remote to run GitHub Actions and publish these GHCR images:

```text
ghcr.io/iniwa/mkw-stats-backend:latest
ghcr.io/iniwa/mkw-stats-frontend:latest
```

Gitea may remain the primary source repository.

## Reason

The deployment design already uses GHCR and Portainer image-only stacks. A GitHub mirror keeps the deployment path stable without introducing a separate local build/push process or changing Portainer stack image names.

## Constraints Introduced

- Portainer verification must wait until the GitHub mirror exists and GitHub Actions has published both images.
- The GitHub mirror must include `.github/workflows/docker-publish.yml`.
- If GitHub package visibility or authentication blocks Portainer pulls, fix GHCR package permissions before changing registries.

## Do Not Change Casually

Do not move to manual local arm64 image builds or another registry unless GHCR via GitHub mirror is explicitly rejected.
