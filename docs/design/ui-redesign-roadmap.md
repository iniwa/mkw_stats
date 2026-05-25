# UI Redesign Roadmap

Last updated: 2026-05-25

## Purpose

This document records the planned large-scale Web GUI redesign for MKWorld Stats Manager.

The redesign is not only visual. It changes how play results are recorded, how Lounge data is modeled, and how analytics views are split. Treat this as a living design document for future handoffs.

## Current Position

The current MVP has useful foundations:

- Playing can start ranked and Lounge sessions.
- Course selection is based on map points and can resolve normal courses or routes.
- Course and route notes exist.
- Map annotations exist.
- Playing already has `TargetAssist` for notes and annotations.
- Records can list sessions and races, edit race memo, and cancel race records.
- Records can correct numeric ranked/Lounge result fields and hide mistaken race records.
- Dashboard, Records, Analytics, Lounge, Courses, and Settings views exist.
- The result model redesign is implemented and verified on Pi:
  - ranked records use numeric `placement` and user-entered `rating_after`
  - `rating_delta` is calculated from `rating_after - rating_before`
  - Lounge race records use manual `placement` and `score`
  - race records can be hidden from default history and analytics

The next redesign should build on these foundations instead of replacing the whole app at once.

## Data Compatibility Policy

Existing play/test records are not important at this stage.

It is acceptable for the redesign to:

- delete existing race/session records during development
- add migrations that do not preserve all old records
- remove the current three-band ranked placement model
- reset analytics history if that keeps the new model simple

Do not delete configuration, course master data, route master data, notes, or map annotations unless explicitly requested.

## High-Level Direction

The Playing flow should become:

1. Select target course or route.
2. Review play assist information during the race flow.
3. Record the race result.

The "review play assist information" step is important. It should show the selected course/route map, route details, notes, and annotations in a way that is usable while playing.

## Priority

Do not attempt the full UI redesign in one implementation slice.

Recommended order:

1. Completed: redesign result data model and APIs.
2. Completed: redesign Playing flow around the new model.
3. Completed: update Records to correct and hide/delete the new result shape.
4. Completed: split Analytics into VR and Lounge analytics.
5. Improve course/route target browsing and notes.
6. Improve course/route visual selection and map-image note editing.

This order avoids building polished UI on top of unstable result fields. Since the result model is now stable enough for the next pass, Playing and Records should be tightened before deeper analytics and map-image work.

## Playing: Shared Flow

### Target Selection

The current searchable picker is acceptable as the functional baseline, but the target state should eventually support a more visual selection UI.

Desired future behavior:

- Use one Mario Kart World-style world map image or equivalent local asset as the base visual.
- Place course/map-point icons on top of the world map using normalized `map_points.x/y`.
- Allow selecting map points by clicking/tapping icons on the image.
- Provide an explicit calibration mode to drag map points and save updated normalized coordinates.
- Hide or disable impossible route choices.
- Continue to support text search as a fallback for speed and accessibility.

Image sourcing is scoped by `docs/decisions/2026-05-25-map-image-asset-policy.md`.

Before implementing image-based selection, remember:

- do not scrape, download, or commit fan-site images without an explicit user decision
- use optional local frontend assets under `frontend/public/assets/`
- keep the text/search picker as fallback when images are missing
- keep coordinates normalized to the existing `map_points.x` and `map_points.y`
- normal Playing selection should not move coordinates; dragging is only for calibration/edit mode

User-approved exception:

- Images referenced by `https://japan-mk.blog.jp/mkworld.info-1/route.html` may be downloaded for this private LAN tool.
- Do not hotlink those images at runtime; serve local copies under `frontend/public/assets/...`.

### Play Assist Review

After target selection and before result recording, show a focused assist panel:

- target name
- normal course vs route
- route image when a selected route has a local image asset
- route metadata when available
- course/route notes
- map annotations
- eventually map image with annotation markers

The current `TargetAssist` is the starting point for this step. It should be evolved, not discarded.

For routes, route details and assist notes should remain visible before confirming the race record.

The map-image work should start in the Playing picker. Reusing the same map component in the assist review is useful, but the first requirement is faster visual selection during play.

## Ranked VR

The current `placement_band` model is temporary and should be removed from the active input model.

New ranked race input should use:

- `player_count`: numeric input
- `placement`: numeric input
- `rating_before`: from active VR account at draft/record time
- `rating_after`: user input
- `rating_delta`: calculated as `rating_after - rating_before`

The UI should ask for the resulting VR value, not the delta.

