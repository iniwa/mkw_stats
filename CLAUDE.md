# CLAUDE.md

## Purpose

This file defines Claude Code execution rules for `mkw_stats`. `AGENTS.md`
owns design intent, model selection, handoff policy, and Codex review.

## Project Context

- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL; entry point
  `backend/app/main.py`.
- Frontend: React, TypeScript, Vite; entry point `frontend/src/main.tsx`.
- Production: Raspberry Pi 4 Docker on `linux/arm64`, managed by the existing
  Portainer stack in `deploy/portainer-stack.yml`.
- Local development uses the root `docker-compose.yml`.

## Execution Rules

- If the user writes in Japanese, respond in Japanese.
- Keep delegated Windows command lines ASCII-only. Put non-ASCII instructions
  in the UTF-8 handoff file instead of embedding them in the command line.
- Before editing, read `AGENTS.md`, this file, the supplied handoff, and the
  files and current design records listed for inspection.
- The handoff or equivalent inline prompt is the approved task scope. It may
  narrow durable project constraints but may not weaken them.
- Before editing, capture `git status --short` when Git is available. After
  editing, compare the final status and diff with that baseline. Do not reset,
  clean, stage, or rewrite pre-existing changes.
- Implement and report only the current independently verifiable slice. Stay
  within its approved files, constraints, and non-goals.
- Subagents are optional and limited to clearly parallel mechanical work within the same files, scope, and constraints.
- If instructions conflict, listed files are insufficient for the first scoped
  edit, or a design, schema, dependency, deployment, storage, port, domain, or
  external-exposure change is required, stop and return the question to Codex.
- Preserve ranked VR/Lounge source separation, manual VR ownership, 12-race
  Lounge behavior, non-blocking warnings, and map-point course selection.
- Follow the existing stack, conventions, and dependency-management approach.
  Prefer small changes and minimal dependencies.
- Preserve unrelated changes and treat unexpected diffs as having unknown
  authorship.
- Do not commit, push, deploy, publish images, or operate Portainer unless the
  approved task explicitly includes the action.

## Safety and Environment

- Do not inspect secrets, credentials, or personal data unless their contents
  are strictly necessary for the approved task.
- Do not edit secrets, credentials, `.env`, local settings, `data/`,
  `backups/`, production databases, or runtime state unless the approved task
  explicitly requires the change.
- Never reproduce secrets, credentials, personal data, or private
  infrastructure values in prompts, handoffs, reports, or external tools.
- Do not rewrite the v0.1 planning snapshot unless explicitly requested.
- Preserve the current separate service images, `linux/arm64` support,
  Portainer stack, registry flow, container identities, ports, storage, restart
  policy, timezone, and LAN-only exposure boundary.
- Do not add dependencies or change build tooling, packaging, CI/CD,
  deployment, or external exposure outside explicit scope.

## Verification and Report

Run the smallest relevant checks. Standard component checks are:

```powershell
Set-Location backend
python -m pytest
Set-Location ../frontend
npm run typecheck
npm test
npm run build
```

Run PostgreSQL/Alembic verification only when a migration is in scope. For UI
changes, perform an available browser-level check and report any check that
cannot run.

Report changed files, a concise summary, each verification command and result,
blocked checks, partial edits, subagent usage, unexpected findings, and design
questions for Codex. Report `status=complete` only after meeting the acceptance
criteria. Otherwise report `status=interrupted`, usable partial results,
verification, remaining scope, and the resume condition.
