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
4. Split Analytics into VR and Lounge analytics.
5. Improve course/route target browsing and notes.
6. Improve course/route visual selection and map-image note editing.

This order avoids building polished UI on top of unstable result fields. Since the result model is now stable enough for the next pass, Playing and Records should be tightened before deeper analytics and map-image work.

## Playing: Shared Flow

### Target Selection

The current searchable picker is acceptable as the functional baseline, but the target state should eventually support a more visual selection UI.

Desired future behavior:

- Use a Mario Kart World-style course map image or equivalent local asset.
- Allow selecting map points by clicking/tapping on the image.
- Hide or disable impossible route choices.
- Continue to support text search as a fallback for speed and accessibility.

Image sourcing is unresolved. Before implementing image-based selection, decide:

- whether images can be bundled locally
- where assets should live in the repo or data directory
- whether fan-site images are acceptable for private LAN use
- how coordinates map to the existing `map_points.x` and `map_points.y`

### Play Assist Review

After target selection and before result recording, show a focused assist panel:

- target name
- normal course vs route
- route metadata when available
- course/route notes
- map annotations
- eventually map image with annotation markers

The current `TargetAssist` is the starting point for this step. It should be evolved, not discarded.

For routes, route details and assist notes should remain visible before confirming the race record.

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
- Cancel remains distinct from hide.
- Hidden-record recovery is intentionally deferred.

Design note:

- Editing historical `rating_after` recalculates the record's `rating_delta`, but does not update `VrAccount.current_vr`. Current VR correction remains a separate Settings/account maintenance concern unless a later design explicitly couples it to Records edits.

## Recommended Next Slice

The next implementation slice should be:

**Analytics split**

Goals:

- Make the existing Analytics view clearly ranked/VR-focused.
- Make Lounge focus on Lounge-specific score, placement, warnings, and recent matches.
- Keep date filtering.
- Do not implement MMR sync or add a charting library in this slice.