The result memo field is not needed in the normal ranked Playing input. Memo editing can remain available in Records for corrections or notes.

Implementation notes:

- Existing `placement_band` may be removed or kept only as a derived/legacy field during migration.
- Analytics should use numeric placement once available.
- Validation should ensure `placement` is within `1..player_count`.
- `rating_after` should be non-negative.

## Lounge

Lounge race recording needs a more specific model than the current route/course history only.

Per race, record manually:

- placement
- score
- course or route target
- warning flags such as repick

MMR is session-level and should be obtained automatically, not typed race-by-race.

Recommended model direction:

- Race records store `placement` and `score` for Lounge races.
- Lounge session or a related Lounge table snapshot stores MMR before/after or MMR delta.
- When Lounge sync retrieves MMR movement, attach it to the latest completed Lounge session that does not yet have MMR data, unless a later design requires a stricter match key.

Score behavior:

- User enters placement.
- UI may auto-fill score from placement if a scoring table is available.
- Auto-filled score remains manually editable.
- Editing score must not change placement.

Course history display should become more visual:

- Use icon image plus text when course icons/assets are available.
- For route records, show destination/end point first because repick logic is based on duplicate destination in Lounge rules.
- A possible compact route display is: `[destination image] <- [start image] destination text <- start text`.

The Lounge overview should not center on warning records long-term. It should prioritize:

- current MMR
- MMR movement
- recent matches
- score/rank summaries
- MMR change graph

## Records

Records exists for review and correction.

Required direction:

- Allow correcting race fields that can be mistyped.
- Allow deleting or hiding records entered by mistake.
- Do not rely only on cancellation for erroneous input.

Deletion can be implemented as soft delete or hidden state. Hard delete is not required and is less desirable while the app is still evolving.

Recommended behavior:

- "Cancel" remains for a race that happened but should be marked cancelled.
- "Delete" or "Hide" is for records that should not appear in history or analytics because they were input by mistake.
- Hidden/deleted records should be excluded from Records default view and Analytics.
- A recovery view can be deferred.

Records should eventually edit:

- ranked `player_count`, `placement`, `rating_after`
- Lounge `placement`, `score`
- memo
- hidden/deleted state

## Analytics Split

The current Analytics and Lounge views overlap.

Split long-term analysis into two clearer areas:

### VR Analytics

Focus on ranked VR:

- VR trend graph
- per-course results
- win/top-rate by course or route
- placement distribution
- average rating delta
- recent ranked sessions

### Lounge Analytics

Focus on Lounge:

- current MMR
- MMR trend graph
- MMR delta by match
- score trends
- placement trends
- repick and warning summaries
- course/route usage

The Lounge overview can remain a recent-match operational view, but deeper Lounge statistics should live in Lounge Analytics or a clearly named Lounge section.

## Courses And Notes

The current Courses page is becoming crowded because notes will eventually exist for most courses.

Direction:

- Do not show all notes as the primary interface long-term.
- Prefer selecting a course/route first, then showing notes and annotations for that target.
- Add map image support before building advanced annotation editing.
- Eventually allow placing and adjusting icons directly on the map image.

Advanced map annotation UI should be a separate slice because it depends on map assets and coordinate calibration.

## Out Of Scope For Immediate Slice

Do not bundle all of these into the next implementation:

- complete map-image selection
- advanced drag-and-drop annotation editing
- Lounge API sync and MMR matching
- VR and Lounge graphing
- full record deletion/recovery UI

These need separate handoffs after the data model and result input model are settled.

## Completed Foundation: Result Model Redesign

The result model redesign has been implemented and verified on Pi.

Completed behavior:

- Ranked no longer uses the active three-band placement input.
- Ranked records store numeric `placement`.
- Ranked result input uses `rating_after`; the server calculates `rating_delta`.
- Lounge records store per-race `placement` and `score`.
- Race records support hidden state for records entered by mistake.
- Default race listing and analytics exclude hidden records.

`placement_band` may remain in the database only as a legacy or unrelated compatibility field. New UI and analytics work should not depend on it.

## Completed Foundation: Playing Flow Cleanup

The Playing flow cleanup has been implemented.

Completed behavior:

- Playing now presents the flow as target selection -> assist review -> result input.
- The confirmation button now makes it clear that the next step is result input.
- Ranked result input keeps `TargetAssist` available for resume cases.
- Ranked placement input warns when it is outside `1..player_count`.

## Completed Foundation: Records Correction UI

The Records correction UI has been implemented.

