# 05 — Backend Schema and Data Model

This is a logical schema for PostgreSQL/Supabase. Exact SQL migrations should be created during the scaffold phase and reviewed before use. All timestamps are UTC `timestamptz`; IDs are UUIDs unless specified. Database column names use `snake_case`.

## 1. Design principle

The database stores only the minimum required operational metadata and ciphertext. The complete encrypted asset inventory is one versioned JSON payload to keep the cryptographic model manageable. **No table may store passphrases, plaintext assets, raw DEKs, Shamir shares, or recovery-card contents.**

## 2. Tables

### `profiles`

| Column | Type | Rules |
|---|---|---|
| `user_id` | `uuid` PK, FK to `auth.users(id)` | Exactly one profile per auth user. |
| `display_name` | `text` nullable | Display-only, length limited. |
| `locale` | `text` default `'en'` | Allowlist supported values. |
| `created_at` | `timestamptz` | Server default. |
| `updated_at` | `timestamptz` | Server maintained. |

No sensitive vault contents belong in this table.

### `vaults`

| Column | Type | Rules |
|---|---|---|
| `id` | `uuid` PK | Opaque vault ID. |
| `owner_id` | `uuid` FK `profiles.user_id` | Index; one active owner for MVP. |
| `status` | enum/text with CHECK | Only valid workflow states. |
| `schema_version` | `int` | Positive. |
| `crypto_version` | `int` | Positive; allows future migration. |
| `payload_ciphertext` | `bytea` or `text` base64url | Ciphertext only, max size enforced. |
| `payload_nonce` | `bytea` | Exactly 12 bytes for AES-GCM. |
| `payload_aad_version` | `int` | Positive. |
| `wrapped_dek` | `bytea` or text base64url | AES-GCM-wrapped DEK ciphertext only. |
| `wrap_nonce` | `bytea` | Exactly 12 bytes; distinct from payload nonce. |
| `kdf_name` | `text` | MVP expects `scrypt`; allowlisted. |
| `kdf_params` | `jsonb` | Validated fixed schema and hard upper bounds. |
| `kdf_salt` | `bytea` | Random salt; not secret. |
| `checkin_interval_seconds` | `int` | Server validated limits; demo values only when demo flag enabled. |
| `last_checkin_at` | `timestamptz` | Server-owned. |
| `next_checkin_at` | `timestamptz` | Server-owned, computed from interval. |
| `grace_ends_at` | `timestamptz` nullable | Server-owned. |
| `cooling_off_ends_at` | `timestamptz` nullable | Server-owned. |
| `unlock_expires_at` | `timestamptz` nullable | Server-owned. |
| `revision` | `bigint` default 1 | Optimistic concurrency/version field. |
| `created_at` | `timestamptz` | Server default. |
| `updated_at` | `timestamptz` | Server maintained. |

If payload size makes `bytea` inconvenient for browser transport, base64url text is acceptable for the MVP but has overhead. Use an explicit maximum, not an unlimited field.

### `nominees`

| Column | Type | Rules |
|---|---|---|
| `id` | `uuid` PK | |
| `vault_id` | `uuid` FK `vaults.id` | Index. |
| `user_id` | `uuid` FK `profiles.user_id` nullable | Null until invite is accepted. |
| `email` | `citext`/normalized text | Operational metadata visible to service; normalize and minimize. |
| `display_name` | `text` | Non-sensitive display label; length limited. |
| `share_index` | `smallint` | Unique per vault; values 1..3. This is only an index, not share bytes. |
| `invite_token_hash` | `bytea` nullable | Hash of a high-entropy invitation token; raw token appears once in delivery URL only. |
| `invite_expires_at` | `timestamptz` nullable | Server-owned. |
| `invite_accepted_at` | `timestamptz` nullable | Server-owned. |
| `status` | enum/text | `pending`, `active`, `revoked`. |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

Constraints: unique `(vault_id, share_index)`; exactly three active nominees for a recovery-enabled vault. Do not store share strings, QR payloads or share checksums derived from secret bytes.

### `recovery_requests`

| Column | Type | Rules |
|---|---|---|
| `id` | `uuid` PK | |
| `vault_id` | `uuid` FK `vaults.id` | Index. |
| `status` | enum/text | `pending`, `cooling_off`, `ready`, `cancelled`, `expired`. |
| `started_at` | `timestamptz` | Server-owned. |
| `cooling_off_ends_at` | `timestamptz` nullable | Server-owned. |
| `unlock_expires_at` | `timestamptz` nullable | Server-owned. |
| `cancelled_at` | `timestamptz` nullable | Server-owned. |
| `cancelled_by` | `uuid` nullable | Authenticated owner only. |
| `revision` | `bigint` default 1 | Concurrent transition guard. |
| `created_at` | `timestamptz` | |

Enforce no overlapping active recovery requests per vault via a partial unique index or transaction logic. Do not use client-supplied timestamps.

### `recovery_approvals`

