Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Seed the Mario Kart World route master dataset from the user-provided reference page.

This slice should make Playing UI course selection work for the real route set while preserving existing race records and avoiding schema changes.

## Background

The previous slice seeded 30 real course masters and one map point per course. The next missing piece is `routes`: currently only two route records exist.

Reference page:

- https://japan-mk.blog.jp/mkworld.info-1/route.html
- The page describes a route confirmation tool and says it covers all 202 route patterns.
- The page HTML includes a JavaScript data object with `tracks` and `routes`.
- Use the reference page's route data as the source of truth for route pairs and route facts.

Relevant decisions:

- `docs/decisions/2026-05-22-course-master-seed-strategy.md`
- `docs/decisions/2026-05-22-route-master-seed-strategy.md`
- `docs/decisions/2026-05-22-map-point-course-ownership.md`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `backend/app/seed/initial_data.py`
- `backend/app/models/courses.py`
- `backend/app/schemas/__init__.py`
- `backend/app/services/course_selection.py`
- `backend/app/api/courses.py`
- `backend/tests/test_smoke.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `docs/decisions/2026-05-22-route-master-seed-strategy.md`

## Files To Edit

- `backend/app/seed/initial_data.py`
- `backend/app/models/courses.py`
- `backend/app/schemas/__init__.py`
- `backend/tests/test_smoke.py`
- `frontend/src/api.ts`

Do not edit other files unless required to fix a test caused directly by these changes. If a broader API/UI change appears necessary, stop and ask Codex first.

## Constraints

- Do not change the DB schema.
- Do not create an Alembic migration.
- Do not add new dependencies.
- Preserve existing course IDs.
- Preserve existing route IDs if they are already referenced:
  - `rt_dk_pass_3lap`
  - `rt_peach_to_rainbow`
- Keep seed behavior idempotent.
- Use the reference page as the source of truth for Japanese display names and route facts.
- Keep `map_points.course_id -> courses.id` as the course selection path.
- Do not import route geometry, map lines, item-box positions, or shortcut annotations in this slice.
- Do not make deployment, Docker, GHCR, or Portainer changes.

## Route Data Shape

Use one `routes` row per reference route pattern.

Suggested route row shape:

```python
{
    "id": "rt_<from_course_id>_to_<to_course_id>",
    "from_course_id": "<course id>",
    "to_course_id": "<course id>",
    "name_ja": "<from name> -> <to name>",
    "name_en": "<from English> -> <to English>",
    "is_lounge_12p_banned": False,
    "repick_group_key": "rt_<from_course_id>_to_<to_course_id>",
    "tags": {
        "source": "japan-mk",
        "source_url": "https://japan-mk.blog.jp/mkworld.info-1/route.html",
        "source_key": "1-2",
        "sections": 3,
        "goal_shape": "...",
        "goal_simple": "...",
        "gimmicks": ["..."],
        "image_url": "..."
    },
    "sort_order": 1000,
}
```

If the same `from_course_id` and `to_course_id` pair has multiple route patterns, use deterministic suffixes:

```text
rt_<from>_to_<to>_a
rt_<from>_to_<to>_b
```

Sort order should be deterministic. A simple option is the numeric order of the reference `source_key`, for example `from_track_id * 1000 + to_track_id`, with suffix offsets if needed.

## Course ID Mapping

The reference route keys appear to use numeric track IDs. Map them to the seeded course IDs in `COURSES`.

Important existing ID notes:

- Reference track id `2` maps to internal `crown_city`.
- Reference track id `9` maps to internal `dk_pass`.
- Internal IDs are stable even when English names differ from the reference page.

Do not rename course IDs to match new English guesses.

## Tags Typing

`routes.tags` should hold JSON object metadata, not only a list.

Because the current Python and TypeScript types are list-oriented, update application-level typing without changing DB schema:

- `backend/app/models/courses.py`: widen `tags` type annotations where needed to allow JSON object metadata.
- `backend/app/schemas/__init__.py`: widen `tags` response fields so Pydantic accepts JSON object metadata.
- `frontend/src/api.ts`: widen `Course.tags` / `Route.tags` types from `unknown[] | null` to a JSON-compatible type.

Keep the change minimal. Do not add a new package for JSON typing.

## Existing Routes

Preserve the existing routes if possible:

- `rt_dk_pass_3lap`
- `rt_peach_to_rainbow`

If the reference dataset contains equivalent rows, either keep these IDs for those rows or clearly explain any compatibility decision in the report. Do not delete them silently because local/Pi race records may reference them.

## Lounge Flags

Set `is_lounge_12p_banned` only when the reference route data has enough information to identify a 12-player Lounge-banned route, or when preserving the existing test fixture requires it.

If the reference data does not encode 12p ban status, keep most imported rows `False` and preserve at least one `True` fixture route until a later Lounge-rule pass.

## Non Goals

- No full route UI redesign.
- No map drawing or geometry.
- No item-box/shortcut annotations.
- No Course Notes API/UI.
- No Map Annotations API/UI.
- No route deletion/migration on Pi.
- No live Portainer deployment verification.

## Verification

Run from `backend`:

```powershell
python -m py_compile app\seed\initial_data.py app\models\courses.py app\schemas\__init__.py tests\test_smoke.py
python -m pytest
```

Run from `frontend`:

```powershell
npm run typecheck
npm run build
```

Add/adjust smoke tests to verify:

- no duplicate route IDs
- every `ROUTES.from_course_id` and `ROUTES.to_course_id` exists in `COURSES`
- every route has exactly one deterministic `id`
- imported route count is reported and is expected from the reference extraction
- at least one same-point route still exists
- at least one 12p-banned route still exists, even if it remains a fixture pending Lounge-rule refinement
- route `tags`, when present, include `source`, `source_key`, and reference-derived fields where available

Do not require live PostgreSQL for this handoff.

## Expected Report

- Changed files
- Summary
- Route count
- Extraction method used for the reference page
- Any route keys that could not be mapped to seeded course IDs
- Existing route compatibility decisions
- Verification results
- Blocked checks
- Design questions for Codex
