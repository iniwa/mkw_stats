#!/usr/bin/env python3
"""
Download route layout (minimap) images from mario.wiki.gallery.

Two modes:
  1. Routes with image_url in seed data   -> use that URL directly
  2. Transit routes without image_url     -> construct URL from wiki name mapping
       https://mario.wiki.gallery/images/<md5[0]>/<md5[:2]>/<CourseA>_-_<CourseB>.png
  3. Same-course 3-lap routes             -> skipped (no A-B layout image on wiki)

Usage (run from repository root):
    python scripts/download_route_images.py --dry-run
    python scripts/download_route_images.py
    python scripts/download_route_images.py --force
"""
import argparse
import hashlib
import sys
import time
import urllib.error
import urllib.request
import urllib.parse
from pathlib import Path

REPO_ROOT  = Path(__file__).parent.parent
OUTPUT_DIR = REPO_ROOT / "frontend" / "public" / "assets" / "routes"
WIKI_BASE  = "https://mario.wiki.gallery/images"
UA         = "mkw-stats-route-image-downloader/1.0"
SLEEP_S    = 1.0

sys.path.insert(0, str(REPO_ROOT / "backend"))
from app.seed.initial_data import ROUTES  # noqa: E402

# course_id -> fragment used in MarioWiki route image filenames
WIKI_NAMES: dict[str, str] = {
    "mario_bros_circuit":   "Mario_Bros._Circuit",
    "crown_city":           "Crown_City",
    "whistlestop_summit":   "Whistlestop_Summit",
    "dk_spaceport":         "DK_Spaceport",
    "desert_hills":         "Desert_Hills",
    "shy_guy_bazaar":       "Shy_Guy_Bazaar",
    "wario_stadium":        "Wario_Stadium",
    "airship_fortress":     "Airship_Fortress",
    "dk_pass":              "DK_Pass",
    "starview_peak":        "Starview_Peak",
    "sky_high_sundae":      "Sky-High_Sundae",
    "wario_shipyard":       "Wario_Shipyard",
    "koopa_troopa_beach":   "Koopa_Troopa_Beach",
    "faraway_oasis":        "Faraway_Oasis",
    "peach_beach":          "Peach_Beach",
    "salty_salty_speedway": "Salty_Salty_Speedway",
    "dino_dino_jungle":     "Dino_Dino_Jungle",
    "great_block_ruins":    "Great_?_Block_Ruins",
    "cheep_cheep_falls":    "Cheep_Cheep_Falls",
    "dandelion_depths":     "Dandelion_Depths",
    "boo_cinema":           "Boo_Cinema",
    "dry_bones_burnout":    "Dry_Bones_Burnout",
    "moo_moo_meadows":      "Moo_Moo_Meadows",
    "choco_mountain":       "Choco_Mountain",
    "toads_factory":        "Toad's_Factory",
    "bowsers_castle":       "Bowser's_Castle",
    "acorn_heights":        "Acorn_Heights",
    "mario_circuit":        "Mario_Circuit",
    "peach_stadium":        "Peach_Stadium",
    "rainbow_road":         "Rainbow_Road",
}


def wiki_image_url(filename: str) -> str:
    h = hashlib.md5(filename.encode()).hexdigest()
    encoded = urllib.parse.quote(filename, safe="")
    return f"{WIKI_BASE}/{h[0]}/{h[:2]}/{encoded}"


def fetch_bytes(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            if r.status != 200:
                return None
            ct = r.headers.get("Content-Type", "")
            if "image" not in ct:
                return None  # wiki returns HTML 200 for missing files
            data = r.read()
            return data if len(data) >= 500 else None  # reject degenerate images
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print(f"  HTTP {e.code}: {url}")
        return None
    except Exception as e:
        print(f"  ERR {e}: {url}")
        return None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="Show URLs, probe 404 vs found, no save")
    ap.add_argument("--force",   action="store_true", help="Re-download even if file already exists")
    args = ap.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    existing = {p.stem for p in OUTPUT_DIR.glob("*.png")}

    saved = skipped = miss = warn = 0

    for route in ROUTES:
        rid    = route["id"]
        from_c = route["from_course_id"]
        to_c   = route["to_course_id"]
        tags   = route.get("tags") or {}

        # 3-lap routes have no A-B layout image on MarioWiki
        if from_c == to_c:
            skipped += 1
            continue

        if rid in existing and not args.force:
            skipped += 1
            continue

        # Prefer explicit image_url from seed; fall back to wiki hash pattern
        seed_url: str | None = tags.get("image_url") if isinstance(tags, dict) else None
        alt_url:  str | None = None
        if seed_url:
            url = seed_url
        else:
            from_w = WIKI_NAMES.get(from_c)
            to_w   = WIKI_NAMES.get(to_c)
            if not from_w or not to_w:
                print(f"  WARN: no wiki name mapping for {rid}")
                warn += 1
                continue
            # Primary URL
            url = wiki_image_url(f"{from_w}_-_{to_w}.png")
            # Alternate: try dropping period from "Bros." if primary fails
            alt_url: str | None = None
            if "Bros." in from_w or "Bros." in to_w:
                alt_from = from_w.replace("Bros.", "Bros")
                alt_to   = to_w.replace("Bros.", "Bros")
                alt_url  = wiki_image_url(f"{alt_from}_-_{alt_to}.png")

        if args.dry_run:
            data = fetch_bytes(url)
            if not data and alt_url:
                data = fetch_bytes(alt_url)
            status = f"OK {len(data)//1024}KB" if data else "404"
            print(f"  [{status}] {rid}")
            if data:
                saved += 1
            else:
                miss += 1
            time.sleep(0.3)
        else:
            data = fetch_bytes(url)
            if not data and alt_url:
                data = fetch_bytes(alt_url)
                if data:
                    time.sleep(SLEEP_S)
            if data:
                (OUTPUT_DIR / f"{rid}.png").write_bytes(data)
                print(f"  saved {rid}.png ({len(data)//1024}KB)")
                saved += 1
            else:
                miss += 1
                print(f"  404  {rid}")
            time.sleep(SLEEP_S)

    label = "[dry-run] " if args.dry_run else ""
    print(f"\n{label}saved: {saved}  404/miss: {miss}  skipped: {skipped}  warn: {warn}")


if __name__ == "__main__":
    main()
