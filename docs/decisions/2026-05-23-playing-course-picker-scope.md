# Playing Course Picker Scope

## Context

The route master seed now contains 30 courses and 203 routes. The current Playing view uses two plain `<select>` controls for start and destination map points. This is still functional, but too slow for repeated use during play.

## Decision

Improve the Playing course picker before adding route detail views or map geometry.

Keep the backend API unchanged. The picker should still resolve selections through `POST /api/v1/course-selection/resolve`; it should not perform route matching or rule decisions in the frontend.

## Reason

Fast course entry is part of the core vertical slice. A searchable picker gives immediate practical value and reduces mistakes without changing data contracts.

## Constraints

- Same-point selection remains a normal course selection (`kind=course`), per `2026-05-23-same-point-course-selection.md`.
- Do not add map images or coordinate editing in this slice.
- Do not add a new frontend dependency for combobox behavior unless the existing implementation becomes unreasonably complex.
- Keep the UI dense and tool-like, not a landing page or decorative card layout.

