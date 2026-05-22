# 2026-05-22: Portainer-managed exec policy

## Context

Raspberry Pi deployment is managed through Portainer Stack Web Editor. During deployment verification, migration and seed commands were run with SSH `docker exec` against the Portainer-created backend container instead of through the Portainer console.

## Decision

Allow SSH `docker exec` against containers created by the Portainer-managed `mkw-stats` stack for verification and maintenance commands such as:

```sh
docker exec mkw-backend alembic upgrade head
docker exec mkw-backend python -m app.seed.initial_data
```

Do not use SSH to run `docker compose up`, recreate the stack, or otherwise bypass Portainer stack management.

## Reason

The ownership boundary is stack management, not every container console command. Executing commands inside the already Portainer-managed backend container preserves Portainer as the deployment owner while allowing practical verification.

## Constraints Introduced

- Stack creation, updates, environment variables, image changes, and port mappings must remain Portainer-managed.
- SSH `docker exec` is acceptable only for commands inside existing Portainer-created containers.
- Use the fixed container names `mkw-postgres`, `mkw-backend`, and `mkw-frontend` for verification and maintenance commands.
- Do not create parallel containers or compose projects from SSH for this app.

## Do Not Change Casually

Do not expand SSH usage into direct Docker Compose deployment unless the deployment management model changes.
