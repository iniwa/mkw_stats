Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add a session-level delete flow for Records so an accidentally created play session can be removed from the app.

This is for personal cleanup of mistaken input. The deleted session should disappear from Records, Dashboard, Analytics, Lounge summaries, and active sessions.

## Background

`issues.md` still has:

- `Records`
  - `セッション自体を削除する機能も欲しい`

Race-level hide/restore already exists, but there is no session-level delete.

Important current behavior:

- `RaceRecord` rows reference `play_sessions.id`.
- `RatingSnapshot` rows may reference `race_records.id`.
- Completed ranked races update `VrAccount.current_vr`.
- Existing helper `_revert_race_effects(db, race)` in `backend/app/services/race_flow.py` removes rating snapshots and rewinds `current_vr` only when the deleted/cancelled race is the latest VR effect.
- `scripts/record_only_cleanup.sql` exists for full record cleanup, but this handoff is a per-session UI/API flow.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `issues.md`
- `backend/app/models/sessions.py`
- `backend/app/models/vr.py`
- `backend/app/services/race_flow.py`
- `backend/app/api/sessions.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `backend/app/services/race_flow.py`
- `backend/app/api/sessions.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/RecordsView.tsx`
- `frontend/src/App.css` only if needed for a small session action/error style
- `docs/design/ui-redesign-roadmap.md`
- `issues.md`

## Required Backend Behavior

Add:

```http
DELETE /api/v1/play-sessions/{session_id}
```

Expected responses:

- `204 No Content` on success.
- `404` when the session does not exist.

Deletion semantics:

1. Hard-delete the selected `PlaySession`.
2. Delete all `RaceRecord` rows for the session.
3. Delete any `RatingSnapshot` rows linked to those race records before deleting the races.
4. For completed ranked races, reuse the existing ranked rollback semantics:
   - Process the session's ranked completed races newest-first by `race_no` / `created_at`.
   - Call or reuse `_revert_race_effects` so `VrAccount.current_vr` is only rewound when safe.
   - Do not invent a broad recalculation pass in this slice.
5. Lounge MMR fields stored on the session are deleted with the session. Do not touch unrelated Lounge table records unless a FK requires it.
6. Do not delete master data:
   - courses
   - routes
   - map_points
   - vr_accounts
   - app_settings
   - notes / annotations unrelated to the session

Implementation notes:

- Keep this as a small service function, for example `delete_session(db, session_id) -> None`.
- Do not add an Alembic migration.
- Do not add soft-delete schema fields in this slice.
- If SQLAlchemy FK constraints require explicit ordering, delete snapshots, then race records, then the session.

## Required Frontend Behavior

In `RecordsView.tsx`:

- Add a session-level delete action near the selected session detail header, not on every session list row unless the layout already makes that cleaner.
- Use a clear confirmation dialog before deleting:
  - Suggested text: `このセッションを削除しますか？レース記録も削除され、元に戻せません。`
- On confirm:
  - call `api.deleteSession(sessionId)`
  - clear selected session / races / edit state
  - reload the session list with the current filters/date/limit
  - show no stale row errors from the deleted session
- On cancel:
  - no API call and no UI changes.
- On failure:
  - show a visible error in the Records view; do not crash.
- Keep existing race edit, cancel, hide, restore behavior unchanged.

In `frontend/src/api.ts`:

- Add `deleteSession(sessionId: string): Promise<void>` using `DELETE /play-sessions/{sessionId}`.

## Tests

Add backend tests for at least:

1. Unknown session delete returns `404`.
2. Deleting a session with races removes the session and its races.
3. Deleting a ranked completed session removes linked `RatingSnapshot` rows.
4. Deleting the latest ranked completed session rewinds the related `VrAccount.current_vr` when safe.
5. Deleting an older ranked session does not corrupt current VR when a later ranked race already moved the account beyond it.

Frontend verification should cover:

- Delete button appears only when a session is selected.
- Confirm cancel leaves the selected session visible.
- Confirm accept removes the session from the list and clears detail panel.
- Empty state appears when the deleted session was the only filtered result.

## Constraints

- Keep the UI compact and consistent with existing Records controls.
- No new npm dependencies.
- No DB migration.
- No Portainer, Docker, GHCR, or deployment changes.
- Do not change race hide/restore/cancel semantics.
- Do not add a global "danger zone" settings screen in this slice.
- Do not implement bulk delete.
- Do not mark the `issues.md` item complete unless the implementation and verification pass.

## Non Goals

- Session soft-delete / restore.
- Bulk record cleanup.
- Full historical VR recomputation.
- Removing notes or annotations.
- Changing Analytics/Lounge aggregation rules beyond their natural response to the session no longer existing.
- Pi deployment or live Pi verification.

## Verification

Run:

```bash
# from backend/
python -m py_compile app/services/race_flow.py app/api/sessions.py tests/test_api.py
python -m pytest tests/ -q

# from frontend/
npm run typecheck
npm run build
```

If browser verification is available, also check Records at desktop and 375px width.

## Expected Report

- Changed files
- Summary
- API behavior
- VR rollback behavior for deleted ranked sessions
- Verification results
- Blocked checks
- Residual test data
- Design questions for Codex
