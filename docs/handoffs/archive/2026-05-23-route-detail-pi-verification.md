Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
If verification would require changing files, changing Portainer stack structure, deleting data, or using credentials not already available to the user, stop and ask before proceeding.

## Goal

Verify on Raspberry Pi that the route detail frontend change from commit `8a2ad8e` is deployed and works in the Web GUI.

This is a verification handoff. Do not implement new features.

## Background

Codex reviewed and committed the route metadata frontend slice:

- Commit: `8a2ad8e Show route metadata in frontend`
- Added `frontend/src/RouteDetail.tsx`.
- Playing confirmation now shows route metadata only for `resolved.kind === 'route'`.
- Records race rows now show compact route metadata when a race has `route_id`.
- `image_url` links are filtered to `http:` / `https:` before rendering.

Route master data is already verified on Pi:

- `courses`: 30
- `map_points`: 30
- `routes`: 203
- `rt_peach_to_rainbow.tags.source_key = "29-30"`
- `rt_peach_to_rainbow.tags.sections = 5`

Current Pi / Portainer assumptions:

- Stack name: `mkw-stats`
- Containers:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- Host ports:
  - frontend: `3030`
  - backend: `8001`
- Web GUI URL: `http://<pi-host>:3030`
- Backend direct health URL: `http://<pi-host>:8001/api/v1/health`
- Frontend nginx proxy health URL: `http://<pi-host>:3030/api/v1/health`
- Pi can be inspected via `ssh iniwapi`.

Relevant decisions:

- `docs/decisions/2026-05-23-route-detail-ui-scope.md`
- `docs/decisions/2026-05-22-route-master-seed-strategy.md`
- `docs/decisions/2026-05-23-same-point-course-selection.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `.github/workflows/docker-publish.yml`
- `deploy/portainer-stack.yml`
- `frontend/src/RouteDetail.tsx`
- `frontend/src/PlayingView.tsx`
- `frontend/src/RecordsView.tsx`
- `frontend/src/App.css`
- Relevant decisions listed above

## Files To Edit

None.

This verification should not edit repository files. If a documentation correction seems necessary, report it to Codex instead of editing.

## Constraints

- Do not run `docker compose up` directly on the Pi.
- Portainer remains the deployment authority.
- It is acceptable to use `ssh iniwapi` and read-only Docker/API checks.
- Do not delete production data.
- Do not truncate route/course/race/session tables.
- Do not change container names, host ports, registry credentials, or Portainer stack YAML unless the user explicitly approves.
- Do not create new test sessions unless needed to verify Records route-detail behavior.
- If a test session is created, finish it and report the residual data.
- Do not commit.
- If GHCR/Portainer pull is blocked by registry auth, report the exact failure and stop. Do not invent a deployment workaround.

## Verification

### 1. GHCR / GitHub Actions

Confirm the GitHub mirror received commit `8a2ad8e` and Docker Publish completed for both images.

Verify frontend image availability and architecture:

- `ghcr.io/iniwa/mkw-stats-frontend:latest`
- `ghcr.io/iniwa/mkw-stats-frontend:sha-8a2ad8e` if present
- `linux/arm64` manifest exists

Backend should be unchanged functionally, but if the workflow built a backend image for the commit, record its status too.

### 2. Portainer Deployment State

Confirm the Portainer stack is running:

- `mkw-postgres`
- `mkw-backend`
- `mkw-frontend`

Confirm host port mappings:

- `mkw-backend`: `0.0.0.0:8001->8000`
- `mkw-frontend`: `0.0.0.0:3030->80`
- `mkw-postgres`: internal only

Confirm the running frontend container uses the latest route detail image, not an older image.

If Portainer has not re-pulled the latest image yet, ask the user to redeploy/re-pull through Portainer. Do not change the stack directly.

### 3. API Sanity

Confirm:

- `GET http://<pi-host>:3030/api/v1/health` returns HTTP 200.
- `GET http://<pi-host>:8001/api/v1/routes` returns 203 routes.
- Route `rt_peach_to_rainbow` has route detail metadata:
  - `tags.sections = 5`
  - `tags.source_key = "29-30"`
  - at least one of `goal_shape` or `goal_simple`
  - `image_url` if present is an http/https URL

### 4. Playing Web GUI Checks

Open:

```text
http://<pi-host>:3030
```

Check Playing view:

- Page loads without blank screen.
- Console has no app errors.
- Select `ピーチスタジアム -> レインボーロード`.
- Click `コースを確認`.
- Confirmation shows route detail block for the route:
  - セクション
  - ゴール or ルート形状, depending on available metadata
  - 参照 `29-30`
  - `参考画像を開く` link if `image_url` exists
- Existing buttons remain visible and functional:
  - `選び直す`
  - `はい、記録する`
- Click `選び直す` and confirm the picker returns without recording.
- Select `DKスノーマウンテン -> DKスノーマウンテン` using the same-point action.
- Click `コースを確認`.
- Confirmation is `通常コース` and does not show route detail block.

Do not create race records during this part unless explicitly needed.

### 5. Records Web GUI Checks

Open Records view.

Check:

- Existing records load with no console errors.
- If there is an existing session with a route race, select it and confirm compact route detail appears below the route race row.
- Course-only race rows do not show route detail.
- Cancelled route race rows may still show route detail if route metadata exists.
- Text wraps cleanly at narrow/mobile width; no overlap with tags, memo, warnings, or VR delta.

If there is no existing route race to inspect, it is acceptable to create one short test session through the UI or API:

- Create a ranked or lounge session.
- Record one route race, preferably `ピーチスタジアム -> レインボーロード`.
- Finish the session.
- Verify Records route detail.
- Report the residual completed test session.

Prefer not to create test data if existing Records data is enough.

## Non Goals

- No code changes.
- No backend changes.
- No DB schema changes.
- No seed changes.
- No image embedding.
- No map drawing.
- No route notes or annotations.
- No Lounge banned-route classification.
- No Cloudflare/external exposure changes.

## Expected Report

Report in Japanese:

- Changed files: should be none.
- GHCR/GitHub Actions status, including image digest or SHA tag if available.
- Portainer/container state and port mappings.
- API sanity results.
- Playing route detail verification results.
- Records route detail verification results.
- Console error count.
- Browser checks that were blocked and exact reason.
- Any residual test/session data if created.
- Design questions for Codex.

