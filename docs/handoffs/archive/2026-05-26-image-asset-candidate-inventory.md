Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Prepare an image asset candidate inventory for course images, route images, and course icons.

This is a research/documentation/script-prep slice. It should make the next actual asset acquisition step mechanical and reviewable.

Backlog context in `issues.md`:

- `画像データが欲しい`
  - `コースアイコン画像を配置`
  - `コース･道中ルートの全てにコース画像を配置`
  - `ファンサイトから自動で取得したい`

## Background

Current asset state:

- World map exists:
  - `frontend/public/assets/maps/world.png`
- Route images:
  - path: `frontend/public/assets/routes/<route_id>.png`
  - 11 route images are present from seed `route.tags.image_url`
  - documented in `docs/design/route-image-assets.md`
- Course image display plumbing exists:
  - path: `frontend/public/assets/courses/<course_id>.png`
  - documented in `docs/design/course-image-assets.md`
  - currently 0/30 course images present
- Course icons:
  - path: `frontend/public/assets/course-icons/<course_id>.png`
  - documented in `docs/design/course-icon-assets.md`
  - currently 0/30 course icons present

User-approved reference pages:

- `https://japan-mk.blog.jp/mkworld.info-1/route.html`
- `https://www.mariowiki.com/Mario_Kart_World#Courses`

Assets must be saved locally. Do not hotlink at runtime.

`sample.png` may exist at repository root as a user-provided sample. Do not commit it unless it is explicitly mapped to a course/route and renamed into an approved asset path.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `issues.md`
- `docs/design/course-image-assets.md`
- `docs/design/route-image-assets.md`
- `docs/design/course-icon-assets.md`
- `docs/decisions/2026-05-25-map-image-asset-policy.md`
- `backend/app/seed/initial_data.py`
- `scripts/download_route_images.py`
- `frontend/public/assets/courses/`
- `frontend/public/assets/routes/`
- `frontend/public/assets/course-icons/`

## Files To Edit

- `docs/design/course-image-assets.md`
- `docs/design/route-image-assets.md`
- `docs/design/course-icon-assets.md`
- `docs/design/image-asset-candidates.md` (new)
- `scripts/README.md` or a new script only if useful:
  - `scripts/collect_image_asset_candidates.py`

Do not edit app runtime code in this slice.

## Required Work

### Inventory

Create `docs/design/image-asset-candidates.md` with:

- current local asset counts:
  - course images present / missing
  - route images present / missing
  - course icons present / missing
- expected paths for each type
- candidate source strategy:
  - fan-site route page for route/course route images
  - MarioWiki course page for course images/icons
- clear distinction between:
  - image candidates found
  - images downloaded
  - images still missing

### Candidate Extraction

If practical, add a script:

```text
scripts/collect_image_asset_candidates.py
```

Script requirements:

- Safe by default: no downloads.
- Accept `--source route-page` / `--source mariowiki` or a simple default that documents what it scans.
- Output candidate mappings to stdout or a JSON/Markdown file.
- Do not overwrite existing assets.
- Do not require new Python dependencies; use stdlib only.
- Include a clear User-Agent if making HTTP requests.
- If network access is blocked, fail gracefully and document the blocker.

If a robust script is not practical, skip the script and make the docs inventory detailed enough for the next handoff.

### Documentation Updates

Update existing asset docs with links to the new candidate inventory:

- `docs/design/course-image-assets.md`
- `docs/design/route-image-assets.md`
- `docs/design/course-icon-assets.md`

Do not mark `issues.md` items complete. This slice prepares acquisition; it does not complete it.

## Constraints

- Do not download or commit new external image files in this slice.
- Do not commit root-level `sample.png`.
- Do not add npm or Python third-party dependencies.
- Do not change frontend/backend runtime behavior.
- Do not modify seed data unless only reading it is insufficient and Codex approves.
- Respect existing asset policy: local assets only at runtime, no hotlinking.

## Non Goals

- Full image acquisition.
- Image cropping/resizing.
- Course icon creation.
- UI changes.
- Pi deployment.

## Verification

Run:

```bash
git diff --check
```

If a Python script is added:

```bash
python -m py_compile scripts/collect_image_asset_candidates.py
python scripts/collect_image_asset_candidates.py --help
```

If the script supports dry-run/no-network mode, run it and report results.

## Expected Report

- Changed files
- Summary
- Candidate source findings
- Local asset counts
- Script behavior, if added
- Verification results
- Blocked checks
- Design questions for Codex
