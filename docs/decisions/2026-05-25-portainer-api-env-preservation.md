# 2026-05-25: Preserve environment variables during Portainer API redeploys

## Context

Raspberry Pi verification for Lounge MMR 12p/24p sync found that the app containers and migration were correct, but a Portainer API redeploy failed when the API payload did not include the stack environment variables.

Without the saved environment values, compose interpolation fell back to defaults. In particular, the stack attempted to bind backend host port `8000`, which conflicts with Portainer's own Edge tunnel on the Pi.

The expected Pi values are:

```text
DATA_DIR=/home/iniwa/docker/mkw-stats
FRONTEND_PORT=3030
BACKEND_PORT=8001
```

## Decision

When redeploying the MKWorld Stats Manager stack through the Portainer HTTP API, preserve and resend the stack's existing environment variables in the update payload.

Do not send a minimal payload that only changes `pullImage` or stack file content unless the Portainer API endpoint being used is confirmed to retain existing environment values.

If a Portainer API redeploy unexpectedly tries to bind host ports `3000` or `8000`, first check whether the redeploy payload omitted environment variables before changing compose files or container settings.

## Reason

`deploy/portainer-stack.yml` is designed to work with both local/default and Pi-specific values. The Pi deployment relies on stack environment values to avoid existing service ports and to keep data under `/home/iniwa/docker/mkw-stats`.

Losing those values during redeploy creates a false deployment failure even when the Docker images, database migration, and application code are correct.

## Constraints Introduced

- Pi verification handoffs that use Portainer API redeploys should explicitly mention preserving existing stack env values.
- The documented Pi host ports remain frontend `3030` and backend `8001`.
- Do not "fix" this failure by changing the stack back to conflicting Pi ports.
- Treat Portainer API redeploys as stateful stack updates: retrieve or carry forward the existing env values before submitting the update.

## Do Not Change Casually

Do not remove the environment-variable based Portainer stack configuration just because an API redeploy omitted env values once.

Do not assume Portainer UI redeploy behavior and Portainer API update behavior preserve the same fields unless verified.
