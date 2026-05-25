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

On 2026-05-25, the user explicitly approved using images referenced by:

- `https://japan-mk.blog.jp/mkworld.info-1/route.html`

That page contains course map image URLs and route image URLs/source keys used by the route master data.

## Decision

Do not download, scrape, or commit fan-site map/course images as part of automated implementation.

Exception:

- Images referenced by `https://japan-mk.blog.jp/mkworld.info-1/route.html` may be downloaded and stored locally for this private LAN tool.
- This exception is limited to the image assets needed for MKWorld course/route display in this project.
- Do not broaden this into general scraping or unrelated image collection.

For the first map-image slice:

- Use a local, manually provided asset directory only.
- Keep the app functional with no image assets present.
- Use one world map image as the base map when present.
- Overlay course icons and map point buttons on top of the world map using normalized `map_points.x` / `map_points.y`.
- Show the map in the Playing picker, not only in passive assist views.
- Show route images when a route target is selected/resolved in Playing.
- Preserve text/search selection as the primary fallback.
- Allow map point coordinate calibration through drag-and-drop in an explicit editing/calibration mode.
- Keep map point and annotation coordinates normalized `0.0` to `1.0`.

Recommended repo-side structure:

```text
frontend/public/assets/maps/
frontend/public/assets/course-icons/
frontend/public/assets/routes/
```

These directories may contain `.gitkeep` files and small project-owned placeholders, but should not contain copyrighted/fan-site images unless the user explicitly provides and approves them for this private project.

Recommended runtime URL convention:

```text
/assets/maps/<asset-id>.png
/assets/course-icons/<course-id>.png
/assets/routes/<route-id>.png
```

The first implementation should use deterministic optional lookup rather than adding upload/storage:

- world or overview map: `/assets/maps/world.png`
- course icon: `/assets/course-icons/<course_id>.png`
- route image: `/assets/routes/<route_id>.png`

If an image is missing, the UI should show the existing text/normalized preview instead of an error.

The initial visual model should be:

```text
world map image
  └─ positioned course/map-point icon buttons
       └─ selected from/to state in Playing picker
```

Do not use separate per-course map images as the primary model for the first slice.

For route images, use the existing route id as the local asset id. If images are acquired from the reference page, store them as:

```text
frontend/public/assets/routes/<route_id>.png
```

The source URL should be derived from route metadata where available:

- prefer `route.tags.image_url` when present
- otherwise use the reference page route/source key if a deterministic image URL exists
- if no route image exists, omit the file and let the UI fall back gracefully

## Reason

This allows the frontend and annotation overlay logic to be built without blocking on asset procurement or licensing.

Keeping assets under `frontend/public/assets/...` is simple for Vite/nginx and does not require backend file APIs. Optional lookup lets the Pi deployment work before images are added.

Avoiding broad automated scraping keeps the implementation clean and avoids storing unclear third-party material in Git. The user-approved reference page exception is intentionally narrow.

A single world-map coordinate system is also simpler than per-course images: `map_points.x/y`, map annotations, and visual picking can all use the same normalized coordinate convention.

## Constraints

- Do not add image upload APIs in the first slice.
- Do not add external CDN dependencies.
- Do not scrape images from unrelated reference or fan sites.
- Do not hotlink route/course images at runtime. If an approved image is used, download it into `frontend/public/assets/...` and serve it locally.
- Do not make map images required to record a race.
- Do not replace searchable text selection; keep it as fallback.
- Do not change `map_points.x/y` semantics; they remain normalized coordinates.
- Dragging map points must be opt-in editing/calibration behavior, not accidental during normal race recording.
- Normal Playing use should select points by clicking/tapping; it should not move coordinates.
- If real images are added later, coordinate calibration must be verified separately on desktop and 375px viewport.

## Follow-Up Work

The next map-image handoff may:

- add optional asset directories and `.gitkeep`
- add a reusable world-map component
- show `/assets/maps/world.png` when present
- overlay course icons/map-point controls using normalized coordinates
- show `/assets/routes/<route_id>.png` when a route is selected in Playing
- optionally add a small script or documented command to acquire approved route images from the reference page
- show the visual map picker in Playing while preserving search/list fallback
- add a small backend API to update `map_points.x/y`
- add an explicit coordinate calibration mode with drag-and-drop point placement
- overlay existing map annotations using normalized coordinates where useful

Future work may decide whether to:

- add an asset manifest
- store per-course image paths in the database
- support drag/drop annotation editing beyond map point calibration

## Do Not Change Casually

Do not start committing third-party image assets or adding scraping/downloading code without an explicit user decision.
