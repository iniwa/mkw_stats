#!/usr/bin/env python3
"""
Collect image asset candidates for course/route images and course icons.

Safe by default: runs without network in seed mode (default).
With --source route-page or --source mariowiki, fetches approved pages
to discover additional candidate image URLs.

Usage (run from repository root):
    python scripts/collect_image_asset_candidates.py
    python scripts/collect_image_asset_candidates.py --source route-page
    python scripts/collect_image_asset_candidates.py --source mariowiki
    python scripts/collect_image_asset_candidates.py --out-file report.json
    python scripts/collect_image_asset_candidates.py --help

Approved sources:
    route-page  https://japan-mk.blog.jp/mkworld.info-1/route.html
    mariowiki   https://www.mariowiki.com/Mario_Kart_World
"""
import argparse
import json
import re
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

# Ensure UTF-8 stdout on Windows (avoid cp932 encoding errors with Japanese text)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).parent.parent
ASSETS_COURSES = REPO_ROOT / "frontend" / "public" / "assets" / "courses"
ASSETS_ROUTES = REPO_ROOT / "frontend" / "public" / "assets" / "routes"
ASSETS_ICONS = REPO_ROOT / "frontend" / "public" / "assets" / "course-icons"

ROUTE_PAGE_URL = "https://japan-mk.blog.jp/mkworld.info-1/route.html"
MARIOWIKI_URL = "https://www.mariowiki.com/Mario_Kart_World"
USER_AGENT = "mkw-stats-asset-candidate-collector/1.0"

sys.path.insert(0, str(REPO_ROOT / "backend"))
from app.seed.initial_data import COURSES, ROUTES  # type: ignore[import]


# ---------------------------------------------------------------------------
# HTML helpers
# ---------------------------------------------------------------------------

class _ImgSrcExtractor(HTMLParser):
    """Extract all <img src="..."> values from HTML."""
    def __init__(self) -> None:
        super().__init__()
        self.srcs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "img":
            for name, val in attrs:
                if name == "src" and val:
                    self.srcs.append(val)


