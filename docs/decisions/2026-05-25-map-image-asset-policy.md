# Map Image Asset Policy

## Context

The UI redesign roadmap wants a future map/image-based course and route selection flow:

- select map points on an image
- show notes and annotations on top of that image
- use course/route visual context while playing

The app already has:

- 30 course records
- 30 map points with normalized placeholder `x` / `y`
- route records
- course/route notes
- map annotations with normalized coordinates

However, the source and licensing status of Mario Kart World map images is unresolved. The project is private and LAN-only, but the repo can still be mirrored to GitHub and built through GHCR, so bundling third-party images in the repository should be treated carefully.

## Decision

Do not download, scrape, or commit fan-site map/course images as part of automated implementation.

For the first map-image slice:

- Use a local, manually provided asset directory only.
- Keep the app functional with no image assets present.
- Add read-only image display and annotation overlays only when an asset path is configured or present.
- Preserve text/search selection as the primary fallback.
- Keep annotation coordinates normalized `0.0` to `1.0`.

Recommended repo-side structure:

```text
frontend/public/assets/maps/
frontend/public/assets/course-icons/
```

These directories may contain `.gitkeep` files and small project-owned placeholders, but should not contain copyrighted/fan-site images unless the user explicitly provides and approves them for this private project.

Recommended runtime URL convention:

```text
/assets/maps/<asset-id>.png
/assets/course-icons/<course-id>.png
```

The first implementation should use deterministic optional lookup rather than adding upload/storage:

- world or overview map: `/assets/maps/world.png`
- course icon: `/assets/course-icons/<course_id>.png`

If an image is missing, the UI should show the existing text/normalized preview instead of an error.

## Reason

This allows the frontend and annotation overlay logic to be built without blocking on asset procurement or licensing.

Keeping assets under `frontend/public/assets/...` is simple for Vite/nginx and does not require backend file APIs. Optional lookup lets the Pi deployment work before images are added.

Avoiding automated scraping keeps the implementation clean and avoids storing unclear third-party material in Git.

## Constraints

- Do not add image upload APIs in the first slice.
- Do not add external CDN dependencies.
- Do not scrape images from reference or fan sites.
- Do not make map images required to record a race.
- Do not replace searchable text selection; keep it as fallback.
- Do not change `map_points.x/y` semantics; they remain normalized coordinates.
- If real images are added later, coordinate calibration must be verified separately on desktop and 375px viewport.

## Follow-Up Work

The next map-image handoff may:

- add optional asset directories and `.gitkeep`
- add a reusable read-only map/annotation display component
- show `/assets/maps/world.png` when present
- overlay existing map annotations using normalized coordinates
- show course icons when `/assets/course-icons/<course_id>.png` exists

Future work may decide whether to:

- add an asset manifest
- store per-course image paths in the database
- calibrate real map point coordinates
- support drag/drop annotation editing

## Do Not Change Casually

Do not start committing third-party image assets or adding scraping/downloading code without an explicit user decision.
