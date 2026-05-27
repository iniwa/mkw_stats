#!/usr/bin/env python3
"""
Download route images from japan-mk fan site (img.mkb.jp).

Provides TWO images per route:
  - Path map (transit road):  https://img.mkb.jp/blog/mkworld/route/<NN>-<MM>.png
                              with _2.png variant for routes in SPECIAL_2 list
  - Goal map (final 1-lap):   https://img.mkb.jp/blog/mkworld/course/map_<MM>[a/b/c].png
                              variant selected by route's goal_simple

Saves as:
  frontend/public/assets/routes/<route_id>.png       (path)
  frontend/public/assets/routes/<route_id>_goal.png  (goal)

3-lap routes (from == to): only goal image (course's own 1-lap map, default variant).

Usage:
    python scripts/download_route_images_v2.py --dry-run
    python scripts/download_route_images_v2.py
    python scripts/download_route_images_v2.py --force
"""
import argparse
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT  = Path(__file__).parent.parent
OUTPUT_DIR = REPO_ROOT / "frontend" / "public" / "assets" / "routes"
BASE       = "https://img.mkb.jp/blog/mkworld"
UA         = "Mozilla/5.0 mkw-stats-route-image-downloader/2.0"
SLEEP_S    = 0.5

sys.path.insert(0, str(REPO_ROOT / "backend"))
from app.seed.initial_data import ROUTES, COURSES  # noqa: E402

# Special routes that use _2.png variant on path map (from fan site JS)
SPECIAL_2 = {"04-13", "05-13", "03-13", "29-13", "02-13", "13-02", "13-04", "13-29"}


def goal_variant(course_pos: int, goal_simple: str) -> str:
    """Return URL suffix for course map variant: '', 'a', 'b', or 'c'.
    Mirrors the fan site JS variant selector.
    """
    g = goal_simple or ""
    if "セクション抜粋(1)" in g:
        return "a"
    if course_pos == 2:
        if "セクション抜粋(2)" in g:
            return "a"
        if g == "オリジナル":
            return "b"
        if g == "オリジナル2":
            return "c"
    if "セクション抜粋(2,3)" in g:
        return "a"
    if "セクション抜粋(2)" in g:
        return "b"
    if "セクション抜粋(3)" in g:
        return "c"
    if g == "オリジナル":
        return "a"
    if g == "オリジナル2":
        return "b"
    return ""


def fetch_image(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            if r.status != 200:
                return None
            ct = r.headers.get("Content-Type", "")
            if "image" not in ct:
                return None
            data = r.read()
            return data if len(data) >= 500 else None
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print(f"  HTTP {e.code}: {url}")
        return None
    except Exception as e:
        print(f"  ERR {e}: {url}")
        return None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="Probe URLs without saving")
    ap.add_argument("--force",   action="store_true", help="Re-download even if files exist")
    args = ap.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # course_id -> position 1..30
    pos = {c["id"]: i + 1 for i, c in enumerate(COURSES)}

    path_ok = goal_ok = path_miss = goal_miss = skipped = 0

    for route in ROUTES:
        rid    = route["id"]
        from_c = route["from_course_id"]
        to_c   = route["to_course_id"]
        tags   = route.get("tags") or {}
        gs     = tags.get("goal_simple") or ""

        from_pos = pos[from_c]
        to_pos   = pos[to_c]

        path_dest = OUTPUT_DIR / f"{rid}.png"
        goal_dest = OUTPUT_DIR / f"{rid}_goal.png"

        # --- Goal image (all routes have one) ---
        variant = goal_variant(to_pos, gs)
        goal_url = f"{BASE}/course/map_{to_pos:02d}{variant}.png"
        # Fall back to default variant if specific variant missing
        goal_fallback = f"{BASE}/course/map_{to_pos:02d}.png" if variant else None

        if goal_dest.exists() and not args.force:
            skipped += 1
        else:
            data = fetch_image(goal_url)
            if not data and goal_fallback:
                data = fetch_image(goal_fallback)
            if data:
                if not args.dry_run:
                    goal_dest.write_bytes(data)
                print(f"  goal  {rid}_goal.png  ({len(data)//1024}KB)")
                goal_ok += 1
            else:
                print(f"  404   {rid}_goal  {goal_url}")
                goal_miss += 1
            time.sleep(SLEEP_S)

        # --- Path image (transit routes only) ---
        if from_c == to_c:
            continue

        key = f"{from_pos:02d}-{to_pos:02d}"
        suffix = "_2" if key in SPECIAL_2 else ""
        path_url = f"{BASE}/route/{key}{suffix}.png"

        if path_dest.exists() and not args.force:
            skipped += 1
        else:
            data = fetch_image(path_url)
            if data:
                if not args.dry_run:
                    path_dest.write_bytes(data)
                print(f"  path  {rid}.png  ({len(data)//1024}KB)")
                path_ok += 1
            else:
                print(f"  404   {rid}  {path_url}")
                path_miss += 1
            time.sleep(SLEEP_S)

    label = "[dry-run] " if args.dry_run else ""
    print(f"\n{label}path: {path_ok} ok, {path_miss} miss   "
          f"goal: {goal_ok} ok, {goal_miss} miss   skipped: {skipped}")


if __name__ == "__main__":
    main()
