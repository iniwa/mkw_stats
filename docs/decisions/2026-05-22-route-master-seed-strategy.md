# 2026-05-22: Seed route masters from reference route data

## Context

The app now has real course masters, but Playing course selection still has only a tiny route seed. Course selection, Lounge warnings, Records, and future route notes need stable `route_id` values before users start attaching notes and annotations.

The user-provided reference page exposes a route confirmation tool for Mario Kart World and states that it covers 202 route patterns.

## Decision

Seed the route master dataset from the reference page's route data before implementing route notes or map annotations.

Use `routes` as the canonical master table for route identity:

- `from_course_id`
- `to_course_id`
- `id`
- display names
- Lounge warning flags
- route metadata

Store reference-derived route facts in `routes.tags` as JSON object metadata. Keep the DB schema unchanged and widen application-level `tags` typing as needed.

## Reason

Stable route IDs let Playing, Records, Notes, and future map annotations all point to the same route identity. JSON metadata is enough for the first import and avoids premature schema churn for fields whose final UI usage is not yet known.

## Constraints Introduced

- Do not import routes with temporary IDs.
- Use deterministic route IDs derived from `from_course_id`, `to_course_id`, and a suffix only when needed.
- Keep `routes.tags` compatible with JSON object metadata.
- Preserve idempotent seed behavior.
- Do not draw route geometry or map paths in this slice.

## Do Not Change Casually

Do not split route facts into new tables or columns until the UI needs stable query behavior for those fields.

Do not rename existing route IDs without a migration plan for dependent race records, notes, and annotations.
