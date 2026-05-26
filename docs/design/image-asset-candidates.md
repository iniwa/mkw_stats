# Image Asset Candidates

Inventory of image asset status and candidate acquisition sources for course images, route images, and course icons.

Last updated: 2026-05-26

## Current Asset Counts

| Asset type | Total | Local present | Local missing |
|---|---|---|---|
| Route images | 203 routes | 11 | 192 |
| Course images | 30 courses | 30 | 0 |
| Course icons | 30 courses | 0 | 30 |

- Route images with known `image_url` in seed data: 11 of 203
- Route images without any known source URL: 192 of 203

## Asset Paths

| Asset type | Local path | Runtime URL |
|---|---|---|
| Route images | `frontend/public/assets/routes/<route_id>.png` | `/assets/routes/<route_id>.png` |
| Course images | `frontend/public/assets/courses/<course_id>.png` | `/assets/courses/<course_id>.png` |
| Course icons | `frontend/public/assets/course-icons/<course_id>.png` | `/assets/course-icons/<course_id>.png` |

Notes:
- `frontend/public/assets/courses/` has a `.gitkeep` but no PNG images yet.
- `frontend/public/assets/course-icons/` has a `.gitkeep` but no PNG images yet.

## Route Images

### Status

11 routes have `image_url` values in seed data (`backend/app/seed/initial_data.py`).
All 11 are present as local files. These were acquired with `scripts/download_route_images.py`.

| route_id | Status |
|---|---|
| `rt_mario_bros_circuit_to_crown_city` | present |
| `rt_mario_bros_circuit_to_whistlestop_summit` | present |
| `rt_crown_city_to_mario_bros_circuit` | present |
| `rt_crown_city_to_whistlestop_summit` | present |
| `rt_crown_city_to_dk_spaceport` | present |
| `rt_whistlestop_summit_to_mario_bros_circuit` | present |
| `rt_whistlestop_summit_to_crown_city` | present |
| `rt_whistlestop_summit_to_dk_spaceport` | present |
| `rt_dk_spaceport_to_mario_bros_circuit` | present |
| `rt_dk_spaceport_to_crown_city` | present |
| `rt_dk_spaceport_to_whistlestop_summit` | present |

192 routes have no `image_url` in seed data. These fall back to text-only display.

### Source Strategy

- **Primary source:** `https://japan-mk.blog.jp/mkworld.info-1/route.html` (user-approved)
- Image host: `https://mario.wiki.gallery/images/...`
- Filename pattern: `<From_Course_Name>_-_<To_Course_Name>.png`
- The reference page likely contains images for many of the 192 routes that currently lack URLs.
- To discover new candidates: run `scripts/collect_image_asset_candidates.py --source route-page`
- To download known candidates: run `scripts/download_route_images.py` (downloads only routes with `image_url` in seed)

### Acquisition Gap

To get route images for the remaining 192 routes:

1. Run `scripts/collect_image_asset_candidates.py --source route-page --out-file report.json`
2. Review `report.json` → `route_page_new_candidates` for newly found URLs
3. Add discovered `image_url` values to the relevant routes in `backend/app/seed/initial_data.py`
4. Re-run `scripts/download_route_images.py`

## Course Images

### Status

30 of 30 course images are present locally (acquired 2026-05-26 via `scripts/download_course_images.py` from MarioWiki). Display plumbing is in place:

- Component: `frontend/src/TargetImage.tsx` with `kind="course"`
- Used in: `PlayingView` confirmation step, `AnnotationEditor` surface
- Fallback chain in `AnnotationEditor`: course image → world map → fallback panel
- Missing image: `TargetImage` returns `null` (no broken image shown)

See `docs/design/course-image-assets.md` for full checklist.

### Source Strategy