def _fetch_html(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception as exc:
        print(f"[network error] {url}: {exc}", file=sys.stderr)
        return None


def _extract_mario_wiki_gallery_urls(html: str) -> list[str]:
    p = _ImgSrcExtractor()
    p.feed(html)
    return [s for s in p.srcs if "mario.wiki.gallery" in s]


# ---------------------------------------------------------------------------
# Seed mode (no network)
# ---------------------------------------------------------------------------

def _collect_seed() -> dict:
    # Build local file sets
    local_routes = (
        {f.stem for f in ASSETS_ROUTES.glob("*.png")}
        if ASSETS_ROUTES.exists() else set()
    )
    local_courses = (
        {f.stem for f in ASSETS_COURSES.glob("*.png")}
        if ASSETS_COURSES.exists() else set()
    )
    local_icons = (
        {f.stem for f in ASSETS_ICONS.glob("*.png")}
        if ASSETS_ICONS.exists() else set()
    )

    route_status = []
    for r in ROUTES:
        rid = r["id"]
        tags = r.get("tags") or {}
        image_url = tags.get("image_url") if isinstance(tags, dict) else None
        route_status.append({
            "route_id": rid,
            "known_url": image_url,
            "local_present": rid in local_routes,
        })

    course_status = []
    for c in COURSES:
        cid = c["id"]
        course_status.append({
            "course_id": cid,
            "name_en": c["name_en"],
            "local_present": cid in local_courses,
        })

    icon_status = []
    for c in COURSES:
        cid = c["id"]
        icon_status.append({
            "course_id": cid,
            "name_en": c["name_en"],
            "local_present": cid in local_icons,
        })

    return {
        "route_status": route_status,
        "course_status": course_status,
        "icon_status": icon_status,
    }


# ---------------------------------------------------------------------------
# Route-page mode
# ---------------------------------------------------------------------------

def _name_en_to_wiki_slug(name_en: str) -> str:
    """'Mario Bros. Circuit' -> 'Mario_Bros._Circuit'"""
    return name_en.replace(" ", "_")


def _collect_route_page_candidates(seed: dict) -> list[dict]:
    html = _fetch_html(ROUTE_PAGE_URL)
    if html is None:
        return []

    gallery_urls = _extract_mario_wiki_gallery_urls(html)

    # Build reverse maps
    slug_to_course_id: dict[str, str] = {
        _name_en_to_wiki_slug(c["name_en"]): c["id"] for c in COURSES
    }
    pair_to_route_id: dict[tuple[str, str], str] = {
        (r["from_course_id"], r["to_course_id"]): r["id"] for r in ROUTES
    }

    known_urls = {
        row["known_url"]
        for row in seed["route_status"]
        if row["known_url"]
    }
    local_routes = {
        f.stem for f in ASSETS_ROUTES.glob("*.png")
    } if ASSETS_ROUTES.exists() else set()

    candidates: list[dict] = []
    seen_urls: set[str] = set()

    for url in gallery_urls:
        if url in seen_urls or url in known_urls:
            continue
        seen_urls.add(url)

        filename = url.split("/")[-1]
        # Expected pattern: "Course_A_-_Course_B.png"
        m = re.match(r"^(.+)_-_(.+)\.png$", filename)
        if not m:
            continue

        from_slug, to_slug = m.group(1), m.group(2)
        from_id = slug_to_course_id.get(from_slug)
        to_id = slug_to_course_id.get(to_slug)
        if not from_id or not to_id:
            continue

        route_id = pair_to_route_id.get((from_id, to_id))
        if not route_id:
            continue

        candidates.append({
            "route_id": route_id,
            "candidate_url": url,
            "local_present": route_id in local_routes,
        })

    return candidates


# ---------------------------------------------------------------------------
# MarioWiki mode
# ---------------------------------------------------------------------------

def _collect_mariowiki_candidates() -> list[dict]:
    html = _fetch_html(MARIOWIKI_URL)
    if html is None:
        return []

    gallery_urls = _extract_mario_wiki_gallery_urls(html)

    local_courses = (
        {f.stem for f in ASSETS_COURSES.glob("*.png")}
        if ASSETS_COURSES.exists() else set()
    )

    # Build a list of (slug, course_id) to match against filenames
    slug_pairs: list[tuple[str, str]] = []
    for c in COURSES:
        slug = _name_en_to_wiki_slug(c["name_en"])
        slug_pairs.append((slug, c["id"]))
        # Also add apostrophe-stripped variant
        stripped = slug.replace("%27", "").replace("'", "")
        if stripped != slug:
            slug_pairs.append((stripped, c["id"]))

    candidates: list[dict] = []
    assigned: set[str] = set()

    for url in gallery_urls:
        filename_no_ext = re.sub(r"\.[a-zA-Z]+$", "", url.split("/")[-1])
        for slug, cid in slug_pairs:
            if cid in assigned:
                continue
            if slug in filename_no_ext:
                assigned.add(cid)
                candidates.append({
                    "course_id": cid,
                    "candidate_url": url,
                    "local_present": cid in local_courses,
                })
                break

    return candidates


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument(
        "--source",
        choices=["seed", "route-page", "mariowiki"],
        default="seed",
        help="Candidate source (default: seed - no network)",
    )
    ap.add_argument(
        "--out-file",
        metavar="PATH",
        help="Write JSON output to PATH instead of stdout",
    )
    args = ap.parse_args()

    seed = _collect_seed()

    route_page_candidates: list[dict] = []
    mariowiki_candidates: list[dict] = []

    if args.source == "route-page":
        route_page_candidates = _collect_route_page_candidates(seed)
    elif args.source == "mariowiki":
        mariowiki_candidates = _collect_mariowiki_candidates()

    # Summary
    routes_with_url = sum(1 for r in seed["route_status"] if r["known_url"])
    routes_local = sum(1 for r in seed["route_status"] if r["local_present"])
    courses_local = sum(1 for c in seed["course_status"] if c["local_present"])
    icons_local = sum(1 for i in seed["icon_status"] if i["local_present"])

    output: dict = {
        "summary": {
            "route_images": {
                "total_routes": len(seed["route_status"]),
                "with_known_url_in_seed": routes_with_url,
                "local_present": routes_local,
                "local_missing": len(seed["route_status"]) - routes_local,
            },
            "course_images": {
                "total_courses": len(seed["course_status"]),
                "local_present": courses_local,
                "local_missing": len(seed["course_status"]) - courses_local,
            },
            "course_icons": {
                "total_courses": len(seed["icon_status"]),
                "local_present": icons_local,
                "local_missing": len(seed["icon_status"]) - icons_local,
            },
        },
        "seed_route_status": seed["route_status"],
        "seed_course_status": seed["course_status"],
        "seed_icon_status": seed["icon_status"],
    }

    if route_page_candidates:
        output["route_page_new_candidates"] = route_page_candidates
        output["summary"]["route_page_new_candidates_found"] = len(route_page_candidates)

    if mariowiki_candidates:
        output["mariowiki_course_candidates"] = mariowiki_candidates
        output["summary"]["mariowiki_course_candidates_found"] = len(mariowiki_candidates)

    json_out = json.dumps(output, ensure_ascii=False, indent=2)

    if args.out_file:
        Path(args.out_file).write_text(json_out, encoding="utf-8")
        print(f"Wrote {args.out_file}")
    else:
        print(json_out)


if __name__ == "__main__":
    main()
