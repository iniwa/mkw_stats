Read AGENTS.md, CLAUDE.md, `docs/decisions/2026-06-18-seed-vr-account-idempotency.md`, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

> Reviewed by Codex on 2026-06-18. Accepted without implementation findings. Local verification reproduced `155 passed`, successful Python compilation, and a clean whitespace check.

## Goal

Fix `python -m app.seed.initial_data` so it remains idempotent when the database already has an active user-created VR account but the default seed account `main` is absent.

The seed must complete successfully without changing the user's active account or existing VR account values.

## Background

During the Time Attack Pi deployment:

- Alembic migration `007 -> 008` succeeded.
- The production active VR account was `iniwa`.
- The default seed account `main` was absent.
- The seed attempted to insert `main` with `is_active=True`.
- PostgreSQL rejected the insert through `uq_vr_accounts_single_active`.
- The transaction rolled back and existing data remained intact.

The relevant decision is:

- `docs/decisions/2026-06-18-seed-vr-account-idempotency.md`

Required behavior:

- Fresh/empty DB: create `main` as active.
- Existing active account, missing `main`: create `main` as inactive.
- Existing `main`: leave its user-managed fields unchanged.
- Repeated runs: succeed and preserve exactly the same active account.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-06-18-seed-vr-account-idempotency.md`
- `backend/app/seed/initial_data.py`
- `backend/app/models/vr.py`
- `backend/tests/conftest.py`
- `backend/tests/test_smoke.py`
- `backend/tests/test_api.py`
- `docs/design/deployment.md`
- `docs/design/operations.md`
- `README.md`

## Files To Edit

- `backend/app/seed/initial_data.py`
- `backend/tests/test_smoke.py`

If the existing test organization makes an API-test file clearly more appropriate, `backend/tests/test_api.py` may be edited instead of or in addition to `test_smoke.py`; report the reason.

Do not edit documentation unless the implementation reveals that the existing statement “seed is idempotent” requires qualification after the fix. The intended result is to make that existing statement true.

## Required Implementation

### Seed Behavior

Keep the existing seed-account data definition, but do not blindly apply its `is_active=True` value when inserting into an established database.

For each missing seed VR account:

1. Query whether any active `VrAccount` currently exists.
2. If an active account exists, insert the missing seed account with `is_active=False`.
3. If no active account exists, insert it using the seed default `is_active=True`.

For an existing seed account:

- do not call `_sync_seed_fields`
- do not update `is_active`
- do not update `initial_vr`
- do not update `current_vr`
- do not update `display_name`, `name`, or `sort_order`

The implementation should remain straightforward and transaction-safe.

With the current single seed account, a simple active-account query before insertion is sufficient. Do not introduce a generalized account reconciliation framework.

### Tests

Add database-backed tests covering:

1. Empty DB:
   - first seed succeeds
   - `main` exists and is active
   - exactly one active VR account exists

2. Existing active custom account, no `main`:
   - insert a custom account such as `iniwa` with `is_active=True`
   - seed succeeds
   - custom account remains active
   - its display name, initial VR, current VR, and sort order remain unchanged
   - `main` is created inactive
   - exactly one active account exists

3. Repeated seed after case 2:
   - second seed succeeds
   - no duplicate `main`
   - custom account remains the only active account
   - all account values remain unchanged

4. Existing inactive `main` plus another active account:
   - seed succeeds
   - `main` stays inactive
   - existing active account stays active
   - no user-managed values are overwritten

Use the existing SQLite-backed test infrastructure, including its partial unique-index behavior.

### Scope Check

Confirm the change does not alter:

- course, map-point, or route upsert behavior
- account activation API behavior
- migration/schema/index definitions
- Time Attack data
- ranked/Lounge records

## Constraints

- Do not add dependencies.
- Do not change the VR account schema, migration, unique index, or API.
- Do not delete or rename the `main` seed account.
- Do not deactivate an existing account.
- Do not overwrite existing VR account values.
- Do not modify frontend files.
- Do not modify Docker, Portainer, GHCR, workflow, ports, credentials, `.env`, or external exposure.
- Do not touch the live Pi in this implementation handoff.
- Do not commit or push unless a later publication handoff explicitly authorizes it.

## Non Goals

- No account merge or rename logic.
- No automatic selection changes in `app_settings`.
- No cleanup of existing accounts.
- No Time Attack changes.
- No deployment.

## Verification

Run:

```sh
cd backend
python -m pytest -q
python -m py_compile app/seed/initial_data.py
```

Also run:

```sh
git diff --check
```

## Expected Report

- Changed files
- Exact seed behavior implemented
- Tests added
- Full pytest result
- Python compilation result
- Verification results
- Files changed outside the allowed scope
- Blocked checks
- Design questions for Codex
