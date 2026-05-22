# AGENTS.md

## Purpose
This file is the Codex-side base document for new projects.

Use it together with one of the base `CLAUDE.md` files in this directory:
- Windows / local tools: `_base/CLAUDE_windows.md`
- Windows detailed Japanese reference: `_base/CLAUDE_windows_ja.md`
- Raspberry Pi Docker tools: `_base/CLAUDE_docker.md`
- Raspberry Pi Docker detailed Japanese reference: `_base/CLAUDE_docker_ja.md`

`AGENTS.md` records design intent, handoff rules, and review criteria for Codex.
`CLAUDE.md` records execution rules for Claude Code.

When creating a new project, copy this file to the project root and replace the placeholder sections with project-specific information.

## Project Summary
Fill this in for each project.

- Project name:
- Purpose:
- Primary users:
- Runtime target:
- Repository path:
- Public/private:
- Deployment target:

## Environment Selection
Codex must identify the working environment before preparing implementation instructions.

### Work Location Detection
- `D:/Git/` -> Home Sub PC
- `C:/Git/` -> Home Main PC
- `C:/Users/**/Documents/git/` -> Remote PC

### Home Main PC
- CPU: AMD Ryzen 7 9800X3D
- GPU: NVIDIA RTX 4080, CUDA available
- RAM: 48GB
- OS: Windows 11
- IP: 192.168.1.210

### Home Sub PC
- CPU: AMD Ryzen 9 5950X
- GPU: NVIDIA RTX 5060 Ti, 16GB VRAM, CUDA Compute 8.9 / sm_89
- RAM: 64GB
- OS: Windows 11
- IP: 192.168.1.211

### Remote PC
- Limited environment.
- Focus on code and content editing.
- Do not assume local AI/ML runtimes such as ollama are available.

### Raspberry Pi
- Accessible via `ssh iniwapi` for reading code or logs.
- Docker target: Raspberry Pi 4, 8GB RAM, `linux/arm64`.
- Docker management: Portainer Stack Web Editor.

If the target PC or runtime is unclear, Codex should clarify it before preparing a handoff that requires execution or environment-specific behavior.

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

Do not treat this as a rigid split where Codex only designs and Claude Code only edits.
Codex may implement small or design-sensitive changes directly.
Use Claude Code when the task is clear, scoped, repetitive, execution-heavy, or benefits from Claude Code tooling.

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
- Claude Code-specific workflow, hooks, or subagents would be useful

## Project-Specific Design Principles
Fill this in for each project.

Examples:
- Keep the implementation lightweight.
- Prefer minimal dependencies.
- Do not introduce packaging, installers, CI/CD, or deployment changes unless explicitly requested.
- Preserve public APIs unless the user approves a design change.
- Keep business logic out of UI code unless the existing project already follows that pattern.
- Do not silently encode durable design decisions only in code.

## Windows / Local Tool Guidance
Use this for normal Windows projects, utility tools, AI/ML tools, static sites, and local automation.

- Prefer the simplest language and stack that fits the task.
- Python is the default for AI/ML tasks.
- Use GPU acceleration when it materially helps and the target PC has CUDA available.
- Prefer global Python packages unless dependency conflicts require `uv` or `venv`.
- Never use conda unless a dependency strictly requires it.
- Avoid installers, packaging, and CI/CD unless explicitly requested.
- For GUI tools, prefer lightweight options first. Escalate to heavier GUI frameworks only when needed.

## Docker / Raspberry Pi Guidance
Use this for tools deployed to Raspberry Pi via Docker.

- Target architecture: `linux/arm64`.
- Prefer arm64-compatible base images.
- GHCR image convention: `ghcr.io/iniwa/{tool-name}:latest`.
- Deploy flow: push to `main` -> GitHub Actions -> GHCR -> Portainer Stack.
- Containers should use `restart: unless-stopped`.
- Containers should set `TZ=Asia/Tokyo`.
- Consider memory limits because Raspberry Pi 4 has 8GB RAM shared by all containers.
- Container data and DB should usually live under `/home/iniwa/docker/{tool-name}/`.
- Use NAS mounts only for large data, shared media, backups, or Git/LFS data.
- Do not change external exposure or Cloudflare Tunnel behavior unless explicitly requested.

