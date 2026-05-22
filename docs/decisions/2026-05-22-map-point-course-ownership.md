# 2026-05-22: Map point owns course reference

## Context

The v0.1 DB draft listed both `courses.map_point_id` and `map_points.course_id`, creating a circular and redundant relationship between courses and clickable map points.

Course selection starts from clicking a map point, then resolving that point to a normal course or route.

## Decision

Use `map_points.course_id -> courses.id` as the canonical relationship.

Do not keep `courses.map_point_id` in the initial schema.

## Reason

The Playing UI resolves from clicked map point to course. Keeping the reference on `map_points` avoids a circular FK, keeps seed ordering simple, and allows future map variants to add more than one clickable point for a course if needed.

## Constraints Introduced

- Course selection APIs should resolve clicked points through `map_points.course_id`.
- Seed data must insert courses before map points.
- A map point may be a pure location marker with `course_id = null` if future UI needs non-course points.

## Do Not Change Casually

Do not reintroduce `courses.map_point_id` without a concrete need for course-owned one-to-one map positioning.
