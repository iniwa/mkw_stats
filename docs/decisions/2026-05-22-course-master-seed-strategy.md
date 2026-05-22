# 2026-05-22: Seed real course masters before notes

## Context

The initial seed only contains a few placeholder courses. The app now records races, shows history, and will later attach course notes and map annotations to `course_id` or `route_id`.

Using placeholder names such as "test course 1" would make later migration harder because race history, notes, and annotations would need to be remapped to real courses.

## Decision

Seed real Mario Kart World course masters before implementing course notes or map annotations.

Use stable string IDs for `courses.id`, `map_points.id`, and `routes.id`. Once an ID has been used by race records, notes, or annotations, treat it as immutable.

Use the user-provided reference page as the source of truth for Japanese course display names. Internal IDs may preserve older English-derived names when existing records already reference them.

In this phase, seed all real course masters and one map point per course. Coordinates may remain placeholders until the actual map image and point placement are chosen.

## Reason

Course names, labels, coordinates, aliases, and sort order can be corrected later without breaking references. Changing IDs after records exist is higher risk.

Seeding real course IDs now keeps Playing, Records, and future Notes using the same durable identifiers from the start.

## Constraints Introduced

- Do not introduce "test course" master data for normal app operation.
- Prefer updates to names, coordinates, aliases, and `is_active` over ID changes.
- Do not delete course masters that may be referenced by race records. Mark them inactive if needed.
- Keep seed data idempotent.

## Do Not Change Casually

Do not rename existing seeded course IDs without a migration plan for dependent records.

Do not import the full route dataset in the same slice unless the route scope has been separately reviewed.
