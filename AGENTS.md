# AGENTS.md

## Purpose
This file is the Codex-side operating document for MKWorld Stats Manager.

`AGENTS.md` records durable design intent, directory rules, handoff workflow, and review criteria for Codex. `CLAUDE.md` records Claude Code execution rules. When they conflict, preserve the project-specific intent in this file and stop to clarify before changing implementation direction.

## Project Summary

- Project name: MKWorld Stats Manager
- Purpose: Personal Mario Kart World stats and play-assist web tool for VR records, Lounge match history, course notes, and lightweight analysis.
- Primary users: Single personal user on LAN.
- Runtime target: Raspberry Pi 4, Docker, `linux/arm64`.
- Development location: `D:\Git\mkw_stats` on Home Sub PC.
- Repository path: `D:\Git\mkw_stats`
- Public/private: Private unless explicitly changed.
- Deployment target: Raspberry Pi via Portainer Stack, using GHCR images.

## Current Design Sources

- `mkworld_stats_manager_docs_v0_1/` is the initial design proposal snapshot.
- Treat those files as the v0.1 source material until the design is promoted into `docs/design/`.
- Do not edit the snapshot casually. If the living design changes, record the updated rule in `docs/design/` or `docs/decisions/`.

## Directory Management

Use these directories consistently:

| Path | Purpose |
|---|---|
| `docs/README.md` | Directory map and document lifecycle rules. |
| `docs/design/` | Living design docs that future implementation should follow. |
| `docs/decisions/` | Active durable decisions with context and constraints. |
| `docs/decisions/archive/` | Decisions that are fully implemented or no longer active. |
| `docs/handoffs/` | Active Claude Code handoff files awaiting implementation or review. |
| `docs/handoffs/archive/` | Completed handoffs after Codex review. |
| `mkworld_stats_manager_docs_v0_1/` | Original v0.1 planning snapshot. |
| `deploy/portainer-stack.yml` | Raspberry Pi Portainer Stack source. |

Handoff files must be named:

```text
docs/handoffs/YYYY-MM-DD-<short-task>.md
```

Move a handoff to `docs/handoffs/archive/` only after Claude Code has reported back and Codex has reviewed the result. Do not archive a handoff just because implementation started.

## Environment Selection

Codex must identify the working environment before preparing implementation instructions.

- `D:/Git/` -> Home Sub PC
- `C:/Git/` -> Home Main PC
- `C:/Users/**/Documents/git/` -> Remote PC

Home Sub PC is the current development environment:

- CPU: AMD Ryzen 9 5950X
- GPU: NVIDIA RTX 5060 Ti, 16GB VRAM, CUDA Compute 8.9 / sm_89
- RAM: 64GB
- OS: Windows 11
- IP: 192.168.1.211

Raspberry Pi deployment target:

- Raspberry Pi 4, 8GB RAM, `linux/arm64`
- Docker management: Portainer Stack Web Editor
- Accessible via `ssh iniwapi` for reading code or logs when needed

If runtime behavior depends on PC vs Raspberry Pi, state the target explicitly in the handoff.

## Project-Specific Design Principles

- Keep the MVP practical and small. Build a working vertical slice before broad feature coverage.
- Preserve the shared Playing UI model for ranked VR and Lounge.
- Keep ranked VR and Lounge data separated by `source`; do not merge VR and MMR semantics.
- VR is manual input. Do not assume an official ranked VR API exists.
- Lounge API sync is table/player oriented. Race-level course history is manually recorded in the Playing UI.
- Course selection is map-point based: start point -> destination point, with confirmation before recording.
- Lounge records 12 races per match and warns on repicks, but warnings must not block recording.
- Initial operation is LAN-only. Do not add external exposure or Cloudflare Tunnel changes unless explicitly requested.
- Avoid OCR, video analysis, Discord bot integration, multi-user support, and heavy media processing in the MVP.
- Do not add installers, packaging beyond Docker, or CI/CD behavior beyond the agreed GHCR build flow.

## Docker / Raspberry Pi Guidance

