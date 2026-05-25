Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Do a final release-readiness cleanup pass for MKWorld Stats Manager before treating the MVP as nearly complete.

This is a documentation and repository hygiene slice, not a feature slice.

The outcome should be:

- Clear operator-facing docs for Pi deployment, redeploy, migration, seed, backup, restore, data reset, and smoke checks.
- Clear handling of residual verification data and temporary local artifacts.
- `.gitignore` protects the repo from common screenshot/test DB/log artifacts created during UI verification.
- No destructive changes to the live Pi database.

## Background

The app is now functionally close to complete for the personal LAN MVP:

- Playing flow supports ranked VR and Lounge.
- Records supports correction, hide/restore, and hidden race review.
- Lounge MMR sync supports MKCentral and 12p/24p separation.
- Notes, annotations, route images, world-map picker, dashboard, analytics, and Lounge views are in place.
- Many Pi verification runs created temporary screenshots locally and completed test sessions in the Pi DB.

The user has said current record data is not important and may be deleted if needed, but deletion must still be treated carefully. In this slice, do not delete live data. Document how to reset data safely instead.

Important deployment lessons already discovered:

- Portainer stack ID 66 is normally redeployed with image pull enabled.
- Portainer API redeploy must preserve stack env values:
  - `DATA_DIR`
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
  - `FRONTEND_PORT=3030`
  - `BACKEND_PORT=8001`
- If env values are omitted, compose defaults can bind backend host port `8000`, conflicting with Portainer itself.
- Portainer does not auto-recreate containers after GHCR publishes `latest`.
- Browser hard reload may be required after frontend redeploy due cached hashed assets.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `.gitignore`
- `docs/README.md`
- `docs/design/README.md`
- `docs/design/deployment.md`
- `docs/design/ui-redesign-roadmap.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`
- `docs/decisions/2026-05-22-portainer-managed-exec-policy.md`
- `docs/decisions/2026-05-22-raspberry-pi-port-defaults.md`
- `deploy/portainer-stack.yml`
- `backend/alembic/versions/`

## Files To Edit

Preferred:

- `docs/design/deployment.md`
- `docs/design/operations.md` (new, if clearer than overloading deployment.md)
- `docs/design/README.md`
- `README.md`
- `.gitignore`
- `docs/handoffs/README.md`

Only edit docs and `.gitignore` unless you find a clear repository-hygiene issue that cannot be handled there.

## Required Work

### 1. Repository Artifact Audit

Check for local artifacts that should not be committed:

- root/frontend/backend screenshots from Playwright or manual verification
- `test_browser.db`
- local SQLite DBs
- `*.log`
- `*.tmp`
- generated browser artifacts outside ignored directories

If artifacts are untracked and clearly temporary, remove them.

If artifacts are tracked, do not remove them unless they are clearly accidental. The existing route image under `frontend/public/assets/routes/` is intentional and must stay.

Report what was found and what was removed.

### 2. `.gitignore` Hygiene

Update `.gitignore` only if needed to prevent known recurring temporary files from being added.

Reasonable patterns include:

- frontend-root screenshots such as `frontend/*.png`, `frontend/*.jpg`, `frontend/*.jpeg`, `frontend/*.webp`
- local browser DBs such as `backend/test_browser.db`
- logs or temp files if not already covered

Do not ignore `frontend/public/assets/**`, because route images, course icons, and map assets are intended repo assets.

### 3. Operations Runbook

Create or update docs so a future operator can perform normal maintenance without reading archived handoffs.

Document at least:

- Normal deploy flow:
  - push/mirror to GitHub
  - GitHub Actions publishes GHCR images
  - Portainer redeploy with image pull enabled
  - preserve env values
- Post-deploy checks:
  - container status
  - `GET :8001/api/v1/health`
  - `GET :3030/api/v1/health`
  - `alembic current`
  - hard browser reload after frontend redeploy if old bundle remains
- Migration and seed:
  - `alembic upgrade head`
  - `python -m app.seed.initial_data`
  - seed is idempotent
- Backup guidance:
  - what must be backed up (`$DATA_DIR/postgres`, optionally uploads/assets if ever moved there)
  - recommended pre-migration backup point
  - include a safe `pg_dump` example using `docker exec mkw-postgres`
- Restore guidance:
  - high-level restore steps
  - warn to stop/redeploy through Portainer, not ad hoc compose
- Data reset guidance:
  - do not casually drop the whole DB unless accepted
  - explain two options:
    - full reset: stop stack, backup, remove/recreate Postgres volume/data directory, redeploy, migrate, seed
    - record-only cleanup: delete play/race/note/annotation user data while preserving master courses/routes/settings, but only after a dedicated SQL handoff
  - do not provide an unreviewed destructive SQL block as a ready-to-run command in this slice
- External dependency notes:
  - MKCentral API may return non-JSON/maintenance responses; backend should convert this to 502
  - MMR sync depends on `lounge_player_id`, `lounge_season`, and player-count-based 12p/24p mapping

### 4. README Link Cleanup

Update `README.md` or `docs/design/README.md` so the operations/runbook doc is discoverable.

Do not rewrite the whole README. Keep changes scoped.

### 5. Active Handoff State

After your edits, `docs/handoffs/README.md` should still correctly show active implementation/verification state.

Do not archive this handoff yourself; Codex will archive it after reviewing your report.

## Constraints

- Do not modify application code.
- Do not modify Dockerfiles, GitHub Actions, or Portainer stack semantics.
- Do not run destructive DB commands.
- Do not delete live Pi data.
- Do not add deployment automation such as Watchtower.
- Do not commit screenshots, raw DB dumps, secrets, `.env`, Portainer tokens, or raw MKCentral response dumps.
- Keep docs practical and concise. This is a personal LAN tool, not enterprise runbook documentation.
- Preserve Japanese text if editing existing Japanese notes. Avoid mojibake; use UTF-8.

## Non Goals

- No new features.
- No UI redesign.
- No data deletion.
- No schema changes.
- No backup automation.
- No full production hardening or external exposure.

## Verification

Run:

```powershell
git status --short
git diff --check
```

If `.gitignore` changes, verify that intentional assets remain tracked:

```powershell
git ls-files frontend/public/assets/routes
```

No backend/frontend build is required because this is docs/gitignore only.

## Expected Report

- Changed files
- Summary
- Repository artifacts found and removed, if any
- `.gitignore` patterns added, if any
- Verification results
- Blocked checks
- Design questions for Codex
