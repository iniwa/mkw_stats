Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, docs/decisions/2026-05-25-map-image-asset-policy.md, and this handoff file before implementation.
This handoff is ready for implementation after Codex review of the course-notes target view.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add the first local image asset foundation for route/course visuals.

This slice focuses on asset directories, approved image acquisition, and route image display in Playing. It does not add the world-map picker or coordinate calibration yet.

## Background

User-approved image source:

- `https://japan-mk.blog.jp/mkworld.info-1/route.html`

Images referenced by this page may be downloaded and stored locally for this private LAN tool. Do not hotlink them at runtime.

Asset conventions:

```text
/assets/maps/world.png
/assets/course-icons/<course_id>.png
/assets/routes/<route_id>.png
```

Route master data already includes `tags.source_key` and may include `tags.image_url` for some routes. Prefer explicit route metadata when available.

## Files To Inspect

- `docs/decisions/2026-05-25-map-image-asset-policy.md`
- `backend/app/seed/initial_data.py`
- `frontend/src/PlayingView.tsx`
- `frontend/src/RouteDetail.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`

## Files To Edit

- `frontend/src/PlayingView.tsx`
- `frontend/src/RouteImage.tsx` or another small route image component if useful
- `frontend/src/App.css`
- `frontend/public/assets/maps/.gitkeep`
- `frontend/public/assets/course-icons/.gitkeep`
- `frontend/public/assets/routes/.gitkeep`
- optional small helper under `scripts/` or `tools/` for acquiring approved assets
- optional downloaded route/course image assets under `frontend/public/assets/...`

Do not edit backend APIs in this slice.

## Constraints

- You may download route/course images only from `https://japan-mk.blog.jp/mkworld.info-1/route.html` and URLs referenced by that page.
- Do not scrape, download, or generate unrelated third-party image assets.
- Do not hotlink external images from frontend runtime code.
- Missing images must not show broken-image UI or block race recording.
- Do not add upload/storage APIs.
- Do not implement world-map picker in this slice.
- Do not implement coordinate calibration in this slice.
- Keep `RouteDetail` text metadata visible.
- 375px viewport must remain usable.

## Required Behavior

Create asset directories:

```text
frontend/public/assets/maps/
frontend/public/assets/course-icons/
frontend/public/assets/routes/
```

Add `.gitkeep` files where needed.

### Asset Acquisition

If adding a helper script:

- keep it deterministic and scoped to the approved reference page.
- map route images to existing `route_id` values.
- prefer `route.tags.image_url` if available.
- use route `tags.source_key` when needed to derive a reference image URL.
- save route images as `frontend/public/assets/routes/<route_id>.png`.
- save course icons/images as `frontend/public/assets/course-icons/<course_id>.png` only if the approved page provides them and the mapping is clear.
- do not fail if some assets are unavailable.
- report acquired and missing counts.

If asset acquisition is too uncertain, stop after creating directories and report what mapping decision is missing.

### Route Image Display

When the user resolves/selects a route in Playing:

- show `/assets/routes/<route_id>.png` when present.
- place the image near the route confirmation/assist context, before final result input.
- keep `RouteDetail` visible.
- if the image is missing, render the existing text metadata with no broken image.
- route image display must not block recording.

Normal course selections do not need route image UI.

## Non Goals

- World-map picker.
- Map point dragging/calibration.
- Backend coordinate API.
- Drag/drop annotation editor.
- Upload API.
- Broad asset scraping.

## Verification

Run:

```text
npm run typecheck
npm run build
```

Manual/browser check if feasible:

- route selection displays route image when `/assets/routes/<route_id>.png` exists.
- route selection falls back cleanly when the image is missing.
- normal course selection has no broken image.
- `RouteDetail` remains visible.
- Playing flow still records ranked and Lounge races.
- 375px viewport has no horizontal overflow.
- console has no React/JavaScript errors.

## Expected Report

Report in Japanese:

- Changed files
- Asset source and storage used
- Number of route/course image assets acquired, if any
- Summary
- Verification results
- Blocked checks
- Design questions for Codex
