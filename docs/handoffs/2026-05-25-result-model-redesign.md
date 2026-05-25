Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Redesign race result recording data and API behavior so future UI work can move away from the temporary MVP model.

This slice should:

- replace ranked `placement_band` input with numeric `placement`
- change ranked VR input from `rating_delta` to `rating_after`
- add Lounge per-race numeric `placement` and `score`
- stop completing Lounge races at course-selection time; require result input after target selection
- add backend support for hiding race records entered by mistake
- update the existing frontend enough that Playing, Records, Analytics, Lounge, and typecheck/build keep working

Do not implement the full visual redesign, map-image picker, graphing, or Lounge API sync in this slice.

## Background

The current MVP stores ranked result quality as `placement_band` (`top` / `middle` / `bottom`) and asks the user to enter VR delta. This is now obsolete.

The new direction is documented in:

- `docs/design/ui-redesign-roadmap.md`

Important policy from that document:

- Existing play/test records are disposable at this stage.
- Existing race/session records do not need perfect compatibility.
- Do not delete or reset course master data, route master data, notes, map annotations, settings, or VR accounts.
- The current `TargetAssist` and route detail foundations should be preserved.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/ui-redesign-roadmap.md`
- `backend/app/models/sessions.py`
- `backend/app/models/enums.py`
- `backend/app/schemas/__init__.py`
- `backend/app/services/race_flow.py`
- `backend/app/api/sessions.py`
- `backend/app/api/races.py`
- `backend/alembic/versions/001_initial_schema.py`
- `backend/tests/test_api.py`
- `backend/tests/test_smoke.py`
- `frontend/src/api.ts`
- `frontend/src/PlayingView.tsx`
- `frontend/src/RecordsView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.css`

## Files To Edit

Backend:

- `backend/app/models/sessions.py`
- `backend/app/schemas/__init__.py`
- `backend/app/services/race_flow.py`
- `backend/app/api/sessions.py`
- `backend/app/api/races.py`
- `backend/alembic/versions/002_result_model_redesign.py` (new)
- `backend/tests/test_api.py`
- `backend/tests/test_smoke.py` only if needed

Frontend:

- `frontend/src/api.ts`
- `frontend/src/PlayingView.tsx`
- `frontend/src/RecordsView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.css` only if needed for the new result form controls

Docs:

- `README.md` only if API command examples or endpoint list become stale.

Do not edit deployment files.

## Data Model Direction

Update `RaceRecord` active model fields:

- add `placement: int | None`
- add `score: int | None`
- add `is_hidden: bool` default false
- add `hidden_at: datetime | None`

Ranked fields:

- `player_count`: still used
- `placement`: numeric final placement
- `rating_before`: VR before race completion
- `rating_after`: user-entered result VR
- `rating_delta`: calculated as `rating_after - rating_before`

Lounge fields:

- `placement`: manually entered per race
- `score`: manually entered per race
- `warning_flags`: existing warning storage remains

`placement_band`:

- remove from active request/response schemas and frontend types.
- remove active service logic that sets/updates it.
- it may remain as a legacy database column for now if dropping it would add avoidable migration complexity.
- do not use it in new tests.
- do not remove the `placement_band` enum from `item_tables` in this slice.

## Migration

Create Alembic revision `002_result_model_redesign.py`.

Required upgrade behavior:

- add `race_records.placement` integer nullable
- add `race_records.score` integer nullable
- add `race_records.is_hidden` boolean not nullable, default false
- add `race_records.hidden_at` timezone datetime nullable

Because existing play/test data is disposable, do not attempt a complex `placement_band` data conversion.

Do not modify Portainer data or run destructive DB commands. This migration should be enough for the Pi DB when deployed later.

## API Behavior

### Ranked completion

Update `PATCH /api/v1/race-records/{race_id}/complete-ranked`.

Request should become:

```json
{
  "player_count": 12,
  "placement": 1,
  "rating_after": 5270,
  "rating_before": null,
  "character_id": null,
  "vehicle_id": null
}
```

Rules:

- `player_count` is required and must be >= 1.
- `placement` is required and must be between 1 and `player_count`.
- `rating_after` is required and must be >= 0.
- `rating_before` is optional. If omitted, use the current VR of the race account at completion time.
- calculate `rating_delta = rating_after - rating_before`.
- update `VrAccount.current_vr = rating_after`.
- create `RatingSnapshot.value = rating_after` and `delta = rating_delta`.
- ranked completion remains valid only for ranked draft races.
- memo is not part of the normal ranked completion request anymore. Existing `PATCH /race-records/{id}` can still edit memo later.

### Lounge completion

Add a new endpoint:

```text
PATCH /api/v1/race-records/{race_id}/complete-lounge
```

Request:

```json
{
  "placement": 4,
  "score": 9
}
```

Rules:

- valid only for Lounge draft races.
- `placement` is required and must be >= 1.
- `score` is required and must be >= 0.
- if the session has `player_count`, validate `placement <= session.player_count`.
- set `status = completed`.
- keep existing `warning_flags`.
- auto-finish the Lounge session when 12 completed non-hidden, non-cancelled Lounge races exist.

### Draft race behavior

Update `draft_race`:

- Ranked still creates a draft race.
- Lounge should also create a draft race instead of immediately completing.
- Lounge warnings should still be computed and stored on the draft.
- race number should still be assigned at draft time.

This means Playing needs a Lounge result input step after course confirmation.

### Race update

Update `PATCH /api/v1/race-records/{race_id}`:

- keep memo editing.
- allow updating fields that Records may need soon:
  - `memo`
  - `player_count`
  - `placement`
  - `rating_after`
  - `score`
- if `rating_after` is updated on a completed ranked race, recalculate `rating_delta` from `rating_before` when possible.
- do not overbuild full VR snapshot repair in this slice unless tests require it. If snapshot repair is risky, document the limitation in the report.

### Hide erroneous records

Add a backend operation for erroneous input:

```text
POST /api/v1/race-records/{race_id}/hide
```

Behavior:

- sets `is_hidden = true`
- sets `hidden_at = now`
- hidden race remains in DB
- hidden race should be excluded from default race listing and analytics fetch paths
- hidden race should not count toward Lounge 12-race auto-finish

Update `GET /api/v1/play-sessions/{session_id}/races`:

- existing `include_cancelled` behavior remains.
- add `include_hidden=false` query parameter.
- default response excludes hidden races.
- `include_hidden=true` includes hidden races.

Do not add a recovery UI in this slice.

## Frontend Behavior

Keep changes pragmatic. This is not the large visual redesign yet.

### `api.ts`

Update types and client methods:

- remove `PlacementBand` from active `RaceRecord`.
- add `placement`, `score`, `is_hidden`, `hidden_at`.
- `CompleteRankedBody` uses `placement` and `rating_after`.
- add `CompleteLoungeBody`.
- add `completeLounge(raceId, body)`.
- add `hideRaceRecord(raceId)`.
- `getSessionRaces(sessionId, includeCancelled?, includeHidden?)` should support hidden flag cleanly.

### Playing

Ranked:

- Replace the top/middle/bottom segmented placement control with numeric placement input.
- Replace VR delta input with result VR (`rating_after`) numeric input.
- Show computed delta as read-only preview when current/account VR is known.
- Do not show memo input in normal ranked result form.

Lounge:

- After target confirmation, show a Lounge result form before recording completion.
- Ask for numeric placement and numeric score.
- Keep warnings visible and non-blocking.
- After saving Lounge result, return to course selection and refresh race history.
- Continue to auto-finish after 12 completed Lounge races, based on backend state.

Shared:

- Preserve `TargetAssist` display in confirmation/result flow.
- Preserve Undo and Finish behavior.
- Resume behavior should restore any draft race. If a draft is Lounge, return to the Lounge result form.

### Records

Minimal update:

- Display numeric placement instead of placement band.
- Display Lounge score when present.
- Continue memo editing and cancel behavior.
- Do not add hide/delete button UI unless the implementation is very small and safe. Backend hide support is enough for this slice.

### Analytics / Lounge

Minimal update:

- Stop reading `placement_band`.
- Use numeric placement for any placement summaries.
- It is acceptable to keep existing views simple until the later VR/Lounge analytics split.

## Constraints

- Keep this slice focused on result model and existing view compatibility.
- Do not implement map-image selection.
- Do not implement advanced annotation editing.
- Do not implement Lounge API/MMR sync.
- Do not implement graphs.
- Do not change Docker, Portainer, GHCR, or deployment workflow.
- Do not delete master data, notes, annotations, settings, or VR accounts.
- Existing play/test records may become incompatible or ignored.
- Do not commit automatically.
- Remove screenshots or temporary browser artifacts before reporting.

## Verification

Run:

Backend:

```text
python -m py_compile app\models\sessions.py app\schemas\__init__.py app\services\race_flow.py app\api\sessions.py app\api\races.py tests\test_api.py
python -m pytest tests/
```

Frontend:

```text
npm run typecheck
npm run build
```

Manual/browser check if feasible:

- Ranked flow:
  - create ranked session
  - select course
  - enter player count, placement, result VR
  - confirm calculated delta is displayed
  - save
  - verify VR account current VR becomes result VR
- Lounge flow:
  - create Lounge session
  - select course/route
  - confirm warnings still display
  - enter placement and score
  - save
  - verify race history shows completed race with placement/score
- Records:
  - selected session race list loads
  - placement/score display does not crash
  - memo edit still works
  - cancel still works
- Hidden record API:
  - call hide endpoint in test/API test
  - default race list excludes hidden
  - `include_hidden=true` includes it
- Existing views still render:
  - Dashboard
  - Playing
  - Records
  - Analytics
  - Lounge
  - Courses
  - Settings

If local PostgreSQL is unavailable, backend tests may use the existing SQLite test setup. Report any live PostgreSQL migration check as blocked if it cannot be run locally.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Migration details
- API behavior changes
- Frontend behavior changes
- Verification results
- Blocked checks
- Any temporary files/screenshots created and removed
- Design questions for Codex

