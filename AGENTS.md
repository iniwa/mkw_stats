# AGENTS.md

## Purpose

This is the Codex-side working agreement for `mkw_stats`. It records the
project's durable product and deployment constraints, model and handoff policy,
review rules, and documentation lifecycle. `CLAUDE.md` contains Claude Code
execution rules.

## Project

MKWorld Stats Manager is a private, single-user Mario Kart World statistics
and play-assist web application. It has a FastAPI, SQLAlchemy, Alembic, and
PostgreSQL backend plus a React, TypeScript, and Vite frontend. Production runs
in Docker on Raspberry Pi 4 with `linux/arm64` images managed through the
existing Portainer stack.

Before substantial work, read `README.md`, `docs/README.md`, relevant current
documents under `docs/design/` and `docs/decisions/`, and any active handoff.
The files under `mkworld_stats_manager_docs_v0_1/` are the original planning
snapshot, not the living design; do not rewrite them casually.

Shared generation sources are under `D:/Git/CLAUDEmdStrage/_base/`; this
project uses the common sources plus the Windows, Docker, and Web profiles.

## Model and Role Policy

- Use GPT-5.3-Codex-Spark (`gpt-5.3-codex-spark`) proactively, when available,
  for low-risk, well-scoped, independently verifiable supporting work that
  requires no material design judgment or source-code implementation.
- GPT-5.6 Terra (`gpt-5.6-terra`) or Sol (`gpt-5.6-sol`) owns requirements and
  design. Whenever Terra is used, set its reasoning level to `high`. Prefer Sol
  for substantial ambiguity, risk, or cross-boundary reasoning.
- After design is fixed, delegate source-code implementation first to Claude
  Code Sonnet 5 at effort medium from the repository root.
- Only when Sonnet 5 is unavailable because of usage limits or service
  availability, use GPT-5.6 Luna (`gpt-5.6-luna`) with reasoning level `max`
  for the same implementation slice.
- Implementation failure, failed verification, or a design question is not
  model unavailability; return it to Codex.
- Apply this policy to every coordinating Codex model and its subagents. Do not
  create coordinator-specific exceptions.
- Codex may keep requirements, design, review, read-only investigation,
  synthesis, and small documentation-consistency changes in one context.

## Product and Data Rules

- Keep the MVP practical and deliver working vertical slices before widening
  feature coverage.
- Preserve the shared Playing UI while keeping ranked VR and Lounge data
  separated by `source`; never merge VR and MMR semantics.
- Ranked VR remains manual input. Do not assume an official ranked VR API.
- Lounge API synchronization is table/player oriented. Race-level course
  history is recorded through the Playing UI. A Lounge match has 12 races;
  repick warnings must not block recording.
- Course selection remains map-point based: start point, destination point,
  and confirmation before recording.
- Initial operation remains LAN-only. Do not add external exposure, Cloudflare
  Tunnel behavior, multi-user support, OCR, video analysis, Discord bot
  integration, or heavy media processing unless explicitly approved.
- Preserve existing schema and seed behavior. Treat coordinate calibration and
  production records as user data, not disposable generated state.

## Deployment Rules

- Keep `linux/arm64` compatibility and the existing separate backend and
  frontend image boundaries.
- Use `deploy/portainer-stack.yml` as the Raspberry Pi deployment source. The
  root `docker-compose.yml` is for local development.
- Preserve the existing GHCR, GitHub-mirror, Portainer, container identity,
  port, persistent-volume, restart, and timezone conventions recorded in the
  deployment files and active decisions.
- Do not change image names, registry publication, CI/CD, deployment flow,
  storage, ports, domains, or external exposure unless the approved task
  explicitly includes it.
- Do not deploy, commit, or push unless explicitly requested.

## Protected Files and State

- Do not read, edit, delete, print, or commit `.env`, credentials, local
  settings, `data/`, `backups/`, production databases, or production runtime
  state unless a task explicitly requires an approved operation.
- Preserve unrelated working-tree changes. Treat unexpected diffs as having
  unknown authorship and exclude them from the current task.

## Handoff Workflow

- Keep policy, design, review, investigation, and small documentation changes
  in Codex. Delegate only after the goal, files, constraints, non-goals, data
  sources, and verification are clear.
- One handoff covers one cohesive, independently verifiable route, subsystem
  boundary, or lifecycle path plus its direct regression coverage.
- Put substantive handoffs in
  `docs/handoffs/YYYY-MM-DD-<short-task>.md`. Run unresolved discovery as a
  separate read-only slice.
- If a broad handoff times out before its intended edit, do not rerun it
  unchanged. Narrow the behavior, files, and verification first.
- The implementer changes only the current slice and returns design questions
  to Codex. Codex reviews the report and diff before preparing another slice.
- Keep active or blocked handoffs in `docs/handoffs/`. Move a handoff to
  `docs/handoffs/archive/` only after implementation, verification, review,
  required runtime work, and follow-up are complete.

## Review, Verification, and Documentation

Review scope, product rules, protected data, schema behavior, dependencies,
deployment, external exposure, verification, and unrelated diffs. Normal
focused checks are:

```powershell
Set-Location backend
python -m pytest
Set-Location ../frontend
npm run typecheck
npm test
npm run build
```

Use PostgreSQL and Alembic checks when a migration is in scope, and use a
browser-level check for affected UI behavior when available.

Keep `AGENTS.md` short and current. Use `docs/design/` for living design,
`docs/decisions/` for decision context and evidence, `docs/handoffs/` for
active or blocked work, and `docs/handoffs/archive/` for completed handoffs.
The accepted deployment and data decisions under `docs/decisions/` replace the
former chronological Decision Log in this file.
