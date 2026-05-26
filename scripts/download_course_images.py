#!/usr/bin/env python3
"""
Download course images from MarioWiki individual course pages.

Approved source: https://www.mariowiki.com/Mario_Kart_World
For each course, fetches its individual MarioWiki page and downloads
the main infobox image. Strictly filters to MKWorld-tagged images
(MKWorld_*, MKWORLD_*, MKWD_*, MKW_*) to avoid older Mario Kart titles.

Images are stored under: frontend/public/assets/courses/<course_id>.png

Usage (run from repository root):
    python scripts/download_course_images.py --dry-run     # show URLs without downloading
    python scripts/download_course_images.py               # download missing images
    python scripts/download_course_images.py --force       # overwrite existing
    python scripts/download_course_images.py --help
"""
import argparse
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
OUTPUT_DIR = REPO_ROOT / "frontend" / "public" / "assets" / "courses"
USER_AGENT = "mkw-stats-asset-candidate-collector/1.0"
SLEEP_BETWEEN_REQUESTS = 1.0
MARIOWIKI_BASE = "https://www.mariowiki.com/"

sys.path.insert(0, str(REPO_ROOT / "backend"))
from app.seed.initial_data import COURSES  # type: ignore[import]

# Ensure UTF-8 stdout on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# MarioWiki page slug for each course.
# Values are the path under https://www.mariowiki.com/
# Multiple candidates may be tried; the first one that returns 200 and
# contains "Mario Kart World" content is used.
COURSE_PAGE_SLUGS: dict[str, list[str]] = {
    "mario_bros_circuit":   ["Mario_Bros._Circuit"],
    "crown_city":           ["Crown_City"],
    "whistlestop_summit":   ["Whistlestop_Summit"],
    "dk_spaceport":         ["DK_Spaceport"],
    "desert_hills":         ["Desert_Hills_(Mario_Kart_World)", "Desert_Hills"],
    "shy_guy_bazaar":       ["Shy_Guy_Bazaar_(Mario_Kart_World)", "Shy_Guy_Bazaar"],
    "wario_stadium":        ["Wario_Stadium_(Mario_Kart_World)", "Wario_Stadium_(Mario_Kart_64)", "Wario_Stadium"],
    "airship_fortress":     ["Airship_Fortress_(Mario_Kart_World)", "Airship_Fortress"],
    "dk_pass":              ["DK_Pass_(Mario_Kart_World)", "DK_Pass"],
    "starview_peak":        ["Starview_Peak"],
    "sky_high_sundae":      ["Sky-High_Sundae_(Mario_Kart_World)", "Sky-High_Sundae"],
    "wario_shipyard":       ["Wario_Shipyard_(Mario_Kart_World)", "Wario_Shipyard"],
    "koopa_troopa_beach":   ["Koopa_Troopa_Beach_(Mario_Kart_World)", "Koopa_Troopa_Beach"],
    "faraway_oasis":        ["Faraway_Oasis"],
    "peach_beach":          ["Peach_Beach_(Mario_Kart_World)", "Peach_Beach"],
    "salty_salty_speedway": ["Salty_Salty_Speedway"],
    "dino_dino_jungle":     ["Dino_Dino_Jungle_(Mario_Kart_World)", "Dino_Dino_Jungle"],
    "great_block_ruins":    ["Great_%3F_Block_Ruins", "Great_?_Block_Ruins"],
    "cheep_cheep_falls":    ["Cheep_Cheep_Falls_(race_course)", "Cheep_Cheep_Falls"],
    "dandelion_depths":     ["Dandelion_Depths"],
    "boo_cinema":           ["Boo_Cinema"],
    "dry_bones_burnout":    ["Dry_Bones_Burnout"],
    "moo_moo_meadows":      ["Moo_Moo_Meadows_(Mario_Kart_World)", "Moo_Moo_Meadows"],
    "choco_mountain":       ["Choco_Mountain_(Mario_Kart_World)", "Choco_Mountain"],
    "toads_factory":        ["Toad%27s_Factory_(Mario_Kart_World)", "Toad%27s_Factory"],
    "bowsers_castle":       ["Bowser%27s_Castle_(Mario_Kart_World)", "Bowser%27s_Castle"],
    "acorn_heights":        ["Acorn_Heights"],
    "mario_circuit":        ["Mario_Circuit_(Mario_Kart_World)", "Mario_Circuit"],
    "peach_stadium":        ["Peach_Stadium"],
    "rainbow_road":         ["Rainbow_Road_(Mario_Kart_World)"],
}

