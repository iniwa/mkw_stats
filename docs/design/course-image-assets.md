# Course Image Assets

## Path Convention

```text
frontend/public/assets/courses/<course_id>.png
```

Runtime URL: `/assets/courses/<course_id>.png`

## Local-Only Rule

Assets must be stored locally under `frontend/public/assets/courses/`.
Do not hotlink external image URLs at runtime.

## Source Note

- Approved references include user-provided fan sites and MarioWiki pages, but assets must always be saved locally before use.
- Acquisition must be manual or via an explicit user-approved script; no automated scraping.
- See `docs/decisions/2026-05-25-map-image-asset-policy.md` for the image asset policy.

## Display Component

`frontend/src/TargetImage.tsx` exports `TargetImage`:

- `kind="course"` → `/assets/courses/<course_id>.png`
- `kind="route"` → `/assets/routes/<route_id>.png`
- Missing file: `onError` fires → component returns `null` (no broken image shown)
- Target id change: failure state resets via `useEffect`

Used in:
- `PlayingView` confirmation step: shows course image when a course target is selected
- `AnnotationEditor` surface: tries course image, falls back to world map, then fallback panel

## Annotation Surface Fallback Chain

When `selectedTargetType === 'course'` in `AnnotationSurface`:

1. Try `/assets/courses/<course_id>.png`
2. On error → try `/assets/maps/world.png`
3. On error → show `ann__surface-wrap--fallback` panel (clean surface, no broken image)

Route targets continue to use `/assets/routes/<route_id>.png` directly with no fallback chain.

## Course Image Checklist

| course_id | Expected path | Status |
|-----------|--------------|--------|
| mario_bros_circuit | `frontend/public/assets/courses/mario_bros_circuit.png` | present |
| crown_city | `frontend/public/assets/courses/crown_city.png` | present |
| whistlestop_summit | `frontend/public/assets/courses/whistlestop_summit.png` | present |
| dk_spaceport | `frontend/public/assets/courses/dk_spaceport.png` | present |
| desert_hills | `frontend/public/assets/courses/desert_hills.png` | present |
| shy_guy_bazaar | `frontend/public/assets/courses/shy_guy_bazaar.png` | present |
| wario_stadium | `frontend/public/assets/courses/wario_stadium.png` | present |
| airship_fortress | `frontend/public/assets/courses/airship_fortress.png` | present |
| dk_pass | `frontend/public/assets/courses/dk_pass.png` | present |
| starview_peak | `frontend/public/assets/courses/starview_peak.png` | present |
| sky_high_sundae | `frontend/public/assets/courses/sky_high_sundae.png` | present |
| wario_shipyard | `frontend/public/assets/courses/wario_shipyard.png` | present |
| koopa_troopa_beach | `frontend/public/assets/courses/koopa_troopa_beach.png` | present |
| faraway_oasis | `frontend/public/assets/courses/faraway_oasis.png` | present |
| peach_beach | `frontend/public/assets/courses/peach_beach.png` | present |
| salty_salty_speedway | `frontend/public/assets/courses/salty_salty_speedway.png` | present |
| dino_dino_jungle | `frontend/public/assets/courses/dino_dino_jungle.png` | present |
| great_block_ruins | `frontend/public/assets/courses/great_block_ruins.png` | present |
| cheep_cheep_falls | `frontend/public/assets/courses/cheep_cheep_falls.png` | present |
| dandelion_depths | `frontend/public/assets/courses/dandelion_depths.png` | present |
| boo_cinema | `frontend/public/assets/courses/boo_cinema.png` | present |
| dry_bones_burnout | `frontend/public/assets/courses/dry_bones_burnout.png` | present |
| moo_moo_meadows | `frontend/public/assets/courses/moo_moo_meadows.png` | present |
| choco_mountain | `frontend/public/assets/courses/choco_mountain.png` | present |
| toads_factory | `frontend/public/assets/courses/toads_factory.png` | present |
| bowsers_castle | `frontend/public/assets/courses/bowsers_castle.png` | present |
| acorn_heights | `frontend/public/assets/courses/acorn_heights.png` | present |
| mario_circuit | `frontend/public/assets/courses/mario_circuit.png` | present |
| peach_stadium | `frontend/public/assets/courses/peach_stadium.png` | present |
| rainbow_road | `frontend/public/assets/courses/rainbow_road.png` | present |

**Present: 30 / 30**

Note: 5 of the 30 files contain JPEG bytes saved under the `.png` extension. This is because MarioWiki's 1200px thumbnail URL ends in `.png` while serving JPEG bytes for `.jpg` source images. Browsers detect by Content-Type, so display works correctly. Files: `acorn_heights.png`, `boo_cinema.png`, `dry_bones_burnout.png`, `mario_circuit.png`, `peach_stadium.png`.

Acquisition: run `python scripts/download_course_images.py` from repo root. See `docs/design/image-asset-candidates.md` for source strategy.

## Related Docs

- Route image assets: `docs/design/route-image-assets.md`
- Course icon assets (WorldMapPicker): `docs/design/course-icon-assets.md`
- Image asset candidates and acquisition guide: `docs/design/image-asset-candidates.md`
