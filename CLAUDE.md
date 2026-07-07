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
- Claude Code runs in **auto mode** (automatic model selection). There is no fixed coordinator/subagent split.
- Codex owns design decisions; handoffs are written so implementation needs no further design judgment. Claude Code implements, verifies, and reports directly.
- Subagents are optional (e.g. broad parallel investigation), not a default. When used, give each a narrow goal, explicit file scope, constraints, non-goals, and expected report.
- Regardless of model: do not change documented design intent, expand scope, add dependencies, alter build/deploy/external exposure, or touch secrets. Architectural questions return to Codex.
- If the intended model or tooling is unavailable, continue with what is available and report that limitation.

## Verification (this project)
- Backend: `cd backend && python -m pytest` (in-memory SQLite; PostgreSQL only needed for Alembic migration checks)
- Frontend: `cd frontend && npm run typecheck` and `npm run build`
- Protected (never edit/delete): `.env`, `data/`, `backups/`, production DB content

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
