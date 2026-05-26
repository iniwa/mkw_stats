Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
If verification would require repository edits or deployment changes outside this handoff, stop and ask before changing anything.

## Goal

Perform the final MVP release-readiness check for MKWorld Stats Manager.

This is a verification-only handoff. Confirm that the app is ready for normal personal LAN use from the current clean Pi baseline.

## Background

The MVP implementation has passed the main empty-database E2E smoke:

- Pi DB was reset to a clean record baseline.
- Master data remains present:
  - 30 courses
  - 203 routes
  - 30 map points
  - 2 VR accounts
  - 1 app settings row
- One ranked recording flow was verified and then cleaned up.
- Final record tables were returned to zero.
- Daily user documentation exists at `docs/design/user-guide.md`.
- Operations runbook exists at `docs/design/operations.md`.
- Active handoffs were empty before this final check handoff was created.

Use this check to decide whether the current build can be treated as MVP-ready.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/README.md`
- `docs/design/README.md`
- `docs/design/user-guide.md`
- `docs/design/operations.md`
- `docs/design/ui-redesign-roadmap.md`
- `docs/handoffs/README.md`
- `deploy/portainer-stack.yml`
- `.github/workflows/docker-publish.yml`

## Files To Edit

None.

Do not modify repository files in this handoff.

## Required Work

### 1. Repository State

On the development PC, confirm:

- working tree is clean before verification
- current branch is `main`
- there are no active implementation handoffs except this verification handoff
- there are no unexpected untracked artifacts such as:
  - screenshots under `frontend/`
  - `backend/test_browser.db`
  - temporary logs/dumps inside the repo

Do not delete files unless explicitly approved by Codex/user. Report anything suspicious.

### 2. Documentation Readiness

Confirm these docs exist and are readable:

- `README.md`
- `docs/design/user-guide.md`
- `docs/design/operations.md`
- `docs/design/ui-redesign-roadmap.md`

Check for:

- broken local links among these docs
- obvious mojibake or replacement characters in rendered/source text
- contradiction between `README.md`, `user-guide.md`, and `operations.md` for:
  - Pi URL
  - frontend/backend ports
  - Portainer env variables
  - clean baseline/reset guidance

Do not edit docs in this handoff. Report any doc issue as a finding.

### 3. Deployment/GHCR/Portainer Sanity

On Pi / Portainer:

- confirm containers are running:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- confirm published images are the expected GHCR images:
  - `ghcr.io/iniwa/mkw-stats-backend:latest`
  - `ghcr.io/iniwa/mkw-stats-frontend:latest`
- confirm stack env values are preserved:
  - `DATA_DIR=/home/iniwa/docker/mkw-stats`
  - `POSTGRES_DB=mkw_stats`
  - `POSTGRES_USER=mkw`
  - `POSTGRES_PASSWORD` present, but do not print the value
  - `FRONTEND_PORT=3030`
  - `BACKEND_PORT=8001`
- confirm backend is bound to host port `8001`, not `8000`
- confirm frontend is bound to host port `3030`

No redeploy is required unless the running stack is clearly stale or broken. If redeploy is needed, stop and ask before doing it.

### 4. Backend / Database Baseline

Confirm:

- direct health: `GET http://192.168.1.205:8001/api/v1/health`
- proxy health: `GET http://192.168.1.205:3030/api/v1/health`
- Alembic current is `005 (head)` or otherwise report the exact current revision
- API baseline:
  - play sessions: zero
  - active sessions: zero
  - race records: zero, if checked through DB
  - rating snapshots: zero, if checked through DB
  - notes: zero
  - map annotations: zero
  - courses: 30 active
  - routes: 203 active
  - map points: 30
  - VR accounts: 2, with `current_vr = initial_vr`
  - app settings present

Use API where practical; DB checks are acceptable for counts that do not have a direct endpoint.

### 5. Web GUI Smoke

Using `http://192.168.1.205:3030`, hard reload first.

Confirm each view loads without JavaScript/React errors:

- Dashboard
  - backend status OK
  - empty sessions state
  - counts: 30 courses, 203 routes, 0 notes, 0 annotations
- Playing
  - initial screen loads
  - ranked start area visible
  - Lounge start area visible
  - course target picker loads
- Records
  - empty session state
  - filters do not crash
- Analytics
  - ranked empty state or zero summary without crash
- Lounge
  - Lounge empty state without crash
  - MMR panel/trend area does not crash without sessions
- Courses
  - target selector works
  - selecting one course shows empty notes/annotations
- Settings
  - VR accounts render
  - Lounge settings render

Do not create lasting test records in this final check unless needed to diagnose a bug.

### 6. Responsive / Browser Noise

Check at 375px width:

- Dashboard has no horizontal overflow
- Playing initial screen has no horizontal overflow
- Records empty state has no horizontal overflow
- Courses target-scoped empty notes/annotations area has no horizontal overflow

Check browser console:

- no JavaScript/React errors
- no recurring `favicon.ico` 404
- any network error must be explained and classified as blocking/non-blocking

### 7. Release Decision

Conclude one of:

- `MVP ready for personal LAN use`
- `MVP ready with non-blocking notes`
- `Not ready`

If not ready, list the smallest next handoff needed.

## Constraints

- Verification-only.
- Do not modify repository files.
- Do not commit.
- Do not push.
- Do not redeploy without asking first.
- Do not run destructive SQL.
- Do not print secrets.
- Do not create new persistent play data unless explicitly needed for diagnosis.
- If temporary data is created, clean it up before reporting and state exactly how.

## Non Goals

- No new code.
- No documentation edits.
- No feature implementation.
- No full ranked or Lounge regression test.
- No record-only cleanup apply unless temporary data was created.
- No external exposure / Cloudflare changes.

## Verification

Expected final state:

- repository unchanged
- Pi DB remains clean baseline
- containers healthy
- GUI views load
- no blocking browser errors
- clear MVP readiness decision

## Expected Report

- Changed files: should be `None`
- Repository state
- Documentation readiness findings
- Deployment/Portainer status
- Backend/API/DB counts
- Web GUI smoke results
- 375px responsive results
- Console/network errors
- Final DB residual data
- Release decision
- Blocked checks
- Design questions for Codex
