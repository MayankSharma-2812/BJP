# 03 — Technical Requirements Document (TRD)

## 1. System architecture

A modular monolith with three trust zones:

1. **Browser trust zone:** plaintext vault content, passphrase entry, key derivation, encryption/decryption, Shamir split/combine, recovery cards, OCR if added later.
2. **Application/API trust zone:** authentication checks, authorization, state machine, scheduling, email triggers, rate limiting and audit-event creation. It never receives vault plaintext, the raw DEK or shares.
3. **Database trust zone:** ciphertext envelope, wrapped DEK, KDF parameters, owner/nominee metadata, check-in deadlines, recovery state, approvals and non-secret audit events.

```text
Owner browser
  ├─ plaintext asset form ──> encrypt with AES-256-GCM ──> ciphertext envelope ──> Next.js API ──> PostgreSQL
  ├─ passphrase ──> scrypt KDF ──> KEK ──> wraps DEK in browser ──> wrapped DEK saved
  └─ DEK bytes ──> Shamir split 2-of-3 ──> three recovery cards shown/exported locally

Nominee browser(s) ── authenticated approval only ──> Next.js API ──> PostgreSQL

Recovery browser:
  ciphertext envelope + wrapped DEK (not enough alone without passphrase/shares)
  + two valid recovery cards ──> combine shares locally ──> DEK ──> AES-GCM decrypt locally
```

## 2. Data flow rules

- Plaintext inventory fields are assembled in browser memory only.
- Encryption/decryption functions are imported only by client-side modules.
- API routes accept/return envelope fields; they must never accept a `plaintextAsset`, `rawKey`, `share`, or `passphrase` parameter.
- Recovery cards are generated in the browser and never sent to the backend, analytics, logs or a database.
- Share combination and decryption happen in the same browser context. Only the approval status is server-side.
- Vault details are not placed in URL query strings, page titles, error reports, browser console logs or analytics.
- Use `Cache-Control: no-store` on protected vault, recovery and account responses.

## 3. Cryptographic envelope

### Encrypted payload envelope

```json
{
  "schemaVersion": 1,
  "cryptoVersion": 1,
  "algorithm": "AES-256-GCM",
  "nonce": "base64url-encoded-12-byte-nonce",
  "aadVersion": 1,
  "ciphertext": "base64url-encoded-ciphertext-with-authentication-tag"
}
```

AAD should bind at least `vaultId`, `cryptoVersion`, `schemaVersion`, and a fixed context such as `last-mile:vault-payload`. AAD is not secret. Validate envelope sizes before decoding. Use UTF-8 JSON serialization with schema validation after decryption.

### Wrapped data key

```json
{
  "wrapVersion": 1,
  "kdf": "scrypt",
  "kdfParams": { "N": 131072, "r": 8, "p": 1, "dkLen": 32 },
  "salt": "base64url-encoded-random-salt",
  "algorithm": "AES-256-GCM",
  "nonce": "base64url-encoded-fresh-12-byte-nonce",
  "wrappedDek": "base64url-encoded-ciphertext-with-tag"
}
```

These are starting parameters; run benchmarks and pin a justified setting before release. Include key-wrap context in AAD (vault ID and wrap version). Do not reuse the vault payload nonce for key wrapping.

### Key handling sequence

1. Generate a random 32-byte DEK in the browser using the cryptographic random generator.
2. Derive a 32-byte KEK from passphrase + random salt using scrypt.
3. Wrap the DEK under KEK with AES-GCM and a unique nonce.
4. Encrypt the full structured payload under DEK with a different fresh nonce and context-bound AAD.
5. Split DEK with the reviewed Shamir library, 3 shares, threshold 2.
6. Export three recovery cards; never transmit their bytes.
7. Save only encrypted payload and wrapped key envelope.
8. Clear references to plaintext, passphrase, DEK bytes, KEK bytes and shares after use as best effort. Do not claim guaranteed zeroization.

The owner unlocks by deriving KEK, unwrapping DEK, and decrypting locally. Recovery can reconstruct DEK from two shares without the owner passphrase, then decrypt locally. Both paths must verify AES-GCM authentication before presenting data.

