# MKCentral Lounge MMR game strings (12p / 24p)

Date: 2026-05-29

## Decision

When syncing Lounge MMR from the MKCentral public API
(`https://lounge.mkcentral.com/api/player/details`), the `game` query string
must be chosen by **player count and season**:

| Season | 12p          | 24p          |
|--------|--------------|--------------|
| 0, 1   | `mkworld`    | `mkworld`    | (single combined MMR stream) |
| 2+     | `mkworld12p` | `mkworld24p` |

`lounge_game_for_player_count(player_count, season)` in
`backend/app/services/lounge_mmr.py` encodes this.

## Why this matters (the bug it fixed)

The previous mapping used `mkworld` for 12p in **all** seasons and only switched
24p to `mkworld24p` for season 2+. But:

- `game=mkworld` is only valid for seasons 0 and 1. Season 2+ returns
  `Invalid season N for game mkworld` from the list endpoint.
- The **details** endpoint does NOT error on an invalid `game` — it *silently
  falls back to `mkworld24p`*. So fetching `game=mkworld&season=2` returned the
  24p payload (`"game":"mkworld24p"`).

Result: for the default season (2), both `current_mmr_12p` and
`current_mmr_24p` were populated with the **24p** MMR. The 12p stream
(`mkworld12p`) was never queried.

## How it was verified

Read-only probes against production (May 2026):

- `player/list?game=mkworld&season=2` → `Invalid season 2 for game mkworld`
- `player/list?game=mkworld24p&season=2` → ok
- `player/list?game=mkworld12p&season=2` → ok (distinct players/MMR)
- `player/details?name=<p>&season=2&game=mkworld` → response `"game":"mkworld24p"` (silent fallback)
- Same player, `game=mkworld12p` vs `mkworld24p` → different `mmr` values, confirming separate streams.

`mmrChanges[]` entries also carry `numPlayers` (12 or 24), which is an
alternative signal for disambiguation if the game-string approach ever breaks.

## Related

- `backend/app/services/lounge_mmr.py` — `lounge_game_for_player_count`, `sync_mmr`, `_find_best_session`
- Reference impl noted in earlier handoffs: `fuyu-neko/StatsBot_MKWorld` (uses MKCentral Lounge API, `VikeMK/Lounge-API`).
