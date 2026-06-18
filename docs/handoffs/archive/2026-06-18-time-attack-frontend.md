Read AGENTS.md, CLAUDE.md, `docs/design/time-attack.md`, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

> Reviewed by Codex on 2026-06-18. Implementation accepted. Typecheck and production build passed. Core UI behavior and 375px overflow behavior were verified with Playwright using mocked API responses.

## Goal

Implement the Time Attack frontend against the reviewed backend API.

Add a `TA` navigation view that lets the user switch between NITA and item-enabled categories, view all active courses, edit PB/WR/target times and notes, compare differences, and save one course row at a time.

## Background

The approved design is `docs/design/time-attack.md`.

The backend implementation has been reviewed and provides:

```http
GET /api/v1/time-attack-records
GET /api/v1/time-attack-records?category=nita
GET /api/v1/time-attack-records?category=item
PUT /api/v1/time-attack-records/{course_id}/{category}
```

GET returns saved records only. The frontend must join those records with `GET /api/v1/courses` so every active course appears, including courses without a saved TA record.

Times are transferred as positive integer milliseconds or `null`. User input is strictly `m:ss.mmm`.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/time-attack.md`
- `README.md`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/api.ts`
- `frontend/src/VrView.tsx`
- `frontend/src/LoungeView.tsx`
- `frontend/src/NotesView.tsx`
- `frontend/package.json`

## Files To Edit

- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/api.ts`
- `README.md`

## Files To Add

- `frontend/src/TimeAttackView.tsx`

Do not split the view into additional files unless the component becomes unreasonably large or a pure utility is reused in multiple places. If additional files are needed, report them explicitly.

## Required Implementation

### API Client

Add:

```ts
export type TimeAttackCategory = 'nita' | 'item'
```

Add a `TimeAttackRecord` interface containing:

- `id`
- `course_id`
- `category`
- `personal_best_ms`
- `world_record_ms`
- `target_time_ms`
- `personal_best_note`
- `world_record_note`
- `target_note`
- `created_at`
- `updated_at`

Add an update-body interface where all six editable fields are optional and nullable.

Add API methods:

- `getTimeAttackRecords(category?: TimeAttackCategory)`
- `upsertTimeAttackRecord(courseId, category, body)`

Use the existing `request` helper and existing error behavior.

### Navigation

In `App.tsx`:

- import `TimeAttackView`
- add `TA` between `Courses` and `Records`
- render `TimeAttackView` when active navigation is `TA`
- preserve overlay and styleguide behavior unchanged

### Initial Load

The TA view must load courses and all saved TA records.

- use `Promise.all([api.getCourses(), api.getTimeAttackRecords()])`
- show active courses only (`course.is_active`)
- order by `sort_order`, then `id`
- build editable row state for both categories from the returned records
- courses without a record must still have an empty editable row
- show a loading state during initial load
- on load failure, show a view-level error and retry button

Do not make a new GET request merely because the user switches category. Both categories should be held in current view state.

### Category Control

Provide a segmented control:

- `NITA`
- `アイテムあり`

Default to `NITA`.

Draft state must be keyed by `course_id + category`. Switching category and returning must preserve unsaved input for the lifetime of the mounted view.

No browser storage or persistence across reload/navigation is required.

### Summary

For the selected category, show four metrics:

- `PB入力済み`: number of rows with `personal_best_ms`
- `WR入力済み`: number of rows with `world_record_ms`
- `目標入力済み`: number of rows with `target_time_ms`
- `目標達成`: rows where both PB and target exist and `personal_best_ms <= target_time_ms`

Summary values should reflect current valid draft input where practical, not only the last saved server response. Invalid time text must not count as an entered/achieved value.

### Course Table

Render one row per active course with:

- コース名
- 自分PB
- WR
- 目標タイム
- WR差分
- 目標差分
- メモ expand/collapse control
- 保存 button

Use text inputs for the three time fields with a visible `m:ss.mmm` placeholder.

Each row has an expandable notes area containing:

- 自分PBメモ
- WRメモ
- 目標メモ

Use textareas or existing project-consistent multiline controls.

Rows must save independently. Saving or failing one row must not modify another row's draft, status, or expanded state.

### Time Parsing and Formatting

Implement pure helpers in `TimeAttackView.tsx`:

- format milliseconds as `m:ss.mmm`
- parse strict `m:ss.mmm` input to milliseconds
- format a signed difference as `+x.xxx`, `-x.xxx`, or `0.000`

Input requirements:

- blank string maps to `null`
- minutes are one or more digits
- seconds are exactly two digits and range from `00` to `59`
- milliseconds are exactly three digits
- do not accept plain integers, shortened fractions, omitted minutes, or one-digit seconds
- parsed total must be greater than zero; `0:00.000` is invalid because the backend accepts only positive times

Difference calculations:

```text
WR差分 = personal_best_ms - world_record_ms
目標差分 = personal_best_ms - target_time_ms
```

- show `-` if either required value is absent or invalid
- positive values include `+`
- negative values include `-`
- zero is `0.000`
- difference display uses seconds with three decimals and may exceed 59 seconds; do not format a difference as a lap time

### Validation and Save

Before saving a row:

- validate all three time inputs
- if any non-empty input is invalid, do not call the API
- show field-level or row-local validation messages identifying the invalid field
- leave all draft inputs intact

On valid save, send all six fields for that row:

- blank time input as `null`
- empty note as `null`
- otherwise parsed time or note text

Save state:

- disable only the target row's save button while saving
- show a row-local error if the request fails
- keep the row draft unchanged on failure
- on success, update that row from the API response
- show a short row-local success indicator
- clear prior error/success when that row is edited again

### Responsive Behavior

The table has many columns and must remain usable at 375px width.

- do not cause page-level horizontal overflow
- wrap the table in a dedicated horizontal scroll container
- give the table a practical minimum width
- keep course names readable
- ensure inputs, notes control, save control, validation, and status remain accessible within the table scroll region
- expanded notes may span the table width
- do not regress existing navigation or other views

Use TA-specific CSS class names. Reuse existing visual tokens and shared classes where suitable, but do not make broad unrelated restyling changes.

### README

Update the root README screen table so it includes:

```text
TA | NITA・アイテムありのPB、WR、目標タイム管理
```

Do not rewrite unrelated README sections.

## Constraints

- Do not modify backend files, migrations, schemas, tests, or cleanup SQL.
- Do not add frontend dependencies or a test framework.
- Do not add external WR import, Google Sheets integration, WR Top 10, PB history, recorded dates, URL fields, route-based TA, character/vehicle dimensions, or OBS support.
- Do not merge TA data into ranked VR, Lounge, sessions, races, Records, or Analytics.
- Do not add global unsaved-change dialogs or browser storage.
- Do not alter deployment, ports, GHCR, Portainer, external exposure, secrets, or environment files.
- Preserve Japanese labels defined by the design.

## Verification

Run:

```sh
cd frontend
npm run typecheck
npm run build
```

Manually verify:

- `TA` appears between `Courses` and `Records`
- both categories show all active courses
- switching category preserves unsaved drafts in both categories
- strict valid inputs such as `0:58.721`, `1:23.456`, and `2:03.000` save
- invalid inputs such as `123456`, `83.456`, `1:23`, `1:23.45`, `1:3.456`, `1:60.000`, and `0:00.000` do not save
- blank fields save as `null` and display as empty inputs / `-` differences
- PB, WR, target, and all three notes persist after save and reload
- summary counts update correctly
- WR and target differences have correct signs and precision
- one row's save failure does not disturb another row
- 375px viewport has no page-level horizontal overflow and the TA table itself can scroll horizontally
- existing Dashboard, Playing, VR, Lounge, Host, Analytics, Items, Courses, Records, Settings, overlay, and styleguide still render

If browser automation tooling is available, use it for the manual verification. If the backend or browser environment is unavailable, report the blocked checks precisely.

## Expected Report

- Changed files
- Summary
- Verification results
- Manual/browser verification results
- Blocked checks
- Any files changed outside `Files To Edit` / `Files To Add`
- Design questions for Codex