# Accept-only patterns: filename must contain at least one of these
# (case-insensitive) to be considered an MKWorld image.
# Note: MKW_ is used as Mario Kart World abbreviation on MKW-specific pages,
# but MKWii is Mario Kart Wii. The strict "MKW_" + uppercase distinguishes them.
MKWORLD_ACCEPT_PATTERNS = [
    re.compile(r"^MKWorld[_A-Z]", re.IGNORECASE),
    re.compile(r"^MKWORLD[_A-Z]", re.IGNORECASE),
    re.compile(r"^MKW_[A-Z]"),  # case-sensitive: MKW_ not MKWii_
]

# Reject patterns: filename matching any of these is skipped even if it
# also matches an accept pattern. Covers icons, vehicles, old-game images.
EXCLUDE_FILENAME_PATTERNS = [
    re.compile(r"Soundx", re.IGNORECASE),
    re.compile(r"apple-touch-icon", re.IGNORECASE),
    re.compile(r"MKWorld_Kart_", re.IGNORECASE),
    re.compile(r"MKWorld_ATV_", re.IGNORECASE),
    re.compile(r"MKWorld_Bike_", re.IGNORECASE),
    re.compile(r"MKWorld_Icon_", re.IGNORECASE),
    re.compile(r"MK_World_map_", re.IGNORECASE),
    re.compile(r"_\(Battle\)", re.IGNORECASE),
    re.compile(r"_-_", re.IGNORECASE),  # route images (X_-_Y.png)
    re.compile(r"_Icon\.(png|jpg|jpeg)$", re.IGNORECASE),
    re.compile(r"_icon\.(png|jpg|jpeg)$", re.IGNORECASE),
    re.compile(r"MKW[Dd]_.*_Icon", re.IGNORECASE),
    re.compile(r"Trading_Card", re.IGNORECASE),
    # Old Mario Kart game prefixes — these indicate non-MKW assets
    re.compile(r"_GCN_", re.IGNORECASE),
    re.compile(r"_N64_", re.IGNORECASE),
    re.compile(r"_DS_", re.IGNORECASE),
    re.compile(r"_3DS_", re.IGNORECASE),
    re.compile(r"_Wii_", re.IGNORECASE),
    re.compile(r"_MKWii", re.IGNORECASE),
    re.compile(r"_MK7", re.IGNORECASE),
    re.compile(r"_MK8", re.IGNORECASE),
    re.compile(r"_MKT_", re.IGNORECASE),
    re.compile(r"_MKDD_", re.IGNORECASE),
    re.compile(r"MKDD_", re.IGNORECASE),
    re.compile(r"MKT_", re.IGNORECASE),
    re.compile(r"MK7_", re.IGNORECASE),
    re.compile(r"MK8_", re.IGNORECASE),
    re.compile(r"MK8D_", re.IGNORECASE),
    re.compile(r"MKWii_", re.IGNORECASE),
    re.compile(r"_Layout\.", re.IGNORECASE),
    re.compile(r"_Map\.", re.IGNORECASE),
    re.compile(r"_Machines\.", re.IGNORECASE),
    re.compile(r"BattleMinimap", re.IGNORECASE),
    re.compile(r"_Minimap\.", re.IGNORECASE),
    re.compile(r"_Conveyors", re.IGNORECASE),
    re.compile(r"_Cone\.", re.IGNORECASE),
    re.compile(r"_Logo\.", re.IGNORECASE),
    re.compile(r"_Sign\.", re.IGNORECASE),
]

