Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Fix the broken annotation feather icon mapping and synchronize documentation with the current implementation state found by the 2026-05-31 audit.

This is a small correctness + docs slice. Keep it tightly scoped.

## Background

The current-state audit found:

- `frontend/src/api.ts` defines an annotation icon value `feather`.
- The actual local icon file is `frontend/public/assets/annotation-icons/hane.png`.
- As a result, selecting the feather/wing annotation icon can render a broken image.
- Image asset docs are stale after later ClaudeCode work:
  - course images are now present 30/30
  - route images are much more complete than the older 11/203 docs say
  - route goal images also exist
  - annotation icons now exist
- `ui-redesign-roadmap.md` does not record recent completed work for icon-type annotations and route goal-image annotations.

Design decisions for this slice:

- Fix only the confirmed broken icon path.
- Do not expand the available icon list from `_etc/` in this slice.
- Do not implement `is_goal_image` update editing here; that should be a separate API/UI slice.
- Do not merge or redesign Analytics tabs here.

## Files To Inspect

- `frontend/src/api.ts`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/TargetAssist.tsx`
- `frontend/public/assets/annotation-icons/`
- `frontend/public/assets/courses/`
- `frontend/public/assets/routes/`
- `frontend/public/assets/course-icons/`
- `frontend/public/assets/maps/`
- `docs/design/image-asset-candidates.md`
- `docs/design/route-image-assets.md`
- `docs/design/course-image-assets.md`
- `docs/design/course-icon-assets.md`
- `docs/design/ui-redesign-roadmap.md`
- `docs/handoffs/README.md`

## Files To Edit

- `frontend/src/api.ts`
- `docs/design/image-asset-candidates.md`
- `docs/design/route-image-assets.md`
- `docs/design/ui-redesign-roadmap.md`
- `docs/handoffs/README.md`

Only edit another file if it is strictly required for the icon fix or documentation consistency, and report why.

## Constraints

- No backend changes.
- No DB migrations.
- No new npm dependencies.
- No image downloads.
- Do not add or remove image assets.
- Do not edit `issues.md` unless it contains a live unchecked item directly matching this exact work.
- Do not change annotation icon semantics beyond the confirmed feather/hane mismatch.
- Preserve existing Japanese labels unless fixing obvious broken text caused by this specific work.

## Implementation Details

### 1. Feather icon fix

Inspect how annotation icon image paths are derived.

Expected fix:

- Make the annotation icon value match the existing file name.
- The visible label should remain `羽`.
- The runtime image URL should resolve to `/assets/annotation-icons/hane.png`.

Prefer the smallest compatible change. For example, changing the icon `value` from `feather` to `hane` is acceptable if existing data does not depend on `feather`.

If existing saved annotations may already contain `icon_type = "feather"`, stop and report the compatibility issue before changing behavior.

### 2. Documentation sync

Update docs to match current local state.

At minimum:

- `docs/design/image-asset-candidates.md`
  - Update route/course/icon counts to current actual files.
  - Mention route path images and route goal images separately if both exist.
  - Mention annotation icon assets if this doc is now the asset inventory source.
- `docs/design/route-image-assets.md`
  - Replace stale 11/203 status with the current status.
  - Include the distinction between path images and `_goal` images.
  - Note any missing route image count if detected.
- `docs/design/ui-redesign-roadmap.md`
  - Add completed notes for icon-type annotations.
  - Add completed notes for route goal-image annotations.
  - Add completed notes for route map/goal image display if missing.
- `docs/handoffs/README.md`
  - Remove the current-state audit from active verification if still listed.
  - List this handoff under Active Implementation Handoffs while it is active.

Keep the docs factual. Do not claim manual Pi verification unless it was actually performed in this slice.

## Non Goals

- Do not implement `is_goal_image` update editing.
- Do not add new annotation icons from `_etc/`.
- Do not acquire course icons.
- Do not acquire or regenerate course/route images.
- Do not change Analytics / VR Analytics / Lounge Analytics navigation.
- Do not deploy to Pi.

## Verification

Run:

- `npm run typecheck` from `frontend/`
- `npm run build` from `frontend/`
- `git diff --check`

Also report:

- Count of files under `frontend/public/assets/annotation-icons/` excluding `_etc/` and `.gitkeep`
- Count of `.png` files under `frontend/public/assets/courses/`
- Count of route path images under `frontend/public/assets/routes/` excluding `_goal.png`
- Count of route goal images under `frontend/public/assets/routes/` ending in `_goal.png`
- Whether `/assets/annotation-icons/hane.png` is the path implied by the frontend after the fix

Browser verification is optional for this small slice. If not done, say so.

## Expected Report

- Changed files
- Summary
- Exact icon mapping before/after
- Asset counts used for docs
- Verification results
- Blocked checks
- Design questions for Codex

