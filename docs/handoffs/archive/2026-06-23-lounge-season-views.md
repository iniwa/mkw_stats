Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Add season-aware Lounge history so:

- Lounge MMR progression is displayed separately for each season.
- Analytics adds a Lounge season selector to the existing filters.
- Lounge sessions retain the season that was active when the session was created.
- MMR sync records the exact season used for the MKCentral request.

## Background

The current Lounge trend is built from `PlaySession.lounge_mmr_after` and
`PlaySession.lounge_mmr_game`, but `play_sessions` does not retain a season.
`AppSettings.lounge_season` is only the current sync setting and must not be
used later as if it were historical session data.

Relevant current behavior:

- `frontend/src/LoungeView.tsx` loads recent Lounge sessions and renders one
  `MmrTrendChart` containing 12p and 24p streams.
- `frontend/src/AnalyticsView.tsx` has VR / Lounge / both modes, date filters,
  a result limit, and a 12p / 24p Lounge filter.
- `backend/app/services/lounge_mmr.py::sync_mmr()` receives the exact season
  used for the MKCentral request, but only persists MMR values and game.
- `backend/app/services/race_flow.py::create_session()` can read
  `AppSettings`, but currently does not snapshot the Lounge season.
- `GET /api/v1/play-sessions` supports source, status, date, and limit filters.

