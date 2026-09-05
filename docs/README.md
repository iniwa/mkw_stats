# Documentation Map

This directory is the active documentation area for MKWorld Stats Manager.

## Directory Roles

| Path | Role |
|---|---|
| `design/` | Living design documents used by current implementation. |
| `decisions/` | Active durable decisions that future work must preserve. |
| `decisions/archive/` | Decisions that have been implemented or superseded. |
| `handoffs/` | Active persisted handoffs waiting for implementation or review. |
| `handoffs/archive/` | Completed handoffs after Codex review. |

## Source Snapshot

The original planning documents are kept in:

```text
mkworld_stats_manager_docs_v0_1/
```

Treat that directory as a v0.1 design snapshot. Prefer adding or updating living documents under `docs/design/` once implementation decisions become current project rules.

## Handoff Lifecycle

1. The primary writes a scoped handoff under `docs/handoffs/YYYY-MM-DD-<short-task>.md` when cross-session or interruption-safe state is required.
2. A native Codex writer implements from that handoff and reports changed files, summary, verification, blocked checks, and design questions.
3. The primary reviews the diff and report.
4. After review is complete, move the handoff to `docs/handoffs/archive/`.

Do not archive a handoff before implementation and Codex review are both complete.
