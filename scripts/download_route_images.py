#!/usr/bin/env python3
"""
Download route images from approved source URLs stored in route seed data.

Approved source: https://japan-mk.blog.jp/mkworld.info-1/route.html
Images are stored under: frontend/public/assets/routes/<route_id>.png

Usage (run from repository root):
    python scripts/download_route_images.py [--dry-run]
"""
import argparse
import sys
import time
import urllib.request
from pathlib import Path

# Resolve paths relative to repository root
REPO_ROOT = Path(__file__).parent.parent
SEED_MODULE_PATH = REPO_ROOT / "backend" / "app" / "seed"
OUTPUT_DIR = REPO_ROOT / "frontend" / "public" / "assets" / "routes"

sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.seed.initial_data import ROUTES  # type: ignore[import]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Show what would be downloaded without saving")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    acquired = 0
    skipped_exists = 0
    missing_url = 0
    failed = 0

    for route in ROUTES:
        route_id: str = route["id"]
        tags = route.get("tags") or {}
        image_url: str | None = tags.get("image_url") if isinstance(tags, dict) else None

        dest = OUTPUT_DIR / f"{route_id}.png"

        if image_url is None:
            missing_url += 1
            continue

        if dest.exists():
            skipped_exists += 1
            print(f"[skip]    {route_id} (already exists)")
            continue

        if args.dry_run:
            print(f"[dry-run] {route_id}  <-  {image_url}")
            acquired += 1
            continue

        try:
            req = urllib.request.Request(
                image_url,
                headers={"User-Agent": "mkw-stats-asset-downloader/1.0"},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            dest.write_bytes(data)
            print(f"[ok]      {route_id}  ({len(data):,} bytes)")
            acquired += 1
            time.sleep(0.5)
        except Exception as exc:
            print(f"[fail]    {route_id}  {exc}", file=sys.stderr)
            failed += 1

    print()
    print(f"acquired: {acquired}  skipped(exists): {skipped_exists}  no-url: {missing_url}  failed: {failed}")


if __name__ == "__main__":
    main()