The app currently defaults to Lounge Season 2, but historical rows must not be
silently backfilled to Season 2. `mkworld` can represent Season 0 or Season 1,
and future `mkworld12p` / `mkworld24p` records may belong to seasons after
Season 2.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-24-lounge-overview-mvp-scope.md`
- `docs/decisions/2026-05-24-analytics-mvp-scope.md`
- `docs/decisions/2026-05-29-lounge-mmr-game-strings.md`
- `docs/handoffs/archive/2026-05-25-analytics-split-vr-lounge.md`
- `docs/handoffs/archive/2026-06-01-lounge-mmr-trend-even-spacing.md`
- `backend/app/models/sessions.py`
- `backend/app/models/vr.py`
- `backend/app/schemas/__init__.py`
- `backend/app/api/sessions.py`
- `backend/app/services/race_flow.py`
- `backend/app/services/lounge_mmr.py`
- `backend/alembic/versions/008_time_attack_records.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/LoungeView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/App.css`

## Files To Edit

- `backend/alembic/versions/009_play_session_lounge_season.py` (new)
- `backend/app/models/sessions.py`
- `backend/app/schemas/__init__.py`
- `backend/app/api/sessions.py`
- `backend/app/services/race_flow.py`
- `backend/app/services/lounge_mmr.py`
- `backend/tests/test_api.py`
- `frontend/src/api.ts`
- `frontend/src/LoungeView.tsx`
- `frontend/src/AnalyticsView.tsx`
- `frontend/src/App.css` only if a small responsive style addition is needed
- `docs/decisions/2026-06-23-lounge-season-snapshot-and-filtering.md` (new)

Do not edit deployment, Docker, GHCR, navigation, Settings UI, Playing UI, or
the v0.1 design snapshot for this task.

## Required Backend Behavior

### Persisted season snapshot

Add nullable integer `lounge_season` to `play_sessions`.

- Alembic revision: `009`
- Down revision: `008`
- The migration must add/drop the nullable column.
- Do not mass-backfill existing rows in the migration.
- Ranked sessions keep `lounge_season = null`.
- When a new Lounge session is created, snapshot the current
  `AppSettings.lounge_season`.
- If the settings row does not yet exist, use the existing application default
  Season 2 without creating unrelated behavior changes.
- Changing Settings later must not change an existing session snapshot.

Expose `lounge_season: int | null` in `PlaySessionRead` and the frontend
`PlaySession` type.

### MMR sync

When `sync_mmr(db, player_id, season)` attaches an MMR change to a session:

- Persist `candidate.lounge_season = season`.
- Do not match a session already tagged with a different season.
- Legacy candidate sessions with `lounge_season = null` remain eligible for
  the requested season and become tagged when a change is attached.

Also support safe legacy enrichment:

- If a fetched MKCentral change ID is already attached to a local session and
  that session has `lounge_season = null`, set it to the exact requested
  season because the current API response proves the association.
- Do not overwrite a non-null, different season.
- It is acceptable for this enrichment to occur during a normal manual or
  automatic MMR sync.
- Avoid returning a misleading “new session updated” result when only legacy
  metadata was enriched; keep response semantics clear.

### Session list filter

Add optional integer query parameter `lounge_season` to:

```text
GET /api/v1/play-sessions
```

Behavior:

- When omitted, preserve current results.
- When provided, return only sessions whose persisted `lounge_season` equals
  the requested value.
- Apply the filter before ordering/limit.
- This filter is primarily for `source=lounge`; do not introduce special
  errors if combined with another source.

Update `api.getSessions()` to accept and send `lounge_season`.

## Required Lounge UI Behavior

Keep the current date, limit, and 12p / 24p controls.

Change the MMR progression area so it no longer combines different seasons in
one chart:

- Group synced MMR sessions by persisted `lounge_season`.
- Render a separate trend panel/chart for every numbered season represented in
  the loaded window.
- Label each clearly, for example `Season 2 MMR推移`.
- Sort numbered season panels newest/highest season first.
- Keep 12p and 24p as separate streams inside each season chart.
- The existing 12p / 24p view mode must also apply inside every season panel.
- Keep match-order/even x-axis spacing from the current implementation.
- Do not connect a line across season boundaries.
- Legacy MMR rows with `lounge_season = null` must appear in a separate
  `シーズン不明` panel rather than being assigned to the current season.
- Empty groups should not render.

The current MMR summary values must not calculate historical max/min across
multiple seasons:

- Clearly label the current summary with the configured current season.
- Current 12p/24p values may continue to come from the persisted Settings
  snapshot / latest sync response.
- Max/min/previous delta/synced count in that summary must use only sessions
  for the configured current season.
- If settings cannot be loaded, show a clear neutral state rather than mixing
  all seasons.

Recent Lounge session lists and non-MMR operational summaries may remain in
their current date/limit window; do not redesign the entire Lounge page.

## Required Analytics UI Behavior

Add a season selector to the existing Analytics controls.

- Show it when `mode === 'lounge'`.
- Hide it for VR and both modes; season filtering must not accidentally remove
  ranked data in mixed mode.
- Options:
  - `全シーズン`
  - numbered seasons from Season 0 through the current
    `Settings.lounge_season`
- If loaded data contains a numbered season above the current setting, include
  it as well.
- Default to `全シーズン`.
- When a numbered season is selected, pass `lounge_season` to
  `api.getSessions()` so filtering happens before the backend limit.
- Date, limit, and 12p / 24p filters continue to compose with the season
  filter.
- All displayed Lounge aggregate values, target rankings, match count, and
  race count must reflect the selected season.
- Legacy rows with `lounge_season = null` are included only in
  `全シーズン`; do not label them as a numbered season.
- Show the selected season in the analytics window/filter summary so the scope
  is explicit.
- Preserve the selected season state when temporarily switching modes, but
  apply it only in Lounge mode.

Fetch Settings as part of Analytics data loading or through a small separate
request. Do not hardcode the current season in the frontend.

## Tests

Add or update backend tests covering at least:

- A newly created Lounge session snapshots the current configured season.
- Changing Settings after session creation does not mutate that snapshot.
- A ranked session has `lounge_season = null`.
- `GET /play-sessions?lounge_season=N` filters before the result limit.
- MMR sync stores the requested season on the matched session.
- MMR sync does not attach a Season N change to a session already tagged with
  a different season.
- A legacy synced session with null season is safely enriched when its existing
  change ID is observed in the requested season response.
- A non-null season is never overwritten by legacy enrichment.
- Existing MMR game/player-count behavior for Season 0/1 and Season 2+ remains
  covered.

Use existing test fixtures and mocking conventions. Do not add a frontend test
framework for this task.

## Constraints

- Preserve ranked VR and Lounge MMR separation.
- No charting library or new runtime dependency.
- No new analytics aggregation endpoint.
- Do not infer historical season from `started_at`, current Settings, or only
  from `lounge_mmr_game`.
- Do not rewrite existing historical rows with an assumed Season 2.
- Do not change MKCentral game-string mapping:
  - Season 0/1: `mkworld`
  - Season 2+: `mkworld12p` and `mkworld24p`
- Keep current date filters and 25/50/100/200 result limits.
- Keep hidden and cancelled race handling unchanged.
- Keep the UI usable at 375px without horizontal overflow.
- No deployment, external exposure, Cloudflare, registry, or Portainer changes.
- Do not touch secrets, credentials, `.env`, or local settings.

## Non Goals

- Editing a historical session's season from the UI.
- Importing all historical MKCentral seasons automatically.
- A dedicated season-management screen.
- Changing Lounge season Settings behavior.
- New graph interactions, chart dependencies, or all-time backend analytics.
- Backfilling uncertain legacy rows.
- Pi deployment or live MKCentral verification in this implementation handoff.

## Durable Decision

Create `docs/decisions/2026-06-23-lounge-season-snapshot-and-filtering.md`
recording:

- Lounge season is historical session metadata, snapshotted on session
  creation and confirmed by MMR sync.
- Current Settings is not a substitute for historical season.
- Unknown legacy rows remain nullable until exact API evidence is available.
- Lounge trend charts are separated by season.
- Analytics season filtering is applied only to Lounge mode.

## Verification

Run:

```text
python -m pytest backend/tests
cd frontend
npm run typecheck
npm run build
```

Also inspect the final diff and confirm:

- Migration chain is `008 -> 009`.
- Existing migrations were not edited.
- No dependency files changed unexpectedly.
- No files outside `Files To Edit` changed.

Manual/browser check if feasible:

- Lounge shows one MMR trend panel per season and never connects seasons.
- `シーズン不明` appears only when legacy null-season MMR rows exist.
- 12p / 24p toggles affect every season trend.
- Current MMR summary is explicitly scoped to the configured season.
- Analytics Lounge mode shows the season selector.
- Selecting a season changes all Lounge metrics and composes with date and
  player-count filters.
- Analytics VR/both modes hide and do not apply the Lounge season filter.
- 375px viewport has no horizontal overflow.
- Browser console has no React/JavaScript errors.

If browser verification is unavailable, report it as blocked rather than
claiming it passed.

## Expected Report

Report in Japanese:

- Changed files
- Summary
- Migration behavior
- Legacy null-season handling
- Verification results
- Blocked checks
- Any files changed outside the allowed scope
- Design questions for Codex
