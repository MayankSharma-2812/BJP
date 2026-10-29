# 06 — API Contract (Logical)

These are logical routes, not final framework filenames. Exact route handlers should be created during scaffolding and reviewed against current Supabase/Next.js APIs. Every protected route validates a session, checks authorization, validates payload and rate-limits sensitive actions.

## General conventions

- JSON requests and responses unless a documented binary transport is needed.
- Return consistent error shape: `{ "error": { "code": "...", "message": "Safe user-facing text", "requestId": "..." } }`.
- Never return raw stack traces, SQL errors, plaintext vault content, keys, share bytes or secret tokens.
- Require a request/idempotency key for retry-prone state mutations where applicable.
- Reject oversized payloads and unsupported content types.
- Sensitive responses use `Cache-Control: no-store`.
- Do not accept owner ID, approval count, server timestamps, state or deadlines from clients as authority.

## Logical endpoints

### `POST /api/vaults`

Create a vault envelope.

Request contains only validated envelope material and non-secret configuration: payload ciphertext/nonce/versions, wrapped DEK/nonce/KDF salt/parameters, and requested check-in interval. It must not accept plaintext, passphrase, DEK or share material.

Server derives owner from the authenticated session; validates sizes/version/nonce/KDF parameter bounds; creates vault in `ACTIVE`; sets initial deadlines from server time; adds genesis audit event.

### `GET /api/vaults/:vaultId`

Return the encrypted payload envelope and the minimum operational state the authorized owner needs. For nominees, use a separate restricted response containing request status only; don't return owner key-wrap metadata unless recovery policy requires it.

### `PUT /api/vaults/:vaultId/envelope`

Update encrypted payload and wrapped DEK after owner authorization. Require expected `revision` to avoid lost updates. State and deadlines cannot be altered through this endpoint. Log only metadata/version/size.

### `POST /api/vaults/:vaultId/check-in`

Record a check-in for the owner. Idempotent within a short retry window. Compute all times on server. Append audit event in the same transaction.

### `POST /api/vaults/:vaultId/nominees`

Create or update nominee roster. Require exactly three distinct nominee slots before enabling recovery. Rate-limit invite creation. If using an invitation token, generate high entropy, deliver once, store only a hash and expiry, and redact token from logs.

### `POST /api/invites/accept`

Accept a valid unexpired invite for the signed-in user. Verify token hash and intended identity, mark accepted atomically, and avoid revealing whether arbitrary email addresses exist.

### `POST /api/vaults/:vaultId/recovery-requests`

Open or get the current recovery request only when the server-side deadline/grace conditions are met. The client cannot pass a custom time or force `RECOVERY_PENDING`. Duplicate calls return the current active request.

### `POST /api/recovery-requests/:requestId/decision`

Request body: `{ "decision": "approve" | "decline", "idempotencyKey": "UUID" }`.

The authenticated user must map to one active nominee for the request's vault. Unique constraint ensures one decision per nominee. The server recomputes the distinct approval count transactionally. Share data is not accepted in the request.

### `POST /api/recovery-requests/:requestId/cancel`

Owner-only, permitted only during policy-defined state/cooldown. Require recent authentication and a client-side passphrase re-unlock before this request; never send the passphrase itself. The server verifies the authenticated owner and current state, transitions atomically, invalidates pending sessions and appends audit event.

### `GET /api/recovery-requests/:requestId/session`

Authorized nominee or owner gets state, server-calculated expiry and the encrypted payload envelope after `RECOVERY_READY`. Does not receive shares or plaintext. Set no-store headers.

### `POST /api/recovery-requests/:requestId/client-completion`

Optional client report that local decryption succeeded. Record as `client_reported_recovery_complete`; do not claim server-verified success. Do not accept the key, plaintext or share bytes. May be omitted in the MVP.

### `POST /api/internal/advance-workflows`

Production scheduler-only entry point or equivalent server-side job. Authenticated via a server-only secret or private job mechanism; no browser callers. Advances due states using server/database time, transactional row locking and audit writes. Never accept an arbitrary timestamp.

### `POST /api/dev/demo-clock`

Development/demo only. Disabled in production unless a separate explicit non-production setup is used. Advances simulated time or to next due transition for a synthetic vault. Must be server-gated; never changes global production time or accepts unbounded time jumps.

### `GET /api/vaults/:vaultId/audit`

Returns the minimal audit sequence and chain fields for an authorized viewer. No vault content, share data or sensitive free-form details. Client can verify the hash chain against retained prior heads/checkpoints. Use pagination by sequence if needed.

## Error codes

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND` (use carefully to avoid enumeration)
- `VALIDATION_FAILED`
- `PAYLOAD_TOO_LARGE`
- `INVALID_STATE_TRANSITION`
- `RECOVERY_NOT_READY`
- `RECOVERY_WINDOW_EXPIRED`
- `DUPLICATE_DECISION`
- `RATE_LIMITED`
- `REVISION_CONFLICT`
- `INVITE_INVALID_OR_EXPIRED`
- `INTERNAL_ERROR`

## Rate limits

Use a distributed limiter on invite creation, recovery request creation, approval/decline, login recovery-adjacent calls and any code that can trigger a notification. Set limits conservatively and provide `Retry-After` where appropriate. These are application controls, not a substitute for database constraints, authentication or abuse monitoring.
