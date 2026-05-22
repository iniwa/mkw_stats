Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Replace the tiny placeholder course seed with a real Mario Kart World course master seed.

This slice should add all real course masters and one map point per course, while keeping seed execution idempotent and preserving existing app behavior.

## Background

The current seed only has a handful of courses. That is enough for smoke tests, but it is not enough before implementing course notes and map annotations.

Course-related records reference stable IDs:

- `race_records.course_id`
- `race_records.route_id`
- `course_notes.course_id`
- `course_notes.route_id`
- `map_annotations.course_id`
- `map_annotations.route_id`

So we should not use temporary "test course 1" style masters. Use real course IDs now and adjust names/coordinates later if needed.

Reference page provided by the user:

- https://japan-mk.blog.jp/mkworld.info-1/route.html
- The article describes a Mario Kart World route confirmation tool and says it covers all 202 route patterns.
- The page HTML includes a JavaScript data object with `tracks` and `routes`. Use the `tracks` data as the source for course master names/order in this slice.

Related decision:

- `docs/decisions/2026-05-22-course-master-seed-strategy.md`
- `docs/decisions/2026-05-22-map-point-course-ownership.md`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-22-course-master-seed-strategy.md`
- `docs/decisions/2026-05-22-map-point-course-ownership.md`
- `backend/app/seed/initial_data.py`
- `backend/tests/test_smoke.py`
- `backend/tests/test_api.py`
- `backend/app/services/course_selection.py`
- `backend/app/api/courses.py`

## Files To Edit

- `backend/app/seed/initial_data.py`
- `backend/tests/test_smoke.py`

Edit only these files unless a small README note is clearly needed. If another source file needs to change, stop and ask Codex before editing.

## Constraints

- Do not change the DB schema.
- Do not create an Alembic migration.
- Do not add new dependencies.
- Preserve idempotent seed behavior.
- Keep `map_points.course_id -> courses.id` as the canonical course placement relation.
- Add all real course masters from the reference page `tracks` list.
- Add one `map_points` row per course.
- Placeholder `x`/`y` coordinates are acceptable, but they must be normalized floats in `[0, 1]`.
- Use stable snake_case ASCII IDs for `courses.id`.
- Use `mp_<course_id>` for `map_points.id`.
- Preserve existing IDs where they are already in use if they map to the same real course:
  - `crown_city`
  - `dk_pass`
  - `mario_bros_circuit`
  - `peach_stadium`
  - `rainbow_road`
- Fix any mojibake in seed Japanese display strings that you touch. Save the file as UTF-8.
- Keep at least one same-point route and at least one `is_lounge_12p_banned` route so existing tests and warning flows remain covered.
- Do not import all 202 route patterns in this handoff. Full route import should be a separate reviewed slice.

## Non Goals

- No Course Notes UI/API.
- No Map Annotations UI/API.
- No map image placement accuracy work.
- No full 202-route import.
- No Lounge sync work.
- No deployment, Docker, GHCR, or Portainer changes.
- No cleanup or migration of existing Pi test records.

## Implementation Guidance

Use the reference page's `tracks` list for the full course master set and sort order. The source page currently exposes 30 track entries in the JavaScript data object.

For English names, use clear, stable English labels where obvious. If unsure, prefer leaving `name_en` null over inventing a questionable translation. The Japanese `name_ja` and stable `id` matter more for the current UI.

Suggested ID style examples:

- `mario_bros_circuit`
- `crown_city`
- `whistlestop_summit`
- `dk_spaceport`
- `desert_hills`
- `shy_guy_bazaar`
- `wario_stadium`
- `airship_fortress`
- `dk_pass`
- `starview_peak`
- `sky_high_sundae`
- `wario_shipyard`
- `koopa_troopa_beach`
- `faraway_oasis`
- `peach_beach`
- `salty_salty_speedway`
- `dino_dino_jungle`
- `great_block_ruins`
- `cheep_cheep_falls`
- `dandelion_depths`
- `boo_cinema`
- `dry_bones_burnout`
- `moo_moo_meadows`
- `choco_mountain`
- `toads_factory`
- `bowsers_castle`
- `acorn_heights`
- `mario_circuit`
- `peach_stadium`
- `rainbow_road`

If a suggested English name differs from the reference page or current common naming, report the choice in the final report.

## Verification

Run from `backend`:

```powershell
python -m py_compile app\seed\initial_data.py tests\test_smoke.py
python -m pytest
```

Also perform a quick static check in the report:

- number of `COURSES`
- number of `MAP_POINTS`
- duplicate ID check result
- whether every `MAP_POINTS.course_id` exists in `COURSES`
- whether existing tests still include at least one same-point route and one 12p-banned route

Do not require live PostgreSQL for this handoff. If a live DB seed check is possible without changing deployment flow, it may be reported as extra, but it is not required.

## Expected Report

- Changed files
- Summary
- Course count and map point count
- Any course IDs whose names were uncertain
- Verification results
- Blocked checks
- Design questions for Codex
