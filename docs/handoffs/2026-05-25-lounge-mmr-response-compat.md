Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Fix Lounge MMR sync so MKCentral response shape changes do not raise `KeyError` and return HTTP 500.

The immediate bug observed on Pi:

- `POST /api/v1/lounge/mmr-sync`
- backend error: `KeyError: 'changeId'`
- location: `backend/app/services/lounge_mmr.py`

## Background

Lounge MMR sync currently expects every `mmrChanges[]` item from MKCentral to include:

- `changeId`
- `newMmr`
- `mmrDelta`
- `time`

Pi verification showed that MKCentral currently returns at least one `mmrChanges[]` item without `changeId`, causing an unhandled `KeyError`.

This breaks both:

- manual MMR sync in Lounge view
- Playing-driven Lounge auto MMR sync

The app should treat MKCentral as an unstable external API. Missing optional fields must not crash the backend.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `backend/app/services/lounge_mmr.py`
- `backend/app/api/lounge.py`
- `backend/tests/test_api.py`
- `frontend/src/LoungeView.tsx`
- `frontend/src/PlayingView.tsx`
- `docs/handoffs/2026-05-25-playing-lounge-auto-mmr-sync-pi-verification.md`

## Files To Edit

- `backend/app/services/lounge_mmr.py`
- `backend/tests/test_api.py`
- `docs/design/ui-redesign-roadmap.md`

Do not edit frontend files unless a backend response contract change makes it strictly necessary.

## Required Behavior

### Response Compatibility

Add a small normalization layer for MKCentral `mmrChanges[]` entries.

Recommended helper:

```py
def _normalize_mmr_change(change: dict) -> dict | None:
    ...
```

The normalized shape should include:

- `change_id: str`
- `new_mmr: int`
- `mmr_delta: int`
- `time: datetime`

Support these field aliases:

- change/table id:
  - `changeId`
  - `tableId`
  - `id`
- new MMR:
  - `newMmr`
  - `mmr`
- MMR delta:
  - `mmrDelta`
  - `delta`
- timestamp:
  - `time`
  - `verifiedOn`
  - `createdOn`

If a change cannot be normalized because required values are missing or malformed:

- skip that change
- do not raise
- continue processing other changes

Do not invent a persistent `change_id` from timestamp/MMR fields. `lounge_mmr_table_id` is the idempotency key, so it must come from a stable MKCentral id field.

### Existing Behavior To Preserve

- `sync_mmr()` still fetches `mkworld` and `mkworld24p` for season 2+.
- current MMR values still come from the top-level response `mmr`.
- already-synced `lounge_mmr_table_id` values are skipped.
- matching still uses the normalized change time and the existing ±2 hour window.
- active Lounge sessions are not modified.
- 12p/24p game matching behavior remains unchanged.
- external HTTP failures should still become `RuntimeError`, then API 502.

### Missing All Usable Changes

If `mmrChanges` exists but every item is skipped as unusable, return a normal success response with no updated session and a clear message.

Suggested message:

`MMR同期に利用できる変更履歴がありません`

Do not return 500 in this case.

### Japanese Messages

While touching `lounge_mmr.py`, make sure returned `message` strings are readable UTF-8 Japanese in source:

- no mojibake
- no replacement characters

Use concise Japanese.

## Tests

Add or update backend tests in `backend/tests/test_api.py`.

Required test cases:

1. Existing `changeId` payload still syncs successfully.
2. Payload using `tableId`, `delta`, and `verifiedOn` syncs successfully.
3. Payload missing all stable id fields (`changeId`, `tableId`, `id`) is skipped and returns HTTP 200 with no updated session.
4. Payload with one malformed change followed by one valid change still syncs the valid change.
5. Already-synced idempotency still works with the normalized id.
6. Top-level `mmr` still populates `current_mmr_12p` / `current_mmr_24p` even if no changes are usable.

If you add helper-level tests, keep them close to the existing MMR tests.

## Constraints

- Backend-only except roadmap update.
- No schema or Alembic migration.
- No frontend behavior changes.
- No new dependencies.
- Do not change Portainer, Docker, GHCR, or GitHub Actions files.
- Do not call the live MKCentral API from automated tests; mock `_fetch_player_details` as existing tests do.
- Do not broaden sync matching beyond the existing ±2 hour window.

## Non Goals

- No automatic retry/backoff.
- No background sync.
- No table-detail API fetching.
- No frontend UI redesign.
- No changes to Playing auto-sync logic.
- No data cleanup.

## Verification

Run from repo root:

```powershell
python -m py_compile backend/app/services/lounge_mmr.py backend/app/api/lounge.py backend/tests/test_api.py
python -m pytest tests/ -q
```

If frontend files remain untouched, frontend build is not required. If any frontend file is changed, also run:

```powershell
cd frontend
npm run typecheck
npm run build
```

Optional manual local/API check if a backend is available:

- `POST /api/v1/lounge/mmr-sync` no longer returns 500 for missing `changeId`-style payloads.

## Expected Report

- Changed files
- Summary
- Normalized field aliases supported
- Verification results
- Blocked checks
- Whether frontend files were untouched
- Design questions for Codex
