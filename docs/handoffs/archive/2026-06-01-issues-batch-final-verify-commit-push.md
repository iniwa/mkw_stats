Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Perform final verification for the current `issues.md` implementation batch, then commit and push the completed work.

This handoff is primarily verification + git hygiene. Do not add new features unless a blocking bug is discovered during verification.

## Background

The user added four `issues.md` items and ClaudeCode implemented them across several small slices:

1. Lounge MMR trend chart uses even match-order spacing instead of real timestamp spacing.
2. Playing Lounge shows current/projected total score.
3. Playing Ranked/VR course confirmation screen allows participant count pre-input.
4. A new `Items` tab displays item table images from local frontend assets.

Codex reviewed the reports and archived the completed handoffs:

- `docs/handoffs/archive/2026-06-01-lounge-mmr-trend-even-spacing.md`
- `docs/handoffs/archive/2026-06-01-playing-lounge-score-total.md`
- `docs/handoffs/archive/2026-06-01-playing-ranked-player-count-preinput.md`
- `docs/handoffs/archive/2026-06-01-item-table-image-view.md`

`docs/handoffs/README.md` should now show no active implementation or verification handoffs.

## Files To Inspect

- `issues.md`
- `docs/handoffs/README.md`
- `docs/design/ui-redesign-roadmap.md`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/LoungeView.tsx`
- `frontend/src/PlayingView.tsx`
- `frontend/src/ItemTablesView.tsx`
- `frontend/public/assets/items/`

## Files To Edit

Normally none.

Only edit files if verification finds a clear, blocking defect in the already-implemented batch. If that happens, keep the fix minimal and report it explicitly.

## Constraints

- Do not introduce new features.
- Do not change backend APIs, database schema, Alembic migrations, Docker, or deployment configuration.
- Do not remove user changes.
- Do not rewrite unrelated docs.
- Do not commit untracked/generated junk outside the intended files.
- Do not include local build output such as `frontend/dist/`.
- Do not include `.playwright-mcp/`, logs, DB files, screenshots, or temporary files.
- If `git status` shows unrelated changes outside this batch, stop and ask Codex before committing.

## Expected Intended Commit Scope

The commit should include the current batch changes only:

- `issues.md`
- `docs/design/ui-redesign-roadmap.md`
- `docs/handoffs/README.md`
- archived handoffs:
  - `docs/handoffs/archive/2026-06-01-lounge-mmr-trend-even-spacing.md`
  - `docs/handoffs/archive/2026-06-01-playing-lounge-score-total.md`
  - `docs/handoffs/archive/2026-06-01-playing-ranked-player-count-preinput.md`
  - `docs/handoffs/archive/2026-06-01-item-table-image-view.md`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/LoungeView.tsx`
- `frontend/src/PlayingView.tsx`
- `frontend/src/ItemTablesView.tsx`
- `frontend/public/assets/items/item-table-24p.png`
- `frontend/public/assets/items/item-table-12p.png`
- `frontend/public/assets/items/item-table-extra.png`

## Verification

Run:

```text
npm run typecheck
npm run build
```

Also run/check:

```text
git status --short
git diff --check
git diff --stat
git ls-files frontend/public/assets/items
```

Manual/static checks:

- `issues.md` has all four new items checked.
- `docs/handoffs/README.md` has Active Verification and Active Implementation set to `None`.
- The four completed handoff files are under `docs/handoffs/archive/`.
- `frontend/src/ItemTablesView.tsx` uses local `/assets/items/...` images and has no runtime image hotlinks.
- `frontend/public/assets/items/` contains exactly the three expected PNG files.
- `Items` appears in `NAV_ITEMS` and renders `ItemTablesView`.
- No obvious mojibake in newly added Japanese UI strings when read as UTF-8.

If browser verification is feasible:

- Start or use a local frontend dev server.
- Confirm `Items` tab loads and images display.
- Confirm no horizontal overflow at 375px for Items, Playing, and Lounge.

Browser verification is useful but not required if typecheck/build/static checks pass and a dev environment is not already running.

## Commit And Push

If verification passes:

1. Stage only the intended files.
2. Commit with this message:

```text
Implement issues batch UI updates
```

3. Push to the configured main remote/branch.

Use the existing repository remote workflow. Do not change remotes.

## Expected Report

- Verification commands and results
- Final changed/committed files
- Commit hash
- Push result
- Any files deliberately excluded
- Blocked checks
- Design questions for Codex
