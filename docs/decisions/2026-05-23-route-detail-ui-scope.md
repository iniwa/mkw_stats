# Route Detail UI Scope

## Context

Route masters now include reference-derived metadata in `routes.tags`, including fields such as:

- `source`
- `source_url`
- `source_key`
- `sections`
- `goal_shape`
- `goal_simple`
- `gimmicks`
- `image_url`

The Playing confirmation view currently shows only the resolved route/course name and backend confirmation message. Records also shows only the route name for past route races.

## Decision

Expose route metadata in the frontend before adding route notes, annotations, or map geometry.

Start with a compact route detail panel in the Playing confirmation view. Reuse the same lightweight rendering in Records race details when a race has `route_id`.

## Reason

The metadata is already present in the API and useful during play. Showing it improves route confirmation without changing the backend, DB schema, or route identity model.

## Constraints

- Do not add backend fields or migrations in this slice.
- Treat `routes.tags` as untrusted/optional JSON and render only known primitive fields.
- Do not fetch or embed external route images yet; show an external link when `image_url` exists.
- Do not render raw JSON dumps in the UI.
- Keep the UI dense and readable on mobile.

