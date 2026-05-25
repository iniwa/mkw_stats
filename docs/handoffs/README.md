# Active Handoffs

Use this directory for Claude Code handoff files that are waiting for implementation or Codex review.

File name format:

```text
YYYY-MM-DD-<short-task>.md
```

After Claude Code reports back and Codex review is complete, move the handoff to `archive/`.

## Queued UI Redesign Handoffs

Large redesign work may be split into several active handoff files ahead of implementation. When doing this, Codex must still re-check the next handoff after each Claude Code report before handing it over.

## Active Verification Handoffs

None.

## Active Implementation Handoffs

- `2026-05-25-frontend-daily-use-polish.md`

Current UI redesign order:

Next queued verification handoff:

None.

Only hand the next file to Claude Code after Codex has reviewed the previous implementation and confirmed the queued handoff still matches the current code.

Each handoff should include:

```md
Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal
## Background
## Files To Inspect
## Files To Edit
## Constraints
## Non Goals
## Verification
## Expected Report
```
