# mkw_stats

Private single-user MKWorld Stats Manager: React/TypeScript/Vite frontend, FastAPI/SQLAlchemy/Alembic/PostgreSQL backend, Docker Compose, Raspberry Pi 4 `linux/arm64`, GHCR and existing Portainer deployment. Read `README.md`, `docs/README.md`, living `docs/design/`, active decisions/handoffs, and affected service manifests. `mkworld_stats_manager_docs_v0_1/` is a planning snapshot.

Preserve ranked VR manual ownership, Lounge table/player synchronization, 12-race/session semantics, map-point/course ownership and calibration, seed idempotency, separate backend/frontend images, arm64, LAN-only exposure, GHCR/Portainer identity, and existing schema/migrations/data. Keep `.env`, credentials, `data/`, local settings, hosted data, deployment, publication, CI, and external exposure gated.

Use repository scripts and affected frontend/backend checks; `git diff --check` always. Do not invent a typecheck/lint command absent from manifests. User runtime model/effort belongs to configuration. Choose route from evidence; native delegation is conditional, one writer owns overlap, review follows stable self-review for named risk, and reset after a second correction/two blocked returns.

Keep current rules here, living design in `docs/design/`, rationale in `docs/decisions/`, and active/blocked handoffs in `docs/handoffs/`.

Authority reminder: runtime/tool/safety policy, explicit user policy, this entry, then task scope apply in that order; facts do not grant authority.

The current task may narrow standing permissions; it never widens data, schema, LAN-only, Portainer, deployment, or exposure gates. For bounded personal work, make a minimal diff and useful normal-path check, then use the established authorized target/procedure, smoke normal use, and correct observed failures. Cheap direct checks are optional; no speculative suite or new harness is required. If a target/check is unavailable, separate source readiness from operation. Only the primary delegates; configured roles must be observable or primary/equivalent continues, with parent permissions/live overrides/read-only behavior binding. Stable self-review precedes named-risk review and later edits invalidate it. A second correction or two blocked/partial returns requires primary contract restatement and one selected writer.