## 4. Recovery-card format

A card should encode a versioned JSON payload with a checksum for user-error detection, not secrecy by itself:

```json
{
  "format": "last-mile-recovery-card",
  "formatVersion": 1,
  "vaultId": "opaque UUID",
  "shareIndex": 1,
  "threshold": 2,
  "totalShares": 3,
  "share": "base64url share bytes",
  "createdAt": "ISO timestamp for human reference only"
}
```

Do not interpret a checksum as authentication. The recovery card must be treated like a secret. Print/download each card individually; don't display all cards in one shared screenshot. The vault ID binds the card to the right vault. The app must reject different vault IDs, duplicate share indices, malformed cards and fewer than two shares. After combination, authenticated decryption is the definitive integrity check.

## 5. State machine and time authority

Authoritative state transitions occur in server-side domain logic and are persisted transactionally. The browser can request an action, but cannot set `state`, `lastCheckInAt`, `unlockAt`, `coolingOffEndsAt`, `approvedCount` or a time used to authorize a transition.

The scheduler advances due transitions based on database/server time. A demo-only endpoint may advance a simulated clock, but it must require both a server-side demo flag and non-production environment. The production scheduler must be designed so a missed scheduler run delays recovery rather than unlocking early.

## 6. Server/API security

- Authn: validate Supabase session in each protected route.
- Authz: verify owner or active nominee relation server-side for every route.
- Input: runtime schema validation; strict enums; size and content-type limits.
- State: transition function checks allowed previous state and server time; use transactions/row locks or equivalent atomicity.
- Idempotency: retries return the prior result or fail harmlessly; use unique constraints.
- Rate limiting: distributed limit for invitation, approval, recovery attempt and state-changing endpoints.
- CSRF: use current framework/session protections for cookie-authenticated mutating routes; validate origin where appropriate.
- XSS: render asset fields as text, never injected HTML; Content Security Policy and minimal third-party scripts.
- Logging: only request ID, event type, outcome, coarse timing and opaque IDs as necessary; redact auth and crypto material.
- Errors: do not indicate whether a specific vault, nominee email or share is valid beyond what the authenticated workflow requires.

## 7. Performance/scaling

Initial load is tiny and primarily user-driven. Keep one PostgreSQL primary. Use indexes for policy predicates. Keep crypto work in browser; if scrypt blocks the main thread, move it to a Web Worker, show progress and allow cancellation. Avoid encrypting individual fields separately; encrypt one versioned payload to reduce nonce/key management complexity for MVP.

CDN is for immutable static bundles and public media only. Protected API responses and plaintext views must not be cached. Use a distributed rate limiter if deployment scales to multiple instances. Do not add sharding, partitioning, a message broker or multi-region writes unless metrics prove a need.

## 8. Observability

Capture:
- transition event IDs, source state, destination state, server timestamp, actor ID (if authorized), request ID, and outcome;
- scheduler heartbeat and lag;
- rate-limit blocks and validation failures;
- latency and error rate for APIs;
- audit-chain verification results.

Never capture asset payloads, passphrases, raw keys, share data, encrypted private material generated for users, session tokens or full invite tokens.

## 9. Deployment requirements

- HTTPS-only and secure cookies.
- Separate development and production Supabase projects or clearly separated environments.
- Environment variables documented in `.env.example` without real values.
- Supabase service/secret key server-only; use public/publishable key only where appropriate.
- Security headers including a tailored CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` or a deliberately justified equivalent, and `frame-ancestors 'none'` unless embedding is required.
- Migrations tracked in Git.
- CI checks run on every push/PR.
- No real user data during the hackathon.

## 10. Production-readiness gap

Before real deployment, obtain an independent security review, review legal and privacy obligations, test backup/restore and key rotation, design recoverable nominee key distribution, implement reliable production scheduling and notification delivery, define account deletion/data retention, review accessibility, and conduct an incident-response tabletop. The hackathon MVP must not be promoted as safe for real financial records.
