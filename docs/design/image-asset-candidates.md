# Image Asset Candidates

Inventory of image asset status and candidate acquisition sources for course images, route images, and course icons.

Last updated: 2026-05-31

## Current Asset Counts

| Asset type | Total | Local present | Local missing |
|---|---|---|---|
| Route path images (`<route_id>.png`) | 203 routes | 202 | 1 |
| Route goal images (`_goal.png` / `_3lap_goal.png`) | — | 232 | — |
| Course images | 30 courses | 30 | 0 |
| Course icons | 30 courses | 0 | 30 |
| Annotation icons (active) | 4 | 4 | 0 |

- Route path images were added in bulk (commit `fd8be01`). 1 path image is still missing.
- Route goal images (232 total) include both `_goal.png` and `_3lap_goal.png` variants.

## Asset Paths

| Asset type | Local path | Runtime URL |
|---|---|---|
| Route path images | `frontend/public/assets/routes/<route_id>.png` | `/assets/routes/<route_id>.png` |
| Route goal images | `frontend/public/assets/routes/<route_id>_goal.png` | `/assets/routes/<route_id>_goal.png` |
| Course images | `frontend/public/assets/courses/<course_id>.png` | `/assets/courses/<course_id>.png` |
| Course icons | `frontend/public/assets/course-icons/<course_id>.png` | `/assets/course-icons/<course_id>.png` |
| Annotation icons | `frontend/public/assets/annotation-icons/<icon_type>.png` | `/assets/annotation-icons/<icon_type>.png` |

Notes:
- `frontend/public/assets/course-icons/` has a `.gitkeep` but no PNG images yet.
- Route goal images use suffix `_goal.png`; 3-lap route variants use `_3lap_goal.png`.
- Active annotation icons: `bullet.png`, `golden_mushroom.png`, `hane.png`, `mushroom.png`. An `_etc/` subdirectory holds 12 candidate icons not yet activated.

## Route Images

### Status

202 of 203 route path images are present locally (1 missing).
232 route goal images are present (`_goal.png` and `_3lap_goal.png` variants).

Images were added in a bulk acquisition pass (commit `fd8be01`). The original seed `image_url` mechanism (11 routes with known URLs) was the initial tracking method; most images were subsequently added directly without seed URL entries.

Missing path image: 1 route ID has no local path image. It can be found by comparing route IDs in `backend/app/seed/initial_data.py` against files in `frontend/public/assets/routes/` (excluding `_goal.png`).

Routes without local images fall back to text-only display in `TargetImage`.

### Source Strategy

- **Primary source:** `https://japan-mk.blog.jp/mkworld.info-1/route.html` (user-approved)
- Image host: `https://mario.wiki.gallery/images/...`
- Filename pattern: `<From_Course_Name>_-_<To_Course_Name>.png`
- The reference page likely contains images for many of the 192 routes that currently lack URLs.
- To discover new candidates: run `scripts/collect_image_asset_candidates.py --source route-page`
- To download known candidates: run `scripts/download_route_images.py` (downloads only routes with `image_url` in seed)

### Acquisition Gap

To acquire the 1 remaining missing route path image:

1. Identify the missing route ID (compare seed route IDs vs local files)
2. Run `scripts/collect_image_asset_candidates.py --source route-page --out-file report.json`
3. Review `report.json` → `route_page_new_candidates`
4. Add the discovered `image_url` to the route entry in `backend/app/seed/initial_data.py`
5. Re-run `scripts/download_route_images.py`

## Course Images

### Status

30 of 30 course images are present locally (acquired 2026-05-26 via `scripts/download_course_images.py` from MarioWiki). Display plumbing is in place:

- Component: `frontend/src/TargetImage.tsx` with `kind="course"`
- Used in: `PlayingView` confirmation step, `AnnotationEditor` surface
- Fallback chain in `AnnotationEditor`: course image → world map (`/assets/maps/world.png`) → fallback panel
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

## Annotation Icons

### Status

4 of 4 active annotation icon files are present locally.

| icon_type | File | Status |
|---|---|---|
| `mushroom` | `mushroom.png` | present |
| `bullet` | `bullet.png` | present |
| `golden_mushroom` | `golden_mushroom.png` | present |
| `hane` | `hane.png` | present |

Local path: `frontend/public/assets/annotation-icons/<icon_type>.png`
Runtime URL: `/assets/annotation-icons/<icon_type>.png`

An `_etc/` subdirectory holds 12 candidate icons not yet activated in the frontend (`star.png`, `thunder.png`, `IB.png`, `DoubleIB.png`, `kino2.png`, `kino3.png`, `Bkino.png`, `food.png`, plus duplicates of the 4 active files). These are available for future icon-type expansion.

### Source Note

Icon files are manually sourced game asset images. No automated acquisition script exists. Any expansion of the active icon list must update `ANNOTATION_ICONS` in `frontend/src/api.ts`.

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
