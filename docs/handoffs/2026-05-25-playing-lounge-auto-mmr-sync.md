Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Use the existing `lounge_auto_sync` setting during the Playing flow.

When a Lounge session becomes completed from the Playing screen and `lounge_auto_sync` is enabled, automatically trigger the existing MMR sync endpoint once.

## Background

Manual Lounge MMR sync is already implemented:

- `POST /api/v1/lounge/mmr-sync`
- frontend method: `api.mmrSync()`
- Settings stores `lounge_player_id`, `lounge_season`, and `lounge_auto_sync`
- Lounge view already has a manual MMR sync button and displays synced MMR history

The remaining gap is that `lounge_auto_sync` currently exists as a setting but does not affect the Playing flow. For daily use, after finishing a Lounge match, the app should try to sync MMR automatically.

Keep this as a frontend-only slice. Do not introduce a backend worker, scheduler, polling loop, or automatic sync on page load.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `frontend/src/api.ts`
- `frontend/src/PlayingView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/SettingsView.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `frontend/src/PlayingView.tsx`
- `frontend/src/App.css` only if a small style hook is needed for the sync notice
- `docs/design/ui-redesign-roadmap.md`

Do not edit backend files.

## Required Behavior

### Trigger Conditions

Automatic MMR sync should run only when all conditions are true:

- current session source is `lounge`
- `settings.lounge_auto_sync === true`
- the session has just become `completed` in the Playing flow
- the completion happens from one of these existing Playing actions:
  - manual `finishSession`
  - auto-completion after the 12th Lounge race, observed after `completeLounge`

Do not run auto sync:

- for ranked sessions
- when `lounge_auto_sync` is false
- during resume
- during ordinary race completion if the session remains active
- repeatedly just because the finished screen re-renders

### Implementation Shape

`PlayingView` already fetches settings in `loadReferenceData`, but the state currently does not need the value for rendering. Change that so the component can read the current `Settings`.

Add a small helper inside `PlayingView`, for example:

```ts
async function maybeAutoSyncLoungeMmr(nextSession: PlaySession): Promise<void>
```

Expected behavior:

- If trigger conditions are not met, return immediately.
- If conditions are met, call `api.mmrSync()`.
- If sync succeeds, show a compact success notice in Playing.
- If sync returns no updated session, still show the endpoint message as informational, not an error.
- If sync fails, show a compact warning/error notice, but do not throw the error back into `runAction`.

Important: recording and session completion must remain successful even if MKCentral is unreachable or returns no matching MMR change.

### State / UI

Add small state for auto-sync result:

- syncing flag or status, only if useful
- success/info message
- error message

Display the notice near the existing `actionError` / Playing header area or in the finished panel. Keep it compact.

Suggested copy:

- syncing: `MMRを自動同期しています...`
- success/info: `MMR自動同期: {message}`
- error: `MMR自動同期に失敗しました: {message}`

Use existing `.notice` styles where possible. Add CSS only if necessary.

Clear stale auto-sync messages when:

- creating a new session
- resuming a session
- leaving a session

### Session Refresh

After a successful auto-sync:

- If the returned `updated_session` matches the current session id, update local `session` from it.
- Otherwise, refetch the current session or leave the current session state unchanged.

Do not reload all app data or navigate to Lounge.

### Placement In Existing Actions

Manual finish:

1. `const finished = await api.finishSession(session.id)`
2. `setSession(finished)`
3. `await maybeAutoSyncLoungeMmr(finished)`

Lounge 12th race auto-finish:

1. Complete the Lounge race as today.
2. Fetch the session as today.
3. If the fetched session is completed, call `maybeAutoSyncLoungeMmr(fetchedSession)`.

Be careful not to call the helper before the session has completed.

## Constraints

- Frontend-only.
- No backend/API/schema/migration changes.
- No new dependencies.
- Do not change manual MMR sync behavior in `LoungeView`.
- Do not remove the manual sync button.
- Do not add background jobs, intervals, polling, browser notifications, or service workers.
- Do not block race recording or session completion on MMR sync success.
- Do not trigger sync more than once for the same completion action.
- Keep text concise and readable Japanese.

## Non Goals

- No automatic sync from Dashboard/Lounge load.
- No automatic sync on app startup.
- No MMR graph changes.
- No settings model changes.
- No server-side scheduler.
- No MKCentral API changes.
- No Pi/Portainer/GHCR/deploy changes in this implementation handoff.

## Verification

Run from repo root:

```powershell
cd frontend
npm run typecheck
npm run build
```

Manual/browser verification, if a backend is available:

- With `lounge_auto_sync=false`, finish a Lounge session; no automatic MMR sync notice appears.
- With `lounge_auto_sync=true`, finish a Lounge session manually; a sync notice appears and recording completion remains successful.
- With `lounge_auto_sync=true`, complete the 12th Lounge race; session finishes and a sync notice appears.
- Simulate/observe MKCentral failure if possible; the session still completes and a non-blocking error notice appears.
- Ranked session completion does not trigger MMR sync.
- Leaving or starting/resuming another session clears stale sync notices.
- Browser console has no JavaScript/React errors.
- 375px width has no horizontal overflow in Playing.

If live backend or MKCentral is unavailable, verify by typecheck/build and report blocked live checks clearly.

## Expected Report

- Changed files
- Summary
- Verification results
- Blocked checks
- Whether auto-sync success and failure were browser-tested
- Design questions for Codex