## Storage Guidance
For Raspberry Pi / NAS projects:

| Data | Path | Backend |
|------|------|---------|
| Container data / DB | `/home/iniwa/docker/{tool-name}/` | SSD |
| Git repo / LFS | `/mnt/nas/git-data/` | NFS |
| Photos | `/mnt/nas/photo/` | SMB |
| Videos | `/mnt/nas/video/` | SMB |
| Pi backups | `/mnt/nas/pi_backup/` | SMB |
| Network backups | `/mnt/nas/NetBackup/` | NFS |

NAS device:
- Synology DS420j
- IP: 192.168.1.190

## Design Record Scope
Keep `AGENTS.md` focused on short, durable rules that future Codex and Claude Code sessions must follow.

Do not add `Alternatives Considered` as a default Decision Log heading. When rejected options or longer background matter, summarize only the durable rule in `AGENTS.md` and put the detail under `docs/decisions/`.
## Handoff Workflow
When the user wants the "Codex specifies, Claude Code executes" flow:

1. Codex reads project context, `AGENTS.md`, `CLAUDE.md`, and relevant files.
2. Codex decides whether the task is ready for handoff.
3. Codex writes a concrete handoff file under `docs/handoffs/`.
4. Codex reports the handoff file path to the user.
5. The user gives that file path to Claude Code.
6. Claude Code reads the handoff file, implements, and reports back.
7. Codex reviews the report and/or diff.

Codex should not hand off vague requests.
Before handing off, reduce the work to known files, constraints, non-goals, and verification.

## Codex Output Format For Claude Code
When preparing a handoff, create `docs/handoffs/YYYY-MM-DD-<short-task>.md`. Create the `docs/handoffs/` directory if it does not exist. The file should contain this block.

Handoff quality rules:
- When a task depends on existing page/API state, name the concrete source to use instead of referring vaguely to "a helper if available".
- For dense UI work, state which columns/controls are mandatory and which may move into a detail panel or selected-item stats area.

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

## Claude Code Handoff Template

```md
Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal
Describe the concrete implementation goal.

## Background
Summarize the Codex-side decision and why this change is being made.

## Files To Inspect
- path/to/file

## Files To Edit
- path/to/file

## Constraints
- Preserve existing design intent.
- Keep changes scoped to the listed files unless wiring changes are necessary.
- Do not add dependencies, build tooling, packaging, CI/CD, or deployment changes unless listed.
- Do not touch secrets, credentials, `.env`, or local settings.
- Do not commit automatically.

## Non Goals
- List anything that must stay out of scope.

## Verification
- List commands or manual checks.

## Expected Report
- Changed files
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
```

## Codex Review Checklist
After Claude Code returns, Codex should review:

- Did the diff stay inside the handoff?
- Did any file outside `Files To Edit` change? If yes, was it necessary?
- If unexpected unrelated diffs appear, treat authorship as unknown unless confirmed. State neutrally that they should be excluded from the current task/commit rather than attributing them to Claude Code or the user.
- Did the implementation preserve stated constraints and non-goals?
- Did it introduce dependencies, build tooling, packaging, CI/CD, or deployment behavior unexpectedly?
- Did it touch secrets, credentials, `.env`, or local settings?
- Did verification run, and are blocked checks explained?
- Does any discovery need to become a new `AGENTS.md` or `docs/*.md` decision?

## Knowledge Persistence
Use `AGENTS.md` for durable workflow and design decisions.
Use `docs/*.md` for reusable technical notes, architecture details, procedures, and project-specific knowledge.

Before starting meaningful work, Codex should check whether `docs/` contains relevant context.
After implementation, Codex should decide whether new knowledge should be recorded.
When a `docs/decisions/` note describes work that has been fully implemented and no longer needs to stay in the active decisions list, move it to `docs/decisions/archive/`.

## Decision Log

### YYYY-MM-DD: Decision title

Context:
- What problem or requirement caused this decision?

Decision:
- What did we decide?


Reason:
- Why is this the right tradeoff now?

Constraints Introduced:
- What should future implementation preserve?

Do Not Change Casually:
- What would cause design drift if changed without review?