| Column | Type | Rules |
|---|---|---|
| `id` | `uuid` PK | |
| `recovery_request_id` | `uuid` FK `recovery_requests.id` | |
| `nominee_id` | `uuid` FK `nominees.id` | |
| `decision` | enum/text | `approve` or `decline`. |
| `created_at` | `timestamptz` | Server-owned. |
| `request_id` | `uuid` nullable | Idempotency key if used. |

Constraints: unique `(recovery_request_id, nominee_id)` so a nominee counts once; validate the nominee belongs to the same vault and is active. Consider storing a final decision as immutable rather than updating repeatedly.

### `audit_events`

| Column | Type | Rules |
|---|---|---|
| `id` | `uuid` PK | |
| `vault_id` | `uuid` FK `vaults.id` | Index by `(vault_id, sequence)`. |
| `sequence` | `bigint` | Monotonically increasing per vault, allocated transactionally. |
| `event_type` | enum/text allowlist | Examples: `vault_created`, `payload_updated`, `checkin_recorded`, `state_transitioned`, `nominee_approved`, `recovery_cancelled`, `recovery_ready`, `client_reported_recovery_complete`. |
| `actor_user_id` | `uuid` nullable | Only when relevant. |
| `server_time` | `timestamptz` | Server-owned. |
| `event_metadata` | `jsonb` | Strict allowlist; IDs/status/versions only; no free-form private details. |
| `previous_hash` | `bytea` or hex text | Previous event hash. Genesis uses a documented sentinel. |
| `event_hash` | `bytea` or hex text | SHA-256 of canonical event fields and previous hash. |
| `request_id` | `uuid` nullable | Request correlation. |

The hash chain provides tamper evidence if a previously trusted head/checkpoint is retained and compared. A hash chain stored only in one mutable database is not proof against an administrator who rewrites the complete chain. For MVP, say “tamper-evident audit history,” not “immutable audit log.”

### Optional `notification_outbox` (only if needed)

Use an outbox for reminder delivery if email is implemented. Store event IDs and recipient IDs, not payloads or keys. Tokens must be high-entropy, single-use, expiring, hashed at rest and excluded from logs. If email delivery threatens the core sprint, skip email and show an in-app state timeline.

## 3. RLS and grants

- `profiles`: signed-in user can read/update only their own row.
- `vaults`: owner can read/update their own row; writes should go through server-side validated operations when they affect state or envelope fields. Do not allow broad client updates to state/deadlines.
- `nominees`: owner can manage their own vault's nominee rows; nominee can read only the rows needed for their accepted invite/recovery workflow. Do not expose all nominees across vaults.
- `recovery_requests`: owner and eligible nominees can read the minimal request status for that vault; only server-side domain logic can transition statuses.
- `recovery_approvals`: nominee can create one decision for themselves on a permitted request; owner sees aggregate/current approvals as needed. Use server-side ownership checks in addition to RLS where appropriate.
- `audit_events`: read policy scoped to owner and current eligible nominees; inserts should be server controlled. Never allow clients to backfill arbitrary sequence/hash values.
- `anon`: no table access unless a narrowly scoped invite exchange explicitly requires it.
- Never expose service/secret role credentials to the client.

For each table, explicitly review grants as well as policies and test SELECT/INSERT/UPDATE/DELETE allowed and denied combinations. Supabase's current RLS guide recommends database tests for each operation and warns that adding policies does not remove pre-existing grants.

## 4. Required indexes and constraints

- `vaults(owner_id)`.
- `nominees(vault_id, status)` and unique `(vault_id, share_index)`.
- `recovery_requests(vault_id, status)` and an index for due transitions.
- Unique `recovery_approvals(recovery_request_id, nominee_id)`.
- `audit_events(vault_id, sequence)` unique and composite for chain retrieval.
- Check constraints on allowed statuses, nonce length, KDF name/parameters, share index and payload size.

## 5. Database transaction patterns

- **Record check-in:** lock or compare-and-swap vault row; verify owner; update last/next check-in and state atomically; append audit event in same transaction.
- **Approve recovery:** verify request pending, nominee active, not the owner unless explicitly allowed, and approval not previously recorded; insert approval and count distinct rows within a transaction; when count reaches two, set cooling-off deadline and transition once.
- **Cancel recovery:** lock vault/request row; verify owner session and re-authentication/passphrase confirmation client flow; ensure state still permits cancellation; cancel request and reset state atomically.
- **Advance scheduler:** select due workflows using row locks/skip locked or an equivalent serialized approach; evaluate current state + server time; transition and append audit event atomically.
- **Save encrypted vault payload:** owner auth + runtime validation; optimistic revision check to prevent lost updates; no plaintext accepted.

## 6. Deletion and retention

For MVP, a vault deletion must delete ciphertext and operational metadata after an explicit confirmation and audit tombstone if required. The app cannot erase copies of previously exported recovery cards. Production retention, backups and account-deletion implications require a separate policy. Do not promise “perfect erasure” from backups or devices.
