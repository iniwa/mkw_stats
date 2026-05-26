Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Download the remaining approved route image assets that are already referenced by seed metadata, store them locally, and verify route image display still works in Playing and Courses.

This is an asset completion and verification slice. Do not redesign route UI.

## Background

Route image support already exists:

- `RouteImage` / Playing route confirmation can display `/assets/routes/<route_id>.png`.
- `AnnotationEditor` uses `/assets/routes/<route_id>.png` as the visual placement surface for route targets.
- Missing route images fall back gracefully.
- One route image is already present:
  - `frontend/public/assets/routes/rt_mario_bros_circuit_to_crown_city.png`

There is an existing helper script:

```text
scripts/download_route_images.py
```

It reads route `tags.image_url` values from `backend/app/seed/initial_data.py` and saves images to:

```text
frontend/public/assets/routes/<route_id>.png
```

Approved image source:

- `https://japan-mk.blog.jp/mkworld.info-1/route.html`

The current dry run from repo root reports:

```text
acquired: 10  skipped(exists): 1  no-url: 192  failed: 0
```

Expected additional route images:

```text
rt_mario_bros_circuit_to_whistlestop_summit.png
rt_crown_city_to_mario_bros_circuit.png
rt_crown_city_to_whistlestop_summit.png
rt_crown_city_to_dk_spaceport.png
rt_whistlestop_summit_to_mario_bros_circuit.png
rt_whistlestop_summit_to_crown_city.png
rt_whistlestop_summit_to_dk_spaceport.png
rt_dk_spaceport_to_mario_bros_circuit.png
rt_dk_spaceport_to_crown_city.png
rt_dk_spaceport_to_whistlestop_summit.png
```

`issues.md` is an untracked user scratch note. Do not edit or commit it in this handoff.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-25-map-image-asset-policy.md`
- `docs/design/ui-redesign-roadmap.md`
- `docs/handoffs/archive/2026-05-25-route-image-assets.md`
- `scripts/download_route_images.py`
- `backend/app/seed/initial_data.py`
- `frontend/src/RouteImage.tsx`
- `frontend/src/AnnotationEditor.tsx`
- `frontend/src/PlayingView.tsx`
- `frontend/public/assets/routes/`

## Files To Edit

Allowed:

- `frontend/public/assets/routes/*.png`
- `docs/design/route-image-assets.md`

Do not edit frontend/backend source code unless a clear bug prevents the already-implemented route image behavior from working.

Do not edit `issues.md`.

## Required Work

### 1. Confirm Existing Route Image State

Run from repo root:

```text
python scripts/download_route_images.py --dry-run
```

Record:

- existing/skipped image count
- additional downloadable image count
- no-url count
- failed count

### 2. Download Approved Route Images

Run from repo root:

```text
python scripts/download_route_images.py
```

Only use this existing script. Do not add scraping behavior or new sources.

After download:

- confirm existing image remains
- confirm expected new files are present
- report file sizes
- report any failed downloads

If the network blocks downloads, stop after dry-run and report the blocker. Do not replace images with placeholders.

### 3. Create Route Image Asset Checklist

Create `docs/design/route-image-assets.md` with:

- path convention: `frontend/public/assets/routes/<route_id>.png`
- source note: approved source URLs from seed metadata / approved reference page
- a table of the 11 routes with `image_url` metadata
- current status: `present`, `missing`, or `failed`
- note that the remaining 192 routes have no `image_url` in seed metadata and intentionally fall back

Use the route ids listed in Background plus the existing `rt_mario_bros_circuit_to_crown_city`.

### 4. Build Verification

Run from `frontend/`:

- `npm run typecheck`
- `npm run build`

### 5. Browser Verification

Using a local dev server if available:

Playing:

- Start a ranked/野良VR flow.
- Select a route that now has a local image.
- Confirm that the route confirmation view shows the route image.
- Select a route without a local image and confirm graceful fallback.
- Do not leave persistent play data. Finish and clean up any temporary sessions if created.

Courses:

- Select a route target that has a local image.
- Confirm the annotation visual surface uses the route image.
- Select a route target without a local image.
- Confirm fallback surface works with no broken image UI.

### 6. Responsive / Console

At 375px width:

- Playing route image display has no horizontal overflow.
- Courses annotation route image surface has no horizontal overflow.

Check browser console:

- no JavaScript/React errors
- no broken-image UI errors from route image handling

## Constraints

- Do not edit `issues.md`.
- Do not add new image sources.
- Do not add broad scraping/download automation.
- Use only `scripts/download_route_images.py` for acquisition.
- Do not hotlink external images at runtime.
- Do not resize, crop, or recompress downloaded images.
- Do not change route ids or seed route metadata.
- Do not change frontend/backend source unless a clear display bug blocks verification.
- Do not add backend/API changes.
- Do not commit or push unless explicitly requested.

## Non Goals

- No course icon acquisition.
- No world map coordinate calibration.
- No route image UI redesign.
- No image upload UI.
- No Pi deployment.
- No attempt to find images for all 203 routes.

## Verification

Expected result:

- 11 route image files are present under `frontend/public/assets/routes/` if all downloads succeed.
- `docs/design/route-image-assets.md` exists.
- Typecheck/build pass.
- Playing route confirmation shows local route images where present.
- Courses route annotation surface shows local route images where present.
- Missing route images still fall back cleanly.
- No horizontal overflow at 375px.
- No console errors from this change.

## Expected Report

- Changed files
- Summary
- Dry-run output summary
- Downloaded files and sizes
- Failed or skipped downloads
- Verification results
- Browser results
- 375px results
- Console/network errors
- Any temporary data created and cleanup result
- Manual follow-up items for the user
- Blocked checks
- Design questions for Codex
