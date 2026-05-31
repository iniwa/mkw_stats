# Route Image Assets

Last updated: 2026-05-31

## Path Convention

```text
frontend/public/assets/routes/<route_id>.png           — mid-route path image (道中)
frontend/public/assets/routes/<route_id>_goal.png      — goal / final-lap image (道後)
frontend/public/assets/routes/<route_id>_3lap_goal.png — 3-lap route goal variant (道後)
```

Runtime URLs follow the same pattern: `/assets/routes/<filename>`.

## Status

| Image type | Routes | Local present | Notes |
|---|---|---|---|
| Path images (`<route_id>.png`) | 203 routes | 202 | 1 missing |
| Goal images (`_goal.png` / `_3lap_goal.png`) | — | 232 | includes 3-lap variants |

Path images (202/203) and goal images (232) were added in a bulk acquisition pass (commit `fd8be01`).

The 1 missing path image can be identified by comparing all route IDs in `backend/app/seed/initial_data.py` against files in `frontend/public/assets/routes/` (excluding `_goal.png` files).

## Display Plumbing

- Component: `frontend/src/TargetImage.tsx` with `kind="route"` loads `<route_id>.png`
- `PlayingView` confirmation step (`SelectionConfirm`): shows `TargetImage kind="route"` for route targets
- `AnnotationEditor` surface: shows path or goal background based on active surface selector (`道中` / `道後`)
  - Path surface: `<route_id>.png`
  - Goal surface: `<route_id>_goal.png` or `<route_id>_3lap_goal.png`
- Missing image: `TargetImage` returns `null` (no broken image shown)

## Source Note

Images are manually sourced and stored locally. No hotlinking at runtime.

Original acquisition source for the first 11 images: `https://japan-mk.blog.jp/mkworld.info-1/route.html` (fan site, user-approved). Remaining images were added in bulk from the same approved source domain.

## Related Docs

- Image asset candidates and acquisition guide: `docs/design/image-asset-candidates.md`
- Course image assets: `docs/design/course-image-assets.md`
- Course icon assets: `docs/design/course-icon-assets.md`
