Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Prepare and verify course icon assets for the existing world-map picker.

The app already supports optional course icons at:

```text
frontend/public/assets/course-icons/<course_id>.png
```

This slice should make the expected asset set explicit and verify that icon files, when present, render correctly on the Playing world map. Do not redesign the picker.

## Background

Current implemented behavior:

- `WorldMapPicker` loads the base map from `/assets/maps/world.png`.
- `WorldMapPicker` tries `/assets/course-icons/<course_id>.png` for each map point.
- Missing icons fall back to text markers.
- The user has added the world map image and it is committed at `frontend/public/assets/maps/world.png`.
- The user mentioned these pages as possible visual references:
  - `https://www.mariowiki.com/Mario_Kart_World#Courses`
  - `https://japan-mk.blog.jp/mkworld.info-1/route.html`

Asset policy:

- Read `docs/decisions/2026-05-25-map-image-asset-policy.md`.
- Do not hotlink image URLs at runtime.
- Do not add broad scraping/download automation.
- If third-party images are used, they must be stored locally under `frontend/public/assets/course-icons/` and treated as private LAN-use assets.

`issues.md` is an untracked user scratch note. Do not edit or commit it in this handoff.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-25-map-image-asset-policy.md`
- `docs/design/ui-redesign-roadmap.md`
- `frontend/src/WorldMapPicker.tsx`
- `frontend/src/PlayingView.tsx`
- `backend/app/seed/initial_data.py`
- `frontend/public/assets/maps/world.png`
- `frontend/public/assets/course-icons/`

## Files To Edit

Allowed:

- `frontend/public/assets/course-icons/*.png`
- `docs/design/course-icon-assets.md`

Do not edit frontend/backend source code unless a clear bug prevents the already-implemented optional icon behavior from working.

Do not edit `issues.md`.

## Required Work

### 1. Create Course Icon Asset Checklist

Create `docs/design/course-icon-assets.md` with:

- the expected icon path convention
- source/usage note: local-only assets, no runtime hotlinking
- a checklist of all 30 course ids and expected file paths
- current status for each icon: `missing` or `present`

Expected course icon filenames:

```text
frontend/public/assets/course-icons/mario_bros_circuit.png
frontend/public/assets/course-icons/crown_city.png
frontend/public/assets/course-icons/whistlestop_summit.png
frontend/public/assets/course-icons/dk_spaceport.png
frontend/public/assets/course-icons/desert_hills.png
frontend/public/assets/course-icons/shy_guy_bazaar.png
frontend/public/assets/course-icons/wario_stadium.png
frontend/public/assets/course-icons/airship_fortress.png
frontend/public/assets/course-icons/dk_pass.png
frontend/public/assets/course-icons/starview_peak.png
frontend/public/assets/course-icons/sky_high_sundae.png
frontend/public/assets/course-icons/wario_shipyard.png
frontend/public/assets/course-icons/koopa_troopa_beach.png
frontend/public/assets/course-icons/faraway_oasis.png
frontend/public/assets/course-icons/peach_beach.png
frontend/public/assets/course-icons/salty_salty_speedway.png
frontend/public/assets/course-icons/dino_dino_jungle.png
frontend/public/assets/course-icons/great_block_ruins.png
frontend/public/assets/course-icons/cheep_cheep_falls.png
frontend/public/assets/course-icons/dandelion_depths.png
frontend/public/assets/course-icons/boo_cinema.png
frontend/public/assets/course-icons/dry_bones_burnout.png
frontend/public/assets/course-icons/moo_moo_meadows.png
frontend/public/assets/course-icons/choco_mountain.png
frontend/public/assets/course-icons/toads_factory.png
frontend/public/assets/course-icons/bowsers_castle.png
frontend/public/assets/course-icons/acorn_heights.png
frontend/public/assets/course-icons/mario_circuit.png
frontend/public/assets/course-icons/peach_stadium.png
frontend/public/assets/course-icons/rainbow_road.png
```

### 2. Handle Existing Icon Files Only

Inspect `frontend/public/assets/course-icons/`.

If the user has already placed icon image files there:

- verify each file uses a known `course_id` filename
- leave valid files in place
- report any unknown filenames
- do not rename files unless the intended course id is obvious from the filename

If no icon files are present:

- do not download images
- leave `.gitkeep` in place
- report that the checklist is ready and manual icon placement remains

### 3. Build Verification

Run from `frontend/`:

- `npm run typecheck`
- `npm run build`

### 4. Browser Verification

Using a local dev server if available:

- Playing view loads.
- Starting a ranked/野良VR flow shows the world map picker.
- If at least one icon file is present, that course marker renders as an image.
- Courses without icon files still render as text markers.
- Marker click selection still updates from/to state.
- Same-point selection still resolves a normal course.
- Different-point selection still resolves a route where applicable.

Do not create persistent play data unless needed. If temporary sessions are created, finish and clean them up before reporting.

### 5. Responsive / Console

At 375px width:

- world-map picker has no horizontal overflow
- image markers and text fallback markers remain tappable

Check browser console:

- no JavaScript/React errors
- no broken image noise that causes UI errors

## Constraints

- Do not edit `issues.md`.
- Do not download images in this handoff.
- Do not add scraping scripts.
- Do not hotlink external images at runtime.
- Do not change `WorldMapPicker` behavior unless a real bug blocks verification.
- Do not change map point coordinates.
- Do not add backend/API changes.
- Do not resize/recompress any user-provided icon image unless explicitly asked.
- Do not commit or push unless explicitly requested.

## Non Goals

- No route image download.
- No world map coordinate calibration.
- No Courses page redesign.
- No image upload UI.
- No automated image acquisition.
- No Pi deployment.

## Verification

Expected result:

- `docs/design/course-icon-assets.md` exists and lists all 30 expected course icon paths.
- Any existing icon files are validated against known course ids.
- Typecheck/build pass.
- Playing world-map picker still works with missing icons.
- If at least one icon is present, it renders over the world map.
- No horizontal overflow at 375px.
- No console errors from this change.

## Expected Report

- Changed files
- Summary
- Icon files found / missing count
- Unknown or suspicious icon filenames, if any
- Verification results
- Browser results
- 375px results
- Console/network errors
- Any temporary data created and cleanup result
- Manual follow-up items for the user
- Blocked checks
- Design questions for Codex