Completed behavior:

- Records can edit memo, player count, placement, ranked result VR, and Lounge score.
- Empty memo is saved as `null`.
- Race records entered by mistake can be hidden from the default race list.
- Hidden race records can be included on demand in Records and restored to the visible list.
- Cancel remains distinct from hide.

Design note:

- Editing historical `rating_after` recalculates the record's `rating_delta`, but does not update `VrAccount.current_vr`. Current VR correction remains a separate Settings/account maintenance concern unless a later design explicitly couples it to Records edits.
- Hidden/restore re-evaluates Lounge auto-finish status based on visible completed races. This is verified on Pi and safe because `PlaySession.completion_reason` distinguishes auto-completed sessions (`"auto"`) from manually finished sessions (`"manual"` or `null`). Only auto-completed sessions can be reopened by hide/restore; manually finished sessions remain completed regardless of visible race count.

## Completed Foundation: Analytics Split

The first Analytics split has been implemented.

Completed behavior:

- Analytics is now ranked-focused and labeled as VR Analytics.
- VR Analytics uses ranked sessions only.
- Hidden records remain excluded by default through the race-list API.
- Cancelled records are excluded from normal VR metrics.
- VR Analytics shows active/current account VR from account data, not from historical record corrections.
- Lounge shows Lounge-specific summaries for completed Lounge races, including average placement and average score.
- Lounge can manually sync session-level MMR from MKCentral Lounge public JSON API and display the latest synced before/after/delta values.

Design notes:

- Records corrections to historical `rating_after` do not update `VrAccount.current_vr`; current VR remains an account maintenance value for now.
- VR Analytics "effective race" count excludes cancelled records.
- Lounge average placement and score use completed races only.

## Recommended Next Slice

The course/route target view slice has been implemented.

Completed behavior:

- Courses now starts from a selected course or route target.
- Notes and annotations are scoped to that selected target.
- Note and annotation creation no longer asks for a separate target after the target is selected.
- Compact route metadata is shown for selected route targets.

The route image assets, Playing world-map picker, and map point calibration slices have been implemented.

Completed behavior:

- Playing can show a local route image for selected routes when an asset exists.
- Route image display falls back silently when the asset is missing.
- Playing includes a world-map picker that uses normalized `map_points.x/y`.
- Text search pickers remain as fallback and stay synchronized with the map picker.
- Map point coordinates can be calibrated by dragging markers in explicit calibration mode.
- Calibration persists through `PATCH /api/v1/map-points/{map_point_id}`.

The Lounge MMR session sync slice has been implemented.

Completed behavior:

- Settings stores `lounge_player_id`, `lounge_season`, and `lounge_game`.
- `lounge_player_id` is treated as MKCentral ID when numeric, otherwise as player name.
- Lounge MMR is stored on `play_sessions` as session-level `lounge_mmr_*` fields.
- Manual sync calls MKCentral player details and attaches the newest unsynced MMR change to the closest completed Lounge session within the matching window.
- Active Lounge sessions are not modified by sync.
- Repeated sync is idempotent by stored MKCentral `changeId`.
- Lounge view exposes a manual MMR sync button and displays the latest synced values.

The hidden race recovery UI has been verified on Pi.

The Lounge MMR trend panel has been implemented and verified on Pi.

Completed behavior:

- Lounge view shows a `MMR 推移` panel after the existing MMR sync panel.
- The panel contains an inline SVG line chart with two streams: 12p (`lounge_mmr_game === "mkworld"`) and 24p (`lounge_mmr_game === "mkworld24p"`).
- Each stream uses distinct colors (blue / amber) with a text legend so the chart does not rely on color alone.
- The chart handles one-point streams (dot only, no broken polyline) and equal min/max (flat line).
- Up to 20 most-recent data points per stream are charted.
- Under the chart, the 6 most recently synced sessions are listed with date/time, game label, before → after, and signed delta.
- If no synced sessions exist, an empty state is shown.
- No new backend APIs or database columns; frontend-only change.

The frontend daily-use polish pass has been implemented.

Completed behavior:

- `frontend/public/favicon.svg` added: steering wheel icon (dark navy background, blue ring and spokes), repo-native SVG with no copyrighted assets.
- `frontend/index.html` links the favicon via `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`.
- `favicon.ico 404` browser noise eliminated.
- Text audit confirmed no mojibake or replacement characters in any source file.
- Annotation unlabeled fallback corrected from `(untitled)` to `(無題)` in `AnnotationEditor.tsx` and `TargetAssist.tsx` for consistency with note unlabeled fallbacks.
- Typecheck and build pass clean.

