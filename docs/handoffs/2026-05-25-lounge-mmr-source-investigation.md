Read AGENTS.md, CLAUDE.md, docs/design/ui-redesign-roadmap.md, and this handoff file before investigation.
This is an investigation-only handoff. Do not edit application code.
If investigation requires credentials, private Discord access, or authenticated API use, stop and report what is needed.

## Goal

Confirm a safe and maintainable data source for Lounge MMR before implementing session-level MMR sync.

The next implementation handoff, `2026-05-25-lounge-mmr-session-sync.md`, must not be implemented until this source question is resolved.

## Background

Design direction:

- Lounge race records store manually entered placement and score.
- MMR is session-level, not race-level.
- The user wants MMR to be obtained automatically per Lounge session.
- Current app already has `settings.lounge_player_id` and `settings.lounge_auto_sync`.

Known public pages may expose player and table information, for example:

- `https://lounge.mkcentral.com/`
- `https://lounge.mkcentral.com/mk8dx/PlayerDetails/<player_id>`
- `https://lounge.mkcentral.com/TableDetails/<table_id>`

However, the project has not confirmed whether there is a stable public JSON API, whether scraping HTML is acceptable, or whether MKWorld Lounge uses different paths/fields from MK8DX.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/ui-redesign-roadmap.md`
- `docs/handoffs/2026-05-25-lounge-mmr-session-sync.md`
- `backend/app/models/lounge.py`
- `backend/app/models/sessions.py`
- `backend/app/models/vr.py`
- `backend/app/schemas/__init__.py`
- `frontend/src/LoungeView.tsx`
- `frontend/src/SettingsView.tsx`
- `frontend/src/api.ts`

## Files To Edit

None.

This handoff is verification/research only. Do not modify source files, docs, tests, or config.

## Investigation Scope

Check and report:

1. Whether MKCentral/Lounge exposes a stable public JSON/API endpoint for:
   - player current MMR
   - player recent MMR changes
   - table details including table id, verified time, score, previous MMR, delta, new MMR
2. Whether the relevant source is MKWorld-specific or only MK8DX.
3. Whether access requires authentication, cookies, Discord login, API token, or private server membership.
4. Whether querying by `lounge_player_id` is enough, or whether username/search is also needed.
5. Whether table IDs can be linked to a locally recorded Lounge session by time window.
6. Rate-limit, robots/terms, or practical scraping concerns.

Use browser/devtools or safe read-only HTTP requests only. Do not brute-force endpoints. Do not store credentials.

## Expected Recommendation

Recommend exactly one of:

- `public_json_api`: implement sync against a documented or clearly discoverable public JSON endpoint.
- `html_scrape_allowed`: implement conservative HTML parsing of public pages.
- `manual_import_first`: add session-level MMR fields and manual attach/import UI first, postpone auto fetch.
- `blocked`: source requires credentials/private access or is too unstable; ask user for source details.

For the recommendation, include:

- base URL(s)
- request shape
- sample response fields or page fields
- how to identify the user's player
- how to identify the latest MMR movement
- how to match it to local completed Lounge sessions
- risks and constraints

## Non Goals

- Do not implement backend models or migrations.
- Do not add frontend UI.
- Do not call external services repeatedly.
- Do not add dependencies.
- Do not scrape private/authenticated pages.

## Verification

No test suite is required because this is research-only.

If safe, run one or two read-only requests and report:

- URL used
- HTTP status
- relevant fields observed
- whether the result appears stable enough for implementation

## Expected Report

Report in Japanese:

- Checked sources
- Whether MKWorld-specific Lounge data is available
- Whether authentication is required
- Recommended path
- Proposed implementation scope for the next handoff
- Blockers or required user input
