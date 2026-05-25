Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, and this handoff file before implementation.
Queued handoff: do not implement until `2026-05-25-lounge-mmr-source-investigation.md` is complete and Codex has confirmed Lounge API/source details.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add the first Lounge MMR session-level sync path.

MMR should be associated with Lounge sessions, not individual race records.

## Background

Roadmap decision:

- Lounge race records store manually entered placement and score.
- MMR is session-level and should be obtained automatically.
- When MMR movement is retrieved, attach it to the latest completed Lounge session that does not yet have MMR data unless a later design requires a stricter match key.

This handoff is intentionally queued because Lounge API details may need separate confirmation.

## Files To Inspect

- `docs/design/ui-redesign-roadmap.md`
- `backend/app/models/lounge.py`
- `backend/app/models/sessions.py`
- `backend/app/models/vr.py`
- `backend/app/schemas/__init__.py`
- `backend/app/api/settings.py`
- `backend/app/api/sessions.py`
- `backend/tests/test_api.py`
- `frontend/src/LoungeView.tsx`
- `frontend/src/SettingsView.tsx`
- `frontend/src/api.ts`

## Files To Edit

Exact scope depends on confirmed Lounge source/API details. Likely:

- backend models/schemas/services/API for Lounge MMR sync
- Alembic migration if session-level MMR fields are added
- backend tests
- frontend Lounge/Settings small UI additions

Do not start without Codex confirming the external data source and expected fields.

## Candidate Data Direction

Possible session-level fields:

- `lounge_mmr_before`
- `lounge_mmr_after`
- `lounge_mmr_delta`
- `lounge_mmr_synced_at`

Alternatively, use `rating_snapshots` with `source = lounge` and `lounge_table_id`/session link if that fits better after inspection.

Do not choose between these without reviewing the current model and confirming with Codex.

## Constraints

- Do not scrape or call external services unless the endpoint/source is explicitly confirmed.
- Do not expose services outside LAN.
- Do not store credentials in source.
- Do not break manual Lounge race recording.
- Do not assign MMR to race records.

## Required Behavior

Once scoped:

- fetch or accept latest Lounge MMR movement for configured `lounge_player_id`.
- attach MMR before/after/delta to the latest completed Lounge session without MMR data.
- make operation idempotent.
- show current MMR and latest delta in Lounge view.
- report clearly when no matching completed session exists.

## Non Goals

- Full Lounge table import.
- Team/opponent/player roster modeling.
- Matchmaking or Discord integration.
- Graphing beyond simple display.

## Verification

Expected once scoped:

```text
python -m py_compile <changed backend files>
python -m pytest tests/
npm run typecheck
npm run build
```

Manual/API check:

- sync with configured test data.
- no duplicate MMR attachment on repeated sync.
- no active session is modified unexpectedly.
- Lounge view shows synced values.

## Expected Report

Report in Japanese:

- Changed files
- Confirmed Lounge data source
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
