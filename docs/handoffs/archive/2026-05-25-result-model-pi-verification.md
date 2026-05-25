Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
If verification would require source edits, destructive DB actions, or deployment changes outside this handoff, stop and ask before editing.

## Goal

Verify commit `d8d7e43` (`Redesign race result model`) on the Raspberry Pi Portainer deployment.

This is a verification-only handoff. Do not edit source files.

## Background

The result model redesign changed active race result semantics:

- ranked result input now uses numeric `placement` and `rating_after`
- server calculates `rating_delta`
- Lounge target selection now creates a draft race
- Lounge completion now uses `PATCH /api/v1/race-records/{race_id}/complete-lounge`
- `race_records` now has `placement`, `score`, `is_hidden`, `hidden_at`
- hidden races are excluded from default race lists, Lounge warning checks, and Lounge auto-finish counts

The local implementation was reviewed by Codex and passed:

- `python -m py_compile ...`
- `python -m pytest tests/` -> 82 passed
- `npm run typecheck`
- `npm run build`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/ui-redesign-roadmap.md`
- `docs/handoffs/archive/2026-05-25-result-model-redesign.md`
- `backend/alembic/versions/002_result_model_redesign.py`
- `backend/app/services/race_flow.py`
- `frontend/src/PlayingView.tsx`
- `frontend/src/api.ts`
- `deploy/portainer-stack.yml`

## Environment

- Raspberry Pi host is managed by Portainer.
- Stack/container names:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- Host ports:
  - frontend: `3030`
  - backend: `8001`
- Use Portainer redeploy with image pull if the running containers are older than commit `d8d7e43`.
- Do not use direct `docker compose up` for deployment.

## Verification Steps

### 1. GHCR / image availability

Confirm both images for the new commit are available:

- `ghcr.io/iniwa/mkw-stats-backend:sha-d8d7e43`
- `ghcr.io/iniwa/mkw-stats-frontend:sha-d8d7e43`

If SHA tag lookup is blocked by registry/API auth, verify that `latest` contains the new backend migration/API and frontend bundle after redeploy.

### 2. Portainer redeploy

If current containers are not running the new images, redeploy the `mkw-stats` stack from Portainer with image pull enabled.

Do not change stack environment variables or ports.

### 3. Migration

Run Alembic in the deployed backend container:

```text
alembic upgrade head
alembic current
```

Expected:

- revision `002` is applied
- `race_records` has `placement`, `score`, `is_hidden`, `hidden_at`
- existing course/route/note/settings data remains intact

### 4. API smoke checks

Check:

- `GET http://<pi>:8001/api/v1/health`
- `GET http://<pi>:3030/api/v1/health`
- OpenAPI contains:
  - `PATCH /api/v1/race-records/{race_id}/complete-ranked`
  - `PATCH /api/v1/race-records/{race_id}/complete-lounge`
  - `POST /api/v1/race-records/{race_id}/hide`
  - `GET /api/v1/play-sessions/{session_id}/races` with `include_hidden`

### 5. Ranked API flow

Create a temporary ranked session and race:

1. create ranked session
2. draft a course race
3. complete ranked with:
   - `player_count`
   - `placement`
   - `rating_after`
4. confirm response includes:
   - `placement`
   - `rating_before`
   - `rating_after`
   - calculated `rating_delta`
5. confirm the active VR account `current_vr` becomes `rating_after`

Finish the temporary session when done.

### 6. Lounge API flow

Create a temporary Lounge session:

1. create Lounge session
2. draft a course race
3. confirm draft response status is `draft`, not `completed`
4. complete it with `complete-lounge` using `placement` and `score`
5. confirm race status is `completed` and fields are persisted
6. draft a repeated course and confirm warning behavior still works

Finish the temporary session when done unless auto-finish is being tested.

### 7. Hidden race behavior

Create or reuse a temporary race:

- call `POST /api/v1/race-records/{race_id}/hide`
- confirm default `GET /play-sessions/{id}/races` excludes it
- confirm `include_hidden=true` includes it
- confirm hidden completed Lounge race does not trigger repick warning for the next draft

If practical, also confirm that hiding the 12th completed Lounge race reopens the session to active.

### 8. Web GUI smoke

Check the deployed frontend:

- Playing ranked flow shows numeric placement and result VR input
- Playing Lounge flow shows placement and score input after course confirmation
- Records shows placement and score without crashing
- Analytics loads without placement-band UI
- Lounge view loads
- Dashboard, Courses, Settings still load
- 375px width has no horizontal overflow in Playing result forms
- browser console has no React/JavaScript errors

## Constraints

- Verification only: do not edit source files.
- Do not delete master data, notes, annotations, settings, or VR accounts.
- Temporary sessions/races may remain if hard cleanup is not available, but finish active sessions before reporting.
- Do not change Portainer stack ports or environment.
- Do not alter GHCR, GitHub Actions, or deployment workflow.
- Remove any screenshots or temporary local files before reporting.

## Expected Report

Report in Japanese:

- Changed files, if any
- GHCR / image status
- Portainer / container status
- Migration result
- API verification results
- Web GUI verification results
- Temporary test data left behind
- Blocked checks
- Bugs found
- Design questions for Codex
