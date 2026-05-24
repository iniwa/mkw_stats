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

Portainer does not automatically recreate the MKW containers when GitHub Actions publishes a new `latest` image. Treat a Portainer stack redeploy with image pull enabled as the required deployment step after a successful GHCR build.

Do not add MKW containers to Watchtower automation yet. The current preference is explicit Portainer-controlled updates so schema, seed, and browser checks can be paired with each deployment. Reconsider Watchtower only if the manual redeploy step becomes a recurring operational burden and the update policy is documented first.

## Reason

`latest` keeps the normal Portainer stack simple. SHA tags provide an immutable reference for verification, rollback, and debugging when Portainer or GHCR caching behavior is unclear.

The stale credential failure mode is easy to misdiagnose as a missing image or broken GitHub Actions run. Recording it prevents unnecessary registry or stack changes.

Explicit Portainer redeploys keep deployment timing visible during this early MVP phase. This matters because some slices require post-deploy seed execution, API verification, or browser cache checks.

## Constraints Introduced

- `.github/workflows/docker-publish.yml` should continue publishing SHA tags for both backend and frontend images.
- GHCR package visibility should remain compatible with the chosen Portainer pull mode.
- Do not add GHCR credentials to Portainer unless private package pulls are intentionally required.
- When verifying a deployment, compare the running container image digest or SHA tag against the expected GitHub Actions commit when possible.
- After a frontend redeploy, force a hard browser reload if the Web GUI still serves an older hashed JS bundle. Route detail verification observed the browser using the previous asset until a hard reload was performed.
- After GitHub Actions publishes a new image, Portainer must be redeployed with image pull enabled before assuming the Pi is running the new code.
- Do not enable Watchtower updates for `mkw-backend` or `mkw-frontend` without a separate decision that defines update timing, rollback expectations, and verification responsibility.

## Do Not Change Casually

Do not remove SHA tag publishing just because the Portainer stack uses `latest`.

Do not switch registries or introduce manual image deployment until GitHub Actions, GHCR visibility, and Portainer registry credentials have all been checked.

Do not silently rely on Watchtower for MKW updates while handoff-driven Portainer verification is still the project deployment model.
