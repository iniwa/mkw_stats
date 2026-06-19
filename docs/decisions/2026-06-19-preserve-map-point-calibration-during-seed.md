# 2026-06-19: Preserve map-point calibration during seed

## Context

World-map marker placement is calibrated through `PATCH /api/v1/map-points/{map_point_id}`.
The frontend sends normalized `x`/`y` (and optional `radius`) values, and the backend
commits them to the `map_points` table in PostgreSQL. These values are **shared server
state** — every browser and device using the same Raspberry Pi backend reads the same
coordinates. They are not browser-local storage.

The seed (`backend/app/seed/initial_data.py`) carries placeholder grid coordinates in
`MAP_POINTS`. Before this decision, `seed()` called `_sync_seed_fields(existing, mp_data)`
for existing map points, which copied the placeholder `x`/`y` over user-calibrated
production values on every run. The production seed runs of 2026-06-18 overwrote the
calibrated coordinates with the placeholder grid.

## Decision

- `map_points.x`, `map_points.y`, and `map_points.radius` are **user-managed calibration
  data** after a map point is first inserted.
- Seed values for those fields are **defaults for new rows only**. A missing map point is
  inserted with all seed fields, including the initial `x`/`y` (and `radius` when present).
- Repeated seed execution **must not overwrite** existing calibration. The coordinate
  fields are excluded when synchronizing an existing map point.
- Map-point identity, labels, and course ownership (`id`, `label_ja`, `label_en`,
  `course_id`) remain **seed-managed master data** and continue to synchronize on re-seed,
  unless a future decision changes that.

Calibration is shared PostgreSQL state, not browser-local state.

## Implementation

- `MAP_POINT_CALIBRATION_FIELDS = ("x", "y", "radius")` makes the ownership boundary explicit.
- `_sync_seed_fields(existing, values, *, exclude=())` skips excluded keys.
- The map-point branch of `seed()` passes `exclude=MAP_POINT_CALIBRATION_FIELDS`; the insert
  branch is unchanged, so fresh installs still receive usable initial coordinates.
- Course and route synchronization behavior is unchanged.
- VR-account behavior from `docs/decisions/2026-06-18-seed-vr-account-idempotency.md` is unchanged.

## Constraints Introduced

- A fresh database receives the seed coordinates for newly inserted map points.
- An existing map point keeps its current `x`, `y`, and `radius` across any number of re-seeds.
- An existing map point still receives synchronized seed-owned fields (`course_id`, labels).
- Regression tests in `backend/tests/test_smoke.py` cover fresh-insert coordinates and
  calibration preservation across a re-seed.

## Do Not Change Casually

- Do not make seed execution write `map_points.x/y/radius` on existing rows.
- Do not move label/course-ownership fields into the calibration exclusion set without a
  separate decision; they are intentionally still seed-managed.
- Do not change `PATCH /api/v1/map-points/{map_point_id}` behavior to compensate; calibration
  persistence belongs to the seed-ownership rule, not the API.
