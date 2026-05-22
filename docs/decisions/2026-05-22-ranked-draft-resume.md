# Ranked Draft Resume

## Context

The session race list API lets the Playing UI restore persisted race history
when resuming an active session. Ranked sessions can also contain a draft race:
course selection has been recorded, but the result has not been completed yet.

If the UI only restores completed history, an unfinished ranked draft can appear
as a normal history row and the result input form is not restored.

## Decision

When resuming a ranked active session, the Playing UI should treat the latest
non-cancelled `draft` race as the active draft and return to the ranked result
input phase.

Completed races should remain in the history list. Draft races should not be
counted as completed history for Lounge progress or the sidebar course list.

For warning display, `lastWarnings` may be restored from the latest completed
race that has `warning_flags`. This is a convenience UI state only; persisted
warning history remains on each race row.

## Reason

A draft race is a real persisted in-progress state. Restoring it avoids losing
the ranked result entry step after reload or browser restart, while keeping the
history list focused on completed recorded races.

## Constraints

- Do not change the database schema for this behavior.
- Do not create a separate draft endpoint unless the current race list endpoint
  is insufficient.
- Preserve the existing ranked and Lounge mutation endpoints.

## Do Not Change Casually

- Do not silently discard a persisted ranked draft on resume.
- Do not show draft races as completed course history.
