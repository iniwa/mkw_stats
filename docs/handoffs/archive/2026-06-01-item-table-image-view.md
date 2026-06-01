Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add an item table reference view to the web UI.

The first implementation should be image-based: download the current item table images from the approved source, serve them as local frontend assets, and add a simple `Items` tab where the user can view the 24-player table, 12-player table, and extra/exception item table.

## Background

`issues.md` currently includes:

- `共通･新機能`
- `アイテムテーブルを表示してほしい`
- Source note: `https://japan-mk.blog.jp/mkworld.item-1`

The page currently describes the Mario Kart World item table for v1.6.0+ and includes:

- 24-player room item list image
- 12-player room item list image
- additional/exception item image

Use local assets at runtime. Do not hotlink external images from the app.

Approved source page:

- `https://japan-mk.blog.jp/mkworld.item-1`

Known image URLs from that page:

- 24-player table: `https://livedoor.blogimg.jp/nim_2525/imgs/7/2/722654a4-s.png`
- 12-player table: `https://livedoor.blogimg.jp/nim_2525/imgs/3/f/3fd55b40-s.png`
- extra/exception table: `https://livedoor.blogimg.jp/nim_2525/imgs/9/1/914af419-s.png`

## Files To Inspect

- `issues.md`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `docs/design/ui-redesign-roadmap.md`

## Files To Edit

- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/ItemTablesView.tsx` (new)
- `frontend/public/assets/items/` (new directory and downloaded images)
- `docs/design/ui-redesign-roadmap.md`
- `issues.md`

## Constraints

- Frontend-only change. Do not change backend APIs, database, Alembic, or seed data.
- Do not introduce a new npm dependency.
- Do not hotlink external images in runtime JSX. The app must load local `/assets/items/...` files.
- Keep the implementation simple and static. This is a reference view, not a structured searchable item database.
- Preserve existing navigation behavior.
- Keep the view usable at 375px width without horizontal page overflow.
- Mark only the relevant `issues.md` item complete after implementation.

## Required Behavior

Add a new top-level nav item:

- Label: `Items`
- Recommended placement: after `Playing` and before `VR`, or after `Analytics`; choose the least disruptive spot.

Add a new `ItemTablesView`:

- Page title: `アイテムテーブル`
- Short source/version note:
  - `v1.6.0以降の順位別アイテム表`
  - include a source link to `https://japan-mk.blog.jp/mkworld.item-1`
- Show three sections:
  - `24人部屋`
  - `12人部屋`
  - `追加出現アイテム`
- Each section displays the corresponding local PNG.
- Images should use `max-width: 100%`, `height: auto`, and should not force horizontal overflow.
- If an image fails to load, show a concise fallback text instead of a broken image UI.

Asset paths:

- `/assets/items/item-table-24p.png`
- `/assets/items/item-table-12p.png`
- `/assets/items/item-table-extra.png`

Local file paths:

- `frontend/public/assets/items/item-table-24p.png`
- `frontend/public/assets/items/item-table-12p.png`
- `frontend/public/assets/items/item-table-extra.png`

## Suggested Implementation

1. Create `frontend/public/assets/items/`.
2. Download the three PNG files into the exact filenames above.
3. Add `frontend/src/ItemTablesView.tsx`.
4. Import and route it in `frontend/src/App.tsx`.
5. Add compact CSS classes in `App.css`, for example:
   - `.items-view`
   - `.items-view__section`
   - `.items-view__image`
   - `.items-view__source`
6. Update `docs/design/ui-redesign-roadmap.md`.
7. Mark the item table issue complete in `issues.md`.

## Verification

Run:

```text
npm run typecheck
npm run build
```

Manual/browser checks:

- `Items` nav tab appears and opens the new view.
- All 3 local images load from `/assets/items/...`.
- No runtime hotlink to `japan-mk.blog.jp` or `livedoor.blogimg.jp`.
- 375px width has no horizontal page overflow.
- Dashboard / Playing / VR / Lounge / Analytics / Courses / Records / Settings still load.

Static checks:

- Confirm image files are tracked under `frontend/public/assets/items/`.
- Confirm `issues.md` marks only the item table issue complete.

## Expected Report

- Changed files
- Summary
- Asset source URLs and saved file paths
- Verification results
- Blocked checks
- Design questions for Codex
