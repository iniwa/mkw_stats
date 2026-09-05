# Active Handoffs

Use this directory for active persisted handoffs that are waiting for implementation or review.

File name format:

```text
YYYY-MM-DD-<short-task>.md
```

After implementation and review are complete, move the handoff to `archive/`.

## Queued UI Redesign Handoffs

Large redesign work may be split into several active handoff files ahead of implementation. The primary must re-check the next handoff after each writer report before handing it over.

## Active Verification Handoffs

None.

## Active Implementation Handoffs

None.

Current UI redesign order (next after Codex review):

None.

Next queued verification handoff:

None.

Only hand the next file to a native Codex writer after the primary has reviewed the previous implementation and confirmed the queued handoff still matches the current code.

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