THUMB_PATTERN = re.compile(
    r'https://mario\.wiki\.gallery/images/thumb/[^/]+/[^/]+/([^/"\s]+?)/(\d+)px-[^"\s]+\.(?:png|jpg|jpeg)',
    re.IGNORECASE,
)


def _candidate_urls(course_id: str) -> list[str]:
    slugs = COURSE_PAGE_SLUGS.get(course_id, [])
    return [MARIOWIKI_BASE + s for s in slugs]


def _fetch_html(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        print(f"[http error] {url}: {exc}", file=sys.stderr)
        return None
    except Exception as exc:
        print(f"[network error] {url}: {exc}", file=sys.stderr)
        return None


def _is_acceptable_mkworld_image(filename: str) -> bool:
    if any(p.search(filename) for p in EXCLUDE_FILENAME_PATTERNS):
        return False
    return any(p.search(filename) for p in MKWORLD_ACCEPT_PATTERNS)


def _find_mkworld_image_url(html: str) -> str | None:
    """Find the largest-size MKWorld-tagged thumbnail in the HTML."""
    # Collect all thumbnails, group by filename, pick largest size per file
    best_by_file: dict[str, tuple[int, str]] = {}
    for m in THUMB_PATTERN.finditer(html):
        filename, size_str = m.group(1), int(m.group(2))
        if not _is_acceptable_mkworld_image(filename):
            continue
        prev = best_by_file.get(filename)
        if prev is None or size_str > prev[0]:
            best_by_file[filename] = (size_str, m.group(0))

    if not best_by_file:
        return None

    # Pick the file that appears first in the HTML (likely the infobox image)
    earliest_pos = None
    earliest_filename = None
    for fname in best_by_file:
        pos = html.find(fname)
        if pos < 0:
            continue
        if earliest_pos is None or pos < earliest_pos:
            earliest_pos = pos
            earliest_filename = fname

    if earliest_filename is None:
        # Shouldn't happen since we just found it
        any_filename = next(iter(best_by_file))
        return best_by_file[any_filename][1]
    return best_by_file[earliest_filename][1]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="Show what would be downloaded without saving")
    ap.add_argument("--force", action="store_true", help="Re-download even if file exists")
    args = ap.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    acquired = 0
    skipped_exists = 0
    no_page = 0
    no_image = 0
    failed = 0

    for course in COURSES:
        cid = course["id"]
        dest = OUTPUT_DIR / f"{cid}.png"

        if dest.exists() and not args.force:
            skipped_exists += 1
            print(f"[skip]    {cid} (already exists)")
            continue

        # Find a valid MKW page
        html: str | None = None
        page_url: str | None = None
        for candidate_url in _candidate_urls(cid):
            html = _fetch_html(candidate_url)
            if html is None:
                continue
            if "Mario Kart World" not in html:
                html = None
                continue
            page_url = candidate_url
            break

        if html is None or page_url is None:
            print(f"[no-page] {cid}", file=sys.stderr)
            no_page += 1
            time.sleep(SLEEP_BETWEEN_REQUESTS)
            continue

        image_url = _find_mkworld_image_url(html)
        if image_url is None:
            print(f"[no-img]  {cid}  page={page_url}", file=sys.stderr)
            no_image += 1
            time.sleep(SLEEP_BETWEEN_REQUESTS)
            continue

        if args.dry_run:
            print(f"[dry-run] {cid}  page={page_url}  img={image_url}")
            acquired += 1
            time.sleep(SLEEP_BETWEEN_REQUESTS)
            continue

        try:
            req = urllib.request.Request(image_url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            dest.write_bytes(data)
            print(f"[ok]      {cid}  ({len(data):,} bytes)")
            acquired += 1
            time.sleep(SLEEP_BETWEEN_REQUESTS)
        except Exception as exc:
            print(f"[fail]    {cid}  {exc}", file=sys.stderr)
            failed += 1

    print()
    print(f"acquired: {acquired}  skipped(exists): {skipped_exists}  no-page: {no_page}  no-image: {no_image}  failed: {failed}")


if __name__ == "__main__":
    main()
