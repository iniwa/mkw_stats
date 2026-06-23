# Lounge season snapshot and season-scoped filtering

Date: 2026-06-23

## Decision

Lounge season is historical session metadata, snapshotted at session creation time:

1. **Snapshot at creation**: When a Lounge session is created, `play_sessions.lounge_season`
   is set to the value of `AppSettings.lounge_season` at that moment (defaulting to Season 2
   if no settings row exists). Ranked sessions always have `lounge_season = null`.

2. **Immutability of snapshots**: The current Settings value is NOT a substitute for historical
   season metadata. Changing `AppSettings.lounge_season` must never mutate an existing
   session's snapshot.

3. **Handling legacy rows**: Unknown legacy rows recorded before season tracking remain
   `lounge_season = null` until exact API evidence is available. During MMR sync, if a
   fetched change ID is already attached to a local session whose season is null, the
   season is backfilled to the exact requested season (the API response proves the
   association). A non-null season already attached is never overwritten. No mass
   backfill to an assumed Season 2 occurs at migration; the column is added nullable
   without data migration.

4. **MMR sync matching**: The sync operation attaches a change to a session only if the
   session's season is null (legacy) or matches the requested season. A session already
   tagged with a different season is excluded from matching.

5. **Trend visualization by season**: Season 3 and later are durable, individually
   selectable seasons. The current season is labeled `今シーズン（シーズンN）`;
   completed numbered seasons from N-1 down through Season 3 are listed separately.
   Older unclassified history is grouped under the fixed compatibility label
   `シーズン3以前`. This legacy bucket contains seasons below 3 plus null-season rows
   and never absorbs a row explicitly tagged as Season 3 or later.

6. **Analytics filtering**: Season filtering in Analytics applies ONLY to Lounge mode;
   it is hidden and not applied for VR or both modes, ensuring ranked data is never
   removed by a season filter. The exact-season backend query filters before the result
   limit. Lounge overview also supports `lounge_season_before=3`, which returns sessions
   below Season 3 plus null-season legacy rows before applying the limit.

## Why

Lounge mode introduced numbered seasons (0, 1, 2, …) while ranked mode does not. To
support accurate historical analytics and comparison across seasons:

- Sessions must carry their season as immutable metadata, not derived from current
  settings.
- Analytics tools must allow filtering by season for accurate trend analysis and
  per-season comparisons.
- UI should clearly distinguish seasons in trend charts and exclude null-season rows
  from season-specific analysis.
- MMR sync must use API-provided evidence (the change ID already attached to a session)
  to resolve null-season rows, rather than guessing.

## Operational correction on 2026-06-23

The user confirmed that the newest synced 12p and 24p records were the first
records of Season 3. On the Raspberry Pi database, only those two exact records
were assigned `lounge_season = 3` after migration 009 was applied:

- 12p: completed 2026-06-22 19:49 JST, MMR 3790
- 24p: completed 2026-06-22 20:53 JST, MMR 2324

Older null-season records remain unknown because no season evidence was provided.
This was an instance-specific data correction, not a general migration rule.

## Related

- **Alembic revision 009** (down_revision 008): Adds nullable `play_sessions.lounge_season`
  column.
- **`backend/app/services/race_flow.py::create_session`**: Snapshots season at session creation.
- **`backend/app/services/lounge_mmr.py::sync_mmr`**: Tags/enriches season; `_find_best_session`
  excludes different-season candidates.
- **`backend/app/schemas/__init__.py::PlaySessionRead`** / **`frontend/src/api.ts` (`PlaySession`)**:
  Expose `lounge_season` in the session schema / client type.
- **`frontend/src/LoungeView.tsx`**: Renders MMR trend panels separated by season.
- **`frontend/src/AnalyticsView.tsx`**: Implements the season selector (visible only in Lounge mode).
