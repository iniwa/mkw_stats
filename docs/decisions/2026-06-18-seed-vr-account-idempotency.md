# 2026-06-18: Preserve the active VR account during seed

## Context

The Time Attack Pi deployment ran `python -m app.seed.initial_data` after migration.

The production database had an active user-created VR account named `iniwa`, but did not have the seed account named `main`. The seed attempted to insert `main` with `is_active=True` and violated the partial unique index `uq_vr_accounts_single_active`.

The transaction rolled back without data loss, but this contradicts the documented rule that the seed is safe and idempotent.

## Decision

The seed account `main` is a default for empty installations, not an authority over the user's active-account selection.

When `main` does not exist:

- create it as active only if no active VR account exists
- create it as inactive if another active VR account already exists

When `main` already exists:

- do not overwrite its `is_active`, VR values, display name, or other user-managed fields

Running the seed must preserve the currently active account and must not alter existing VR account state.

## Reason

The seed should safely add missing master/default data to both fresh and established databases. A default account must not displace or conflict with a user's configured account.

## Constraints Introduced

- An empty database still receives one active `main` account.
- A database with an existing active account may receive an inactive `main` account if it is missing.
- Repeated seed runs must leave exactly one active account and preserve its identity.
- Seed tests must cover an existing active non-seed account with no `main` row.

## Do Not Change Casually

Do not make seed execution reset active-account selection, `current_vr`, `initial_vr`, account names, or display names.
