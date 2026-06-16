# CLAUDE.md

> Detailed notes (Japanese): CLAUDE_ja.md

## Coding Style
- If the user writes in Japanese, respond in Japanese.
- Write lightweight, efficient code. Prefer minimal dependencies.

## Codex / Claude Code Workflow
- This `CLAUDE.md` is for Claude Code execution rules.
- Codex handoffs should normally be saved under `docs/handoffs/`; when a handoff file path is provided, read it before editing.
- If the project also has `AGENTS.md`, treat it as the Codex-side source of design intent, handoff rules, and review criteria.
- When the user provides a Codex handoff, follow that handoff first, then this file, then local project conventions.
- If the task is ambiguous, requires changing documented design intent, or needs files outside the handoff, stop and ask before editing.
- Do not commit automatically unless explicitly requested.
- Report changed files, summary, verification results, blocked checks, and any design questions that should return to Codex.

## Model / Subagent Policy
- **Opus is the coordinator; delegate hands-on work to subagents.** By default Opus plans and directs, while the actual implementation, edits, inspection, and verification are delegated to Sonnet or Haiku subagents. Opus should avoid doing routine execution itself when a subagent can do it.
- Opus owns context reading, requirement interpretation, planning, design-sensitive judgment, subagent orchestration, and final review.
- Choose the subagent model by task weight:
  - **Sonnet** — scoped implementation, multi-file or non-trivial edits, localized refactors, code/log inspection, and verification that needs some reasoning.
  - **Haiku** — light, mechanical, well-defined work: simple text/format edits, single-file find-and-replace, log/grep gathering, and other low-ambiguity tasks where speed and cost matter.
- Give each subagent a narrow goal, explicit file scope, constraints, non-goals, and expected report.
- Subagents (Sonnet or Haiku) must not change documented design intent, expand scope, add dependencies, alter build/deploy/external exposure, touch secrets, or make architectural decisions without returning to Opus.
- Opus may implement directly only for very small edits where subagent overhead clearly outweighs the benefit.
- If subagents or the intended model split are unavailable, continue with the available model and report that limitation.

## Environment
- Host: Raspberry Pi 4 (8GB RAM), `linux/arm64`
- Docker management: Portainer — Stack Web Editor only (no direct compose files)

### Work Location Detection
- Working in `D:/Git/` → **Home** (Main PC / Sub PC available)
- Working in `C:/Users/**/Documents/git/` → **Remote PC**
  - Remote PC lacks required environments (e.g. ollama). Focus on code adjustments only.
- Can SSH into Raspberry Pi via `ssh iniwapi` to read code/logs from the Pi

## Build & Deploy
- Build target: `linux/arm64`
- Image: `ghcr.io/iniwa/{tool-name}:latest`
- Flow: push to `main` → GitHub Actions → GHCR → Portainer Stack paste
- All containers require: `restart: unless-stopped`, `TZ=Asia/Tokyo`
- Resource limits: consider `deploy.resources.limits.memory` (e.g. `512m`) — host is 8GB shared across all containers

## Storage
| Data | Path | Backend |
|------|------|---------|
| Container data / DB | `/home/iniwa/docker/{tool-name}/` | SSD (primary) |
| Git repo / LFS | `/mnt/nas/git-data/` | NFS |
| Media (read-only) | `/mnt/nas/photo/`, `/mnt/nas/video/` | SMB |

## NAS Mounts (Synology DS420j @ 192.168.1.190)
- **SMB**: `/mnt/nas/photo`, `/mnt/nas/video`, `/mnt/nas/pi_backup`, `/mnt/nas/docker` *(legacy, unused)*
- **NFS**: `/mnt/nas/git-data`, `/mnt/nas/NetBackup`

## External Access
Cloudflared (Cloudflare Tunnel) is installed. Configure tunnel when exposing a service externally.

## Knowledge Persistence
- Actively save design decisions, architecture notes, and reusable patterns to `docs/*.md`
- Before starting work, check `docs/` for existing context that may be relevant

Detailed design history belongs in docs/decisions/. Keep AGENTS.md focused on short, durable rules; do not add Alternatives Considered as a default Decision Log heading there.

## Tooling
- Use **Serena MCP** tools for code navigation and editing to maximize efficiency (symbol search, overview, replace, insert, etc.)
- Use **Tavily MCP** tools for web search and research:
  - `tavily_search` — General web search for documentation, error messages, library usage, etc.
  - `tavily_crawl` — Crawl a specific website for detailed information
  - `tavily_extract` — Extract structured content from a URL
  - `tavily_research` — In-depth research on a topic (use for complex or multi-faceted questions)

## New Tool Checklist
- [ ] arm64-compatible base image (`alpine` preferred)
- [ ] `TZ=Asia/Tokyo` in environment
- [ ] `restart: unless-stopped`
- [ ] Image: `ghcr.io/iniwa/{tool-name}:latest`
- [ ] GitHub Actions workflow at `.github/workflows/docker-publish.yml`
- [ ] `.claudeignore` in project root
- [ ] Verify deployment via Portainer Stack
- [ ] Configure Cloudflare Tunnel if external access is needed
