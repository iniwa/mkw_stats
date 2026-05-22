# 2026-05-22: Use GHCR SHA tags and avoid stale Portainer credentials

## Context

Portainer deployment verification for the Records UI showed that the app code and GHCR images were correct, but Portainer did not reliably refresh the containers from `latest`.

The root cause was not an application bug. Portainer had a stale GHCR registry authentication entry. Re-pull attempts through Portainer returned `401`, while anonymous CLI pulls for the public GHCR images succeeded.

The Docker publish workflow previously pushed only `latest`, which made it harder to confirm which commit a container was running.

## Decision

Publish both `latest` and commit SHA tags for each GHCR image.

Use SHA tags in this form:

```text
ghcr.io/iniwa/mkw-stats-backend:sha-<short-commit>
ghcr.io/iniwa/mkw-stats-frontend:sha-<short-commit>
```

Keep the Portainer stack on `latest` for normal operation unless a specific rollback or verification task needs a pinned SHA tag.

If Portainer fails to pull public GHCR images with `401`, check and remove stale Portainer registry credentials before changing image names, package visibility, or the deploy architecture.

## Reason

`latest` keeps the normal Portainer stack simple. SHA tags provide an immutable reference for verification, rollback, and debugging when Portainer or GHCR caching behavior is unclear.

The stale credential failure mode is easy to misdiagnose as a missing image or broken GitHub Actions run. Recording it prevents unnecessary registry or stack changes.

## Constraints Introduced

- `.github/workflows/docker-publish.yml` should continue publishing SHA tags for both backend and frontend images.
- GHCR package visibility should remain compatible with the chosen Portainer pull mode.
- Do not add GHCR credentials to Portainer unless private package pulls are intentionally required.
- When verifying a deployment, compare the running container image digest or SHA tag against the expected GitHub Actions commit when possible.

## Do Not Change Casually

Do not remove SHA tag publishing just because the Portainer stack uses `latest`.

Do not switch registries or introduce manual image deployment until GitHub Actions, GHCR visibility, and Portainer registry credentials have all been checked.
