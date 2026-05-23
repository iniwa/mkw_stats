Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Show reference route metadata in the frontend so users can confirm道中ルート details during play and review them in Records.

Primary target:

- Playing confirmation screen after `POST /api/v1/course-selection/resolve`

Secondary target:

- Records race detail rows for races with `route_id`

Keep this frontend-only.

## Background

The route master seed now stores reference-page route facts in `routes.tags` as a JSON object. Example fields:

- `source`
- `source_url`
- `source_key`
- `sections`
- `goal_shape`
- `goal_simple`
- `gimmicks`
- `image_url`

Current behavior:

- `SelectionConfirm` in `frontend/src/PlayingView.tsx` shows route/course kind, display name, and backend confirmation message.
- `RecordsView` shows only the route name for route races.
- `Route.tags` is already typed as `unknown[] | Record<string, unknown> | null` in `frontend/src/api.ts`.

Relevant decisions:

- `docs/decisions/2026-05-23-route-detail-ui-scope.md`
- `docs/decisions/2026-05-22-route-master-seed-strategy.md`
- `docs/decisions/2026-05-23-same-point-course-selection.md`

## Files To Inspect

- `frontend/src/api.ts`
- `frontend/src/PlayingView.tsx`
- `frontend/src/RecordsView.tsx`
- `frontend/src/App.css`
- `docs/decisions/2026-05-23-route-detail-ui-scope.md`
- `docs/decisions/2026-05-22-route-master-seed-strategy.md`

## Files To Edit

- `frontend/src/PlayingView.tsx`
- `frontend/src/RecordsView.tsx`
- `frontend/src/App.css`

Do not edit backend files for this slice.

## Constraints

- Keep frontend-only.
- Do not add npm dependencies.
- Do not change API endpoints or backend schemas.
- Do not change course selection, session, race, or undo behavior.
- Do not render raw `tags` JSON.
- Do not assume `tags` is always an object.
- Do not crash if fields are absent, null, arrays, numbers, or unexpected types.
- Do not display external images inline in this slice. If `image_url` exists, show a normal external link.
- Do not create map/route geometry.
- Do not add route notes or annotations.
- Keep UI compact and tool-like.
- Avoid text overflow on mobile; long route descriptions should wrap or be bounded.

## Required Behavior

### Route Metadata Parsing

Add small helper functions in frontend code, for example:

- `getRouteTags(route: Route | null | undefined)`
- `stringTag(tags, key)`
- `numberTag(tags, key)`
- `stringArrayTag(tags, key)`

The exact names are flexible. The important point is to safely extract known route metadata from `Route.tags`.

Known fields to display when present:

- `sections`: show as `セクション: N`
- `goal_simple`: show as a compact goal summary
- `goal_shape`: show as detailed route/goal text, preserving line breaks
- `gimmicks`: show as tags/chips if it is a string array and non-empty
- `source_key`: show as a small source reference, for example `参照: 29-30`
- `image_url`: show as a link labeled `参考画像を開く`

Skip missing or invalid fields silently.

### Playing Confirmation

In `SelectionConfirm`:

- For `resolved.kind === 'route'`, render a compact route detail block below `confirm_message`.
- For `resolved.kind === 'course'`, do not show route metadata.
- Keep existing buttons and busy behavior unchanged.
- Do not make the confirmation screen visually huge. Use dense rows and restrained spacing.

Expected visual content for a route with metadata:

- route kind/name as today
- existing confirmation message
- route detail block:
  - sections
  - goal simple
  - goal shape
  - gimmick chips if any
  - source key
  - image link if any

### Records View

In `RecordsView`:

- When a race has `route_id`, find the matching route and show the same compact route detail below the race row.
- Keep it smaller than Playing confirmation.
- Do not show route detail for normal course races.
- Cancelled route races may still show route details; do not special-case them away.

### Styling

Add CSS classes for the detail block in `frontend/src/App.css`.

Suggested class names:

- `.route-detail`
- `.route-detail__row`
- `.route-detail__label`
- `.route-detail__text`
- `.route-detail__chips`
- `.route-detail__chip`
- `.route-detail__link`

Keep the design consistent with existing dark, utilitarian UI.

## Verification

Run:

```bash
cd frontend
npm run typecheck
npm run build
```

Recommended browser checks when backend/Pi is available:

- Playing: choose `ピーチスタジアム -> レインボーロード`; confirmation shows route details and no console errors.
- Playing: choose `DKスノーマウンテン -> DKスノーマウンテン`; confirmation remains normal course with no route detail block.
- Playing: choose a route with line breaks in `goal_shape`; text wraps cleanly.
- Records: open a session containing a route race; route detail appears below the route race row.
- Records: course-only races do not show route detail.
- Mobile/narrow width: route detail text wraps without overlapping buttons or adjacent rows.

If local backend is unavailable, type/build verification is enough; report browser checks as blocked.

## Non Goals

- No backend changes.
- No DB changes.
- No migration.
- No image embedding.
- No map drawing.
- No route geometry or route path editing.
- No route notes, annotations, or file uploads.
- No Lounge banned-route classification.

## Expected Report

Report in Japanese:

- Changed files
- Summary of route detail behavior
- Verification results
- Browser checks performed or blocked
- Any blocked checks and why
- Design questions for Codex