- Target architecture: `linux/arm64`.
- GHCR image convention:
  - Backend: `ghcr.io/iniwa/mkw-stats-backend:latest`
  - Frontend: `ghcr.io/iniwa/mkw-stats-frontend:latest`
- Source repo may live on Gitea, but GHCR publishing requires a GitHub mirror or GitHub remote where `.github/workflows/docker-publish.yml` runs.
- Deploy flow: push to `main` on Gitea -> mirror/push to GitHub `main` -> GitHub Actions -> GHCR -> Portainer Stack.
- Containers should use `restart: unless-stopped`.
- Containers should set `TZ=Asia/Tokyo`.
- Container data and DB should live under `/home/iniwa/docker/mkw-stats/`.
- Portainer Stack should set `DATA_DIR=/home/iniwa/docker/mkw-stats`; compose should persist PostgreSQL under `$DATA_DIR/postgres`.
- Use `deploy/portainer-stack.yml` for Raspberry Pi Portainer deployment. The root `docker-compose.yml` is for local development and may include `build:` entries.
- Raspberry Pi host ports `3000` and `8000` are already used by existing services. MKW Portainer defaults should use frontend `3030` and backend `8001`.
- Use NAS mounts only for large data, shared media, backups, or Git/LFS data.
- Do not change external exposure or Cloudflare Tunnel behavior unless explicitly requested.

## Storage Guidance

| Data | Path | Backend |
|---|---|---|
| Container data / DB | `/home/iniwa/docker/mkw-stats/` | SSD |
| Git repo / LFS | `/mnt/nas/git-data/` | NFS |
| Photos | `/mnt/nas/photo/` | SMB |
| Videos | `/mnt/nas/video/` | SMB |
| Pi backups | `/mnt/nas/pi_backup/` | SMB |
| Network backups | `/mnt/nas/NetBackup/` | NFS |

NAS device:

- Synology DS420j
- IP: 192.168.1.190

## Role Split

Codex is responsible for:

- clarifying requirements and success criteria
- identifying the change type and risk level
- preserving design intent and responsibility boundaries
- deciding whether work should stay in Codex or be handed off to Claude Code
- preparing concrete Claude Code handoffs
- reviewing Claude Code output against this file and the handoff
- recording durable decisions in this file or `docs/*.md`

Claude Code is responsible for:

- executing clear, scoped handoffs
- following the project `CLAUDE.md`
- staying inside allowed files and constraints
- running requested verification where possible
- reporting changed files, summary, verification results, blocked checks, and design questions

Codex may implement small or design-sensitive changes directly. Use Claude Code when the task is clear, scoped, repetitive, execution-heavy, or benefits from Claude Code tooling.

## Decision Rule

Keep the task in Codex when:

- requirements are ambiguous
- design intent is still being negotiated
- responsibility boundaries may change
- the change is small enough to implement and verify in one context
- the main value is review, synthesis, or documentation consistency

Hand off to Claude Code when:

- goal, files, constraints, non-goals, and verification are clear
- the task is mostly implementation or mechanical editing
- the allowed edit scope can be stated explicitly
- the project already has a suitable `CLAUDE.md`

## Handoff Workflow

When the user wants the "Codex specifies, Claude Code executes" flow:

1. Codex reads project context, `AGENTS.md`, `CLAUDE.md`, `docs/`, and relevant files.
2. Codex decides whether the task is ready for handoff.
3. Codex writes a concrete handoff file under `docs/handoffs/`.
4. Codex reports the handoff file path to the user.
5. The user gives that file path to Claude Code.
6. Claude Code reads the handoff file, implements, and reports back.
7. Codex reviews the report and/or diff.
8. After review, Codex moves the handoff to `docs/handoffs/archive/` if it is complete.

Codex should not hand off vague requests. Before handing off, reduce the work to known files, constraints, non-goals, and verification.

## Codex Output Format For Claude Code

When preparing a handoff, create `docs/handoffs/YYYY-MM-DD-<short-task>.md`. The file should contain this block:

```md
Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal
...

## Background
...

## Files To Inspect
- ...

## Files To Edit
- ...

## Constraints
- ...

## Non Goals
- ...

## Verification
- ...

## Expected Report
- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
```