The Playing-driven Lounge MMR auto-sync slice has been implemented.

Completed behavior:

- `PlayingView` now reads `Settings` state (previously unused getter was discarded).
- When a Lounge session becomes `completed` from Playing (manual finish or 12th-race auto-complete) and `settings.lounge_auto_sync === true`, `maybeAutoSyncLoungeMmr` fires once.
- Sync is non-blocking: recording and session completion succeed even if MKCentral is unreachable or returns no matching change.
- On sync start, a neutral notice `MMRを自動同期しています...` is shown.
- On sync success/info, the notice updates to `MMR自動同期: {message}`.
- On sync failure, a `notice--warn` shows `MMR自動同期に失敗しました: {message}` without throwing into `runAction`.
- If the returned `updated_session` matches the current session id, local session state is updated from it.
- Auto-sync notices are cleared when creating, resuming, or leaving a session (`resetSessionState`).
- Ranked sessions are never affected.
- Manual sync in Lounge view is unchanged.
- No new CSS, backend changes, or npm dependencies.
- Typecheck and build pass clean.
- Pi verification confirmed on deployed images (2026-05-26).

The annotation visual placement slice has been implemented.

Completed behavior:

- `AnnotationEditor` shows a visual placement surface before the create form.
- Route targets try `/assets/routes/<route_id>.png` as background; course targets try `/assets/maps/world.png`.
- If the image fails to load or is missing, the surface falls back to a neutral 60%-aspect-ratio panel without a broken image icon or console error.
- Clicking the surface sets `createX`/`createY` and shows a pending green marker.
- Manual numeric entry in the X/Y inputs moves the pending marker.
- Switching selected target clears pending create coordinates.
- Existing positioned annotations appear as clickable markers on the surface.
- Clicking a non-editing marker starts editing that annotation (same as the list edit button).
- While an annotation is in edit mode, its marker shows in amber and can be dragged; dragging updates the edit X/Y inputs in real time.
- Canceling edit discards unsaved drag changes; saved marker persists at updated location.
- Numeric X/Y inputs are preserved in both create and edit forms.
- Layout order: visual surface → create form → annotation list.
- No new backend calls, no new npm dependencies, no new image downloads.
- Typecheck and build pass clean.

Deeper Lounge analytics and broader final cleanup remain later slices.

## Completed Foundation: MKCentral Non-JSON Response Fix

A latent 500 path in `_fetch_player_details` has been closed.

Root cause:

- `json.JSONDecodeError` and `UnicodeDecodeError` from `_fetch_player_details` were not wrapped in `RuntimeError`, so they propagated past the `except RuntimeError` handler in `lounge.py` and became unhandled exceptions → HTTP 500.
- This occurs when MKCentral returns a non-JSON body (e.g., HTML maintenance page) while the HTTP status code is 200.

Completed behavior:

- `_fetch_player_details` now catches `(ValueError, UnicodeDecodeError)` and re-raises as `RuntimeError`, which the API layer converts to HTTP 502.
- `test_mmr_sync_non_json_response_returns_502` added to verify this path.
- 122 tests pass locally.

## Completed Foundation: MKCentral Response Compatibility

Pi verification of Playing-driven Lounge MMR auto-sync found two blockers:

- the new frontend image containing commit `edf0466` was not yet deployed because the commit had not reached the GitHub Actions/GHCR path
- manual `POST /api/v1/lounge/mmr-sync` returned HTTP 500 due to `KeyError: 'changeId'` in `backend/app/services/lounge_mmr.py`

The response-compatibility fix has been implemented.

Completed behavior:

- `_normalize_mmr_change()` normalizes each `mmrChanges[]` entry before processing.
- Supported id aliases: `changeId`, `tableId`, `id`.
- Supported MMR aliases: `newMmr`, `mmr`.
- Supported delta aliases: `mmrDelta`, `delta`.
- Supported timestamp aliases: `time`, `verifiedOn`, `createdOn`.
- Malformed or incomplete change entries are skipped silently; other entries continue processing.
- If `mmrChanges` has items but all are unusable, returns HTTP 200 with `message = "MMR同期に利用できる変更履歴がありません"`.
- `KeyError: 'changeId'` and similar field-access crashes can no longer occur.
- Top-level `mmr` still populates `current_mmr_12p` / `current_mmr_24p` regardless of change usability.
- All existing sync behavior (idempotency, ±2 hour window, game/player-count matching) is preserved.
