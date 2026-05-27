"""
Copy course images to route image paths.

For each route without an existing image file, copies
  frontend/public/assets/courses/<from_course_id>.png
→ frontend/public/assets/routes/<route_id>.png

Existing route images (the 11 fetched from mario.wiki.gallery) are preserved.
3-lap routes (from == to) get the exact course image.
Transit routes get the from_course image as a placeholder.

Usage:
    python scripts/copy_course_images_to_routes.py
    python scripts/copy_course_images_to_routes.py --dry-run
"""
import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.seed.initial_data import ROUTES  # noqa: E402

COURSES_DIR = ROOT / "frontend" / "public" / "assets" / "courses"
ROUTES_DIR  = ROOT / "frontend" / "public" / "assets" / "routes"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="Print what would be copied without writing")
    args = ap.parse_args()

    existing = {p.stem for p in ROUTES_DIR.glob("*.png")}

    copied = skipped_existing = skipped_no_src = 0
    for route in ROUTES:
        rid = route["id"]
        dest = ROUTES_DIR / f"{rid}.png"
        if rid in existing:
            skipped_existing += 1
            continue
        src = COURSES_DIR / f"{route['from_course_id']}.png"
        if not src.exists():
            print(f"  WARN: source missing for {rid} (from_course_id={route['from_course_id']})")
            skipped_no_src += 1
            continue
        if args.dry_run:
            print(f"  [dry] {src.name} -> {dest.name}")
        else:
            shutil.copy2(src, dest)
        copied += 1

    label = "[dry-run] " if args.dry_run else ""
    print(f"{label}copied: {copied}  skipped(existing): {skipped_existing}  skipped(no-src): {skipped_no_src}")


if __name__ == "__main__":
    main()