Handoff quality rules:

- Name concrete source documents and files.
- Keep each handoff small enough to review.
- For UI work, state mandatory controls and states.
- For API work, state endpoint names, expected behavior, and tests.
- For Docker/deploy work, state the target architecture and whether Portainer/GHCR behavior may change.

## Codex Review Checklist

After Claude Code returns, Codex should review:

- Did the diff stay inside the handoff?
- Did any file outside `Files To Edit` change? If yes, was it necessary?
- If unexpected unrelated diffs appear, treat authorship as unknown unless confirmed. State neutrally that they should be excluded from the current task/commit.
- Did the implementation preserve stated constraints and non-goals?
- Did it introduce dependencies, build tooling, packaging, CI/CD, or deployment behavior unexpectedly?
- Did it touch secrets, credentials, `.env`, or local settings?
- Did verification run, and are blocked checks explained?
- Does any discovery need to become a new `AGENTS.md`, `docs/design/`, or `docs/decisions/` entry?

## Knowledge Persistence

Use `AGENTS.md` for short durable workflow and design rules.

Use `docs/design/` for living technical design, API notes, schema notes, and implementation guidance.

Use `docs/decisions/` for decisions that need context, reason, constraints, and review warnings.

Before starting meaningful work, Codex should check whether `docs/` contains relevant context. After implementation, Codex should decide whether new knowledge should be recorded.

## Decision Log

### 2026-05-22: Project document structure

Context:

- MKWorld Stats Manager has a v0.1 design snapshot and needs a repeatable Codex-to-Claude implementation workflow.

Decision:

- Keep `mkworld_stats_manager_docs_v0_1/` as the original design snapshot.
- Use `docs/design/` for living design docs, `docs/decisions/` for active decisions, and `docs/handoffs/` for active Claude Code handoffs.
- Archive completed handoffs under `docs/handoffs/archive/` after Codex review.

Reason:

- This separates source planning material, active implementation instructions, and reviewed historical work.

Constraints Introduced:

- New handoffs must be written under `docs/handoffs/`.
- Do not place active handoffs in the design snapshot directory.

Do Not Change Casually:

- Do not collapse active handoffs, decisions, and design drafts into a single directory.

### 2026-05-22: Split service images for scaffold

Context:

- The initial scaffold has separate backend and frontend services with separate Docker build contexts.

Decision:

- Publish separate GHCR images for backend and frontend instead of a single `mkw-stats` image.
- Use `DATA_DIR=/home/iniwa/docker/mkw-stats` in Portainer Stack for persistent service data.

Reason:

- Separate images match the current service boundaries and keep each container build simple.
- `DATA_DIR` keeps Pi persistence explicit while preserving local compose defaults.

Constraints Introduced:

- Backend image: `ghcr.io/iniwa/mkw-stats-backend:latest`.
- Frontend image: `ghcr.io/iniwa/mkw-stats-frontend:latest`.
- PostgreSQL data should persist under `$DATA_DIR/postgres` on Raspberry Pi.

Do Not Change Casually:

- Do not return to a single image unless the deployment architecture changes.

### 2026-05-22: GHCR requires GitHub mirror

Context:

- Portainer verification found that GHCR images do not exist because the only configured remote is Gitea.
- GitHub Actions does not run from the Gitea remote.

Decision:

- Keep Gitea as the primary source repository if desired, but add a GitHub mirror or GitHub remote for the purpose of running GitHub Actions and publishing GHCR images.
- Do not switch the project to ad hoc local image builds for Raspberry Pi deployment.

Reason:

- The project already targets GHCR image names and Portainer image-only deployment.
- A GitHub mirror preserves that deployment model with the least change to app code and stack files.

Constraints Introduced:

- GHCR verification is blocked until GitHub `main` receives the repository and runs `.github/workflows/docker-publish.yml`.
- Portainer deployment verification should resume only after `ghcr.io/iniwa/mkw-stats-backend:latest` and `ghcr.io/iniwa/mkw-stats-frontend:latest` exist.

Do Not Change Casually:

- Do not replace GHCR with another registry unless GitHub mirror/GHCR publication is explicitly rejected.
