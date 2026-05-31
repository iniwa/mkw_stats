Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Audit the current repository state after several ClaudeCode-led changes, without implementing new features.

The purpose is to give Codex a reliable snapshot so the next implementation slice can be chosen from facts rather than memory.

## Background

Codex last had a reliable review point around the image asset candidate work. Since then, ClaudeCode has continued independently and the recent git log includes work such as:

- course / route image additions
- icon-type annotation support
- route goal-image annotation support
- VR / Lounge / Analytics tab split
- session delete PostgreSQL FK fixes
- Lounge MMR game string and current MMR persistence fixes
- `issues.md` adjustments

The user wants Codex to decide the next work after this audit.

Known deployment target:

- Raspberry Pi app URL: `http://192.168.1.205:3030`
- Backend URL: `http://192.168.1.205:8001`
- Portainer stack ID: 66
- Containers: `mkw-postgres`, `mkw-backend`, `mkw-frontend`

This handoff is report-only. Do not change app behavior.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `issues.md`
- `docs/handoffs/README.md`
- `docs/design/README.md`
- `docs/design/ui-redesign-roadmap.md`
- `docs/design/image-asset-candidates.md`
- `docs/design/course-image-assets.md`
- `docs/design/route-image-assets.md`
- `docs/design/course-icon-assets.md`
- `docs/design/user-guide.md`
- `docs/design/operations.md`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/PlayingView.tsx`
- `frontend/src/RecordsView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/TargetImage.tsx`
- `frontend/src/WorldMapPicker.tsx`
- `frontend/src/api.ts`
- `backend/app/api/`
- `backend/app/services/`
- `backend/app/models/`
- `backend/app/schemas/__init__.py`
- `backend/alembic/versions/`
- `backend/tests/test_api.py`
- `frontend/public/assets/`
- `scripts/`

Use targeted inspection. Do not paste large file contents into the report.

## Files To Edit

None.

This is a verification/audit handoff. Do not edit source files, docs, assets, handoff indexes, or `issues.md`.

## Constraints

- Do not implement fixes.
- Do not create, delete, move, or rename files.
- Do not commit.
- Do not modify Pi data.
- Do not run destructive cleanup scripts.
- Do not download new images.
- Do not print secrets or `.env` values.
- Treat any untracked local files as user-owned unless clearly generated during this audit.
- If running Pi or Portainer checks, preserve Portainer env values and do not redeploy unless explicitly instructed by the user outside this handoff.

## Non Goals

- No feature implementation.
- No UI redesign.
- No asset acquisition.
- No database cleanup.
- No migration application.
- No GHCR / Portainer redeploy.
- No edits to `issues.md`; only report its current state.

## Audit Tasks

### 1. Repository State

Report:

- current branch
- `git status --short`
- latest 15 commits
- whether local branch is ahead/behind any configured upstream
- untracked files, especially generated images/logs/databases
- active handoffs under `docs/handoffs/` excluding `README.md` and `archive/`

### 2. Issues / Backlog State

Inspect `issues.md` and summarize:

- remaining unchecked items
- checked items that look implemented but not reflected in docs
- items that appear stale or duplicated
- items that need Codex design judgment before implementation

If `issues.md` is empty, state that explicitly and infer remaining work from docs/code instead.

### 3. Documentation Consistency

Check for inconsistencies among:

- `issues.md`
- `docs/design/ui-redesign-roadmap.md`
- `docs/design/image-asset-candidates.md`
- course/route/icon asset docs
- `docs/design/user-guide.md`
- `docs/design/operations.md`

Specifically check whether asset counts in docs match actual files under:

- `frontend/public/assets/courses/`
- `frontend/public/assets/routes/`
- `frontend/public/assets/course-icons/`
- `frontend/public/assets/maps/`

Also report any obvious mojibake or replacement-character text in user-facing docs.

### 4. Current Feature Inventory

Summarize current implemented behavior for:

- Playing ranked flow
- Playing Lounge flow
- Target/course/route image display
- world map picker and calibration
- course/route notes and annotations
- Records edit / hide / restore / delete
- VR Analytics
- Lounge view / MMR sync / MMR trend
- Settings relevant to VR/Lounge

For each area, identify likely remaining gaps.

### 5. Backend / Schema / API Inventory

Report:

- current Alembic head revision in the repo
- migration files present and their order
- API endpoints added since the result-model redesign if easily identifiable
- any suspicious mismatch between frontend API client and backend schemas/endpoints
- current backend tests count if tests are run

### 6. Build / Test Health

Run local verification if feasible:

- `python -m py_compile` on recently touched backend/scripts files, or a reasonable subset
- `python -m pytest tests/ -q` from `backend/`
- `npm run typecheck` from `frontend/`
- `npm run build` from `frontend/`

If any command is too slow, blocked, or requires missing services, skip it and report why.

### 7. Pi Smoke Check

Only if accessible without redeploying:

- `GET http://192.168.1.205:8001/api/v1/health`
- `GET http://192.168.1.205:3030/api/v1/health`
- current container status if available through approved SSH commands
- whether Pi appears to be running a commit/image that includes the latest local changes

Do not redeploy. Do not run migrations. Do not modify Pi DB.

### 8. Recommended Next Work

Provide a prioritized list of 3 to 6 next slices.

For each slice include:

- title
- why it should be next
- suggested owner: Codex direct / ClaudeCode handoff / user manual work
- risk level
- likely files involved
- verification needed

Call out which items are blockers before daily use, and which are polish/asset-completion work.

## Verification

Minimum:

- `git status --short`
- inspect `issues.md`
- inspect active handoffs
- count image assets under `frontend/public/assets/`

Preferred:

- backend tests if feasible
- frontend typecheck/build if feasible
- Pi health checks if accessible without redeploy

## Expected Report

Return a Japanese report with these sections:

- Changed files: must be `なし`
- Repository state
- Active handoffs
- Issues/backlog summary
- Documentation consistency
- Asset inventory
- Feature inventory and remaining gaps
- Backend/API/schema inventory
- Verification results
- Pi smoke results, or skipped reason
- Recommended next slices
- Blocked checks
- Design questions for Codex

