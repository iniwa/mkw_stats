# 2026-05-22: Raspberry Pi port defaults

## Context

Portainer verification found that the Raspberry Pi already has services bound to common development ports:

- `3000`: homepage
- `8000`: Portainer Edge tunnel

The MKWorld Stats Manager Portainer handoff originally used those ports, causing deployment conflicts.

## Decision

Use these Raspberry Pi host ports for MKWorld Stats Manager:

```text
FRONTEND_PORT=3030
BACKEND_PORT=8001
```

The internal container ports remain unchanged:

```text
frontend: 80
backend: 8000
```

## Reason

The frontend proxies `/api/` to `http://backend:8000` inside the Docker network, so changing host ports does not affect frontend-to-backend communication. The host ports are only for LAN browser/API access.

## Constraints Introduced

- `deploy/portainer-stack.yml` should default to `3030` and `8001`.
- Pi smoke tests should use:
  - `http://<pi-host>:3030`
  - `http://<pi-host>:8001/api/v1/health`

## Do Not Change Casually

Do not reuse `3000` or `8000` for this stack on Raspberry Pi unless the existing services are intentionally moved.