- **Primary source:** `https://www.mariowiki.com/Mario_Kart_World#Courses` (user-approved)
- Individual course pages follow the pattern: `https://www.mariowiki.com/<Course_Name>_(Mario_Kart_World)`
- Images from `mario.wiki.gallery` domain are acceptable (same host as route images)
- To discover candidates: run `scripts/collect_image_asset_candidates.py --source mariowiki`

### Candidate Discovery

The MarioWiki mode of `collect_image_asset_candidates.py` fetches the main Mario Kart World page
and extracts `mario.wiki.gallery` image URLs, attempting to match each to a course ID by name.
Results go into `mariowiki_course_candidates` in the JSON output.

Course images are screenshot/track overview images (similar to the existing route images), not icons.

### Acquisition (Completed 2026-05-26)

Acquired via `scripts/download_course_images.py`. The script:
1. Maps each course to known MarioWiki page slug(s) — see `COURSE_PAGE_SLUGS` in the script.
2. Fetches each page, finds the largest MKWorld-tagged thumbnail (filters out vehicles/icons/older-game prefixes like MKWii/MK7/MK8/MKT/MKDD/GCN/DS).
3. Downloads to `frontend/public/assets/courses/<course_id>.png`.

Notes:
- Image sizes range from 280px (battle minimap) up to 1200px (full screenshots). Highest-res available was selected.
- 5 files contain JPEG bytes with `.png` extension (MarioWiki thumbnail server quirk). Browsers detect by Content-Type so this works at runtime.
- To re-download or update: `python scripts/download_course_images.py --force`.

For candidate inventory only (no downloads):
`python scripts/collect_image_asset_candidates.py --source mariowiki`

## Course Icons

### Status

0 of 30 course icons are present locally. `WorldMapPicker` falls back to a two-character text marker when the icon file is missing.

See `docs/design/course-icon-assets.md` for full checklist and usage notes.

### Source Strategy

- **Primary source:** `https://www.mariowiki.com/Mario_Kart_World#Courses` (user-approved)
- Course icons are small UI icons (course emblems from the game UI), distinct from course screenshots.
- MarioWiki infobox images or gallery images may contain usable icon-sized assets.
- No automated acquisition script planned yet — icons should be reviewed manually.

### Acquisition Steps

1. Browse `https://www.mariowiki.com/Mario_Kart_World#Courses`
2. Identify icon-sized course images for each course
3. Download and save to `frontend/public/assets/course-icons/<course_id>.png`
4. Update `docs/design/course-icon-assets.md` checklist

## Candidate Collection Script

```text
scripts/collect_image_asset_candidates.py
```

```text
Usage (run from repository root):
    python scripts/collect_image_asset_candidates.py                  # seed mode, no network
    python scripts/collect_image_asset_candidates.py --source route-page
    python scripts/collect_image_asset_candidates.py --source mariowiki
    python scripts/collect_image_asset_candidates.py --out-file report.json
```

| Mode | Network | Output |
|---|---|---|
| `seed` (default) | None | Status of known seed image_url entries + local file counts |
| `route-page` | Fetches fan-site page | New route image candidates not yet in seed |
| `mariowiki` | Fetches MarioWiki page | Course image candidates by name match |

- No downloads: the script is read-only/fetch-only.
- No new dependencies: stdlib only (`urllib`, `html.parser`, `json`, `re`, `pathlib`).
- Network failures produce a stderr warning and empty candidate list; seed status is still reported.

## Distinction: Candidates vs Downloaded vs Missing

| Term | Meaning |
|---|---|
| **known_url** | Route has `image_url` in seed data |
| **candidate** | URL found on approved source page but not yet in seed data |
| **local_present** | File exists in `frontend/public/assets/...` |
| **local_missing** | No local file; UI falls back gracefully |

## Policy Reference

See `docs/decisions/2026-05-25-map-image-asset-policy.md` for the full asset policy:
- All images must be stored locally before runtime use (no hotlinking).
- Only user-approved reference pages may be used as sources.
- Do not scrape or download images without explicit user approval per acquisition step.
