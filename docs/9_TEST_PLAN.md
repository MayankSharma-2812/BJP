# 11 — Test Plan

## 1. Test levels

- **Unit:** crypto-envelope helpers, recovery-card parser, domain state machine, audit-chain functions, validation schemas.
- **Integration:** API routes + Postgres transactions/RLS + auth authorization.
- **E2E:** owner setup, asset entry, lock/unlock, demo clock, approvals, cancellation, share import and recovery.
- **Security regression:** unauthorized access, secret leakage, malformed inputs, rate limiting, cache headers and race conditions.

## 2. Crypto tests

- Random key has expected length and is not constant across runs.
- AES-GCM encrypt/decrypt round-trip preserves a known synthetic payload.
- Ciphertext tampering fails authentication.
- Wrong key fails.
- Wrong nonce/AAD/vault ID fails.
- Wrapped DEK round-trip works with the same passphrase/salt/parameters.
- Wrong passphrase fails to unwrap/authenticate.
- Changing KDF parameters or wrap AAD causes failure.
- KDF parameters are bounded server-side; absurd N/r/p values are rejected before expensive work.
- 2-of-3 shares reconstruct the original DEK.
- Each valid pair among three shares reconstructs the same DEK.
- One share cannot be passed to combine as a valid 2-of-3 set.
- Duplicate share index is rejected before combine.
- Share from a different vault is rejected.
- Malformed or truncated recovery card is rejected.
- A corrupted share either fails reconstruction verification/decryption or is rejected; no plaintext is shown on failure.
- Data buffers are not written to localStorage/sessionStorage/IndexedDB.

## 3. State-machine tests

- `ACTIVE` does not start recovery before server-side due time.
- A check-in before deadline resets `next_checkin_at`.
- A check-in during grace returns to active according to policy.
- Grace expiry enters `RECOVERY_PENDING`, not `RECOVERY_READY`.
- One distinct approval does not start cooling-off.
- Two distinct approvals start cooling-off once.
- Duplicate approval by same nominee counts once.
- A revoked nominee cannot approve.
- A nominee from another vault cannot approve.
- A decline does not count toward the threshold.
- Owner cancellation during cooling-off returns to active and invalidates the request.
- A cancellation request racing the cooldown expiry is serialized; the result follows the commit order and policy, never early unlock.
- Recovery cannot begin before `RECOVERY_READY`.
- Expired recovery session is rejected.
- Client-supplied old/future timestamp and requested state are ignored/rejected.
- Scheduler duplicate execution is idempotent.
- Database outage/scheduler error never advances release early.
- Demo clock route is blocked when production settings are active.

## 4. Authorization / RLS tests

For every exposed table, test SELECT/INSERT/UPDATE/DELETE for:
- unauthenticated user;
- authenticated non-owner;
- vault owner;
- active nominee for that vault;
- nominee for another vault;
- revoked nominee;
- service role only inside server environment.

Verify both grants and RLS policies. Test direct Supabase client access, not only application routes. Verify service/secret credentials never appear in client bundles.

## 5. API/security tests

- Oversized ciphertext payload returns a safe validation error.
- Unexpected JSON fields are rejected, especially `plaintext`, `passphrase`, `share`, `rawKey`, `state`, `approvedCount`, `ownerId`, and timestamps.
- Authenticated responses include `Cache-Control: no-store` where sensitive.
- Invalid origin/CSRF cases are blocked according to the selected framework strategy.
- Rate limits return 429 with safe retry guidance.
- Retry of idempotent request does not duplicate state transitions/audit events.
- Invite tokens are high entropy, expire, are single-use, stored hashed and absent from logs.
- Logs and audit metadata do not contain asset names, plaintext instructions, passphrase, key bytes, share bytes, access tokens or full invite tokens.
- Error output contains no stack trace, SQL detail or crypto internals.

## 6. Audit log tests

- Event canonicalization is deterministic.
- New event uses previous hash and increments sequence.
- Editing an event breaks verification.
- Reordering or removing an event breaks verification against the known prior head/checkpoint.
- Rewriting the whole chain without an external checkpoint may verify; tests/docs must explain this limitation rather than falsely pass it as immutable.
- Secret fields are not accepted in event metadata.

## 7. E2E acceptance scenario

1. Sign in as owner with synthetic account.
2. Create vault and export three recovery cards.
3. Create two or three synthetic asset entries.
4. Inspect network request and database row: only envelope, wrapped key and metadata are present.
5. Lock and unlock with correct passphrase; verify wrong passphrase fails.
6. Advance demo clock through due/grace; recovery becomes pending.
7. Approve as nominee A; count is 1/2.
8. Repeat approval as nominee A; count remains 1/2.
9. Approve as nominee B; cooling-off begins.
10. Run owner cancellation; state returns to active and recovery can't proceed.
11. Start a second demo cycle; two approvals and cooldown move to ready.
12. Import any two valid share cards; vault decrypts in browser.
13. Try one share, duplicate share, mismatched vault share and corrupted ciphertext; each fails without showing plaintext.
14. Verify audit chain and demonstrate which metadata remains visible.
15. Run `lint`, typecheck, unit/integration tests and production build from a clean checkout.
