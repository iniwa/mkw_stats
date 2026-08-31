# AGENTS.md

## Purpose

This is the Codex-side working agreement for `mkw_stats`. It records the
project's durable product and deployment constraints, model and handoff policy,
review rules, and documentation lifecycle. `CLAUDE.md` provides compatibility
guidance for implementation, verification, and reporting.

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

## Instruction Precedence

When instructions conflict, apply them in this order:

1. Runtime, tool, organization, and safety policy.
2. Explicit user instructions that change project policy.
3. Durable project instructions.
4. Other instructions for the current user task and the approved task scope.

The active handoff or equivalent inline prompt is the approved task scope.
Verified project facts override generation-source defaults. Only an explicit
user instruction to change project policy may revise a durable project rule;
other task instructions and approved scopes may narrow durable rules but may
not weaken them. Report unresolved conflicts instead of guessing.

- Prefer the smallest correct change and reuse existing capabilities before adding dependencies or parallel policy.
- Approvals and completion require concise, evidence-backed scope, verification, and residual-risk/blocked-check reporting.

## Model and Role Policy

- Before implementation, classify the initial route from acceptance evidence: `small-primary` for small or transfer-negative work, `bounded` for settled multi-step work with one verifiable writer, `adaptive` when unresolved native, platform, runtime, or cross-subsystem behavior is material, or `non-implementation` for analysis, design, review, or operations. This classification does not force delegation; reclassify only after a material scope change or contract reset.
- Use GPT-5.6 Sol as the preferred main worker; the user's actual runtime model and reasoning choice remains authoritative. Sol owns intent, design, approval boundaries, integration, and user communication and can directly finish small or transfer-negative work. Use configured Luna roles (`bounded_explorer`/`bounded_implementer`) for bounded work and Terra roles (`adaptive_implementer`/`bounded_reviewer`) for adaptive implementation or risk-justified review; do not force delegation or pin the main reasoning level in project instructions.
- Use native Codex roles: `bounded_implementer` is the cohesive default for settled work; choose `adaptive_implementer` directly when acceptance depends on unresolved native, platform, or cross-layer lifecycle behavior.
- Use `bounded_explorer` only for genuinely independent read-only questions and `bounded_reviewer` only when concrete correctness, security, compatibility, or verification risk warrants it. One active writer owns overlapping files or behavior.
- The writer's stable self-review gate is a dispatch barrier. If the writer changes the candidate after review starts, acceptance must be re-established; request a fresh final review only when material risk still warrants it. A second correction round, or two blocked/partial returns, requires a contract reset before continuing. If a selected role is unavailable or unobservable, use an observable equivalent or keep the work in the primary context.
- Name the concrete material risk in any reviewer handoff. Use a fresh task boundary for an independent phase with its own acceptance and verification; reintegrate delegated work from the stable diff and evidence instead of repeating its discovery.
- Claude Code is not an approved route unless an explicit policy change says so.
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
- Commit and push require explicit authorization. Routine reversible deployment/application and necessary restart may use the bounded personal-use allowance described in Protected Files and State on the established target and known procedure; other deployment requires explicit authorization.

## Protected Files and State

Personal-use iteration is the default unless the user or verified project
requirements establish stronger obligations. Make the smallest normal-path
change, run a brief useful check, perform routine reversible
deployment/application and any necessary restart through the known existing
user-controlled target and procedure, smoke normal use, fix observed
errors, and finish when normal operation works. Do not require speculative
edge-case coverage, hardening, abstractions, new tests, an offline harness, or
a full suite for ordinary changes. Required data, migration, security,
deployment, and approval gates still precede runtime; a required
pre-application review receives a stable source/diff candidate first. The
initial implementation or fix request supplies standing permission for this
bounded routine cycle, so no fresh confirmation is needed. This does not infer
Git commit/push/merge, publication/release/registry or hosted-config changes,
credentials/permissions/exposure, destructive data or migrations, new targets
or cost, or project-specific protected operations. If a target or check is
unavailable, report readiness separately; record only required deferred checks
in the existing issue or ledger with verification, approval, and resume
conditions.

- Do not inspect secrets, credentials, or personal data unless their contents
  are strictly necessary for the approved task.
- Do not edit secrets, credentials, `.env`, local settings, `data/`,
  `backups/`, production databases, or production runtime state unless the
  approved task explicitly requires the change.
- Never reproduce secrets, credentials, personal data, or private
  infrastructure values in prompts, handoffs, reports, or external tools.
- Preserve unrelated working-tree changes. Treat unexpected diffs as having
  unknown authorship and exclude them from the current task.

## Handoff Workflow

- Keep policy, design, review, investigation, and small documentation changes
  in Codex. Delegate only after the goal, files, constraints, non-goals, data
  sources, acceptance criteria, and verification are clear.
- One handoff covers one cohesive, independently verifiable route, subsystem
  boundary, or lifecycle path plus its direct regression coverage.
- Put substantive handoffs in
  `docs/handoffs/YYYY-MM-DD-<short-task>.md`. Run unresolved discovery as a
  separate read-only slice.
- Treat a delegation that stops before meeting its acceptance criteria as
  interrupted even when its process exits normally. Record usable partial
  results, verification, remaining scope, and the resume condition; narrow a
  broad handoff before rerunning it.
- The implementer changes only the current slice and returns design questions
  to Codex. Codex reviews the report and diff before preparing another slice.
- Keep active or blocked handoffs in `docs/handoffs/`. Move a handoff to
  `docs/handoffs/archive/` only after implementation, verification, review,
  required runtime work, and follow-up are complete.

## Review, Verification, and Documentation

Review scope, product rules, protected data, schema behavior, dependencies,
deployment, external exposure, verification, and unrelated diffs. Available
checks; choose the smallest relevant command, and run a full suite only when
the task or a concrete risk requires it:

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
