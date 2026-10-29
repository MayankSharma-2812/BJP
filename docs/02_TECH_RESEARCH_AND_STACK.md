# 02 — Technical Research and Stack Decision

**Research date:** 29 October 2026. Re-check versions, deployment limits and advisories immediately before installing.

## Executive decision

Use a **modular monolith** with **Next.js App Router + TypeScript**, **Supabase Auth + PostgreSQL + Row Level Security**, browser **Web Crypto API AES-256-GCM**, `shamir-secret-sharing` from Privy for 2-of-3 recovery, and `@noble/hashes` scrypt for passphrase-based key wrapping after a browser performance test. Use a shared distributed rate limiter such as Upstash only where deployment requires it; do not rely on an in-memory limiter in horizontally scaled serverless functions.

This is the best tradeoff for a two-person team because it provides a production-shaped full-stack architecture without splitting the app into unnecessary services. Security comes from explicit trust boundaries, correct crypto usage, server-side authorization and tests—not from the number of technologies in the stack.

## 1. Stack

| Layer | Choice | Why | Guardrails |
|---|---|---|---|
| Language | TypeScript strict mode | Shared types, safer refactors, good Next.js support. | Runtime-validate every API request; TypeScript types do not validate hostile input. |
| App/UI | Next.js App Router, React | Routes, layouts, server components and route handlers in one deployable app. Official docs describe the App Router and route handlers. | Keep vault decryption in client components/modules; do not server-render plaintext vault values. |
| Styling | Tailwind CSS + accessible component primitives | Fast iteration with consistent design tokens and responsive layouts. | Add the final component library only after checking compatibility; avoid installing large UI kits unnecessarily. |
| Auth | Supabase Auth via supported SSR/client pattern | Saves time on account/session handling; PostgreSQL identity can protect rows. | Follow current Supabase SSR guidance; keep secret/service keys server-only. The SSR package is documented as beta in the current docs, so pin and test its version. |
| Database | Supabase PostgreSQL | Relational constraints, transactions, indexes, unique approval constraints, and RLS. | RLS and grants are mandatory on all exposed tables; test denied paths. Never assume enabling policies alone revokes existing grants. |
| Vault content crypto | Browser Web Crypto API: AES-256-GCM | Browser-native authenticated encryption; GCM verifies tampering as well as confidentiality. | Unique random 96-bit nonce for every encryption under a given key; never reuse; include version/record context as AAD. |
| Key sharing | `shamir-secret-sharing` (Privy) | TypeScript, browser support, zero dependencies; project describes independent Cure53 and Zellic audits. | Pin exact version; read audit reports; test combine behavior; library does not verify reconstructed secret integrity by itself. Verify decryption/authentication after combining. |
| Passphrase KDF | scrypt from `@noble/hashes` | Memory-hard KDF; project describes independent audit scope that excludes Argon2, so use scrypt rather than assuming its Argon2 implementation was audited. | Start with OWASP-aligned baseline parameters `N=2^17, r=8, p=1`; benchmark real target devices and avoid freezing params until unlock latency is acceptable. Store salt and KDF version/parameters. |
| Validation | Zod or equivalent runtime schema | Reject malformed payloads before state changes or database writes. | Enforce payload size limits, enum allowlists and strict parsing. |
| Tests | Vitest + React Testing Library + Playwright | Unit tests for crypto/state machine, component tests and browser E2E. | Test crypto with synthetic fixtures only; run CI on each PR. |
| CI | GitHub Actions | Reproducible lint, typecheck, unit test and build checks. | Never add secret values to workflow logs; use minimal permissions. |
| Hosting | A Next.js-compatible host; Supabase hosted database/auth | Simple deploy topology. | Verify current free-tier limits before the event; don't promise free production service levels. Use HTTPS only. |
| Rate limiting | Hosted distributed limiter (e.g. Upstash Ratelimit) for exposed sensitive routes | Serverless instances are horizontally distributed; local counters do not enforce a global limit. | If not configured, fail closed or use a documented low-risk fallback on recovery-sensitive routes; never call an in-memory limiter production-grade. |

## 2. Cryptography findings

### AES-GCM

NIST SP 800-38D specifies GCM as authenticated encryption. MDN recommends authenticated encryption and describes Web Crypto support for AES-GCM. Use a random 256-bit data encryption key (DEK), a fresh 96-bit nonce for every encryption, and 128-bit authentication tag (browser defaults support the standard tag size). Include vault ID, crypto version and payload type as Additional Authenticated Data (AAD), so ciphertext cannot silently be moved between contexts.

### Shamir's Secret Sharing

Privy's `shamir-secret-sharing` package supports `Uint8Array`, browser and Node environments, and independent audits by Cure53 and Zellic. Its own documentation warns that it does not verify reconstruction integrity and that JavaScript cannot guarantee truly constant-time execution. Therefore:

- Split a uniformly random DEK, not a human password.
- Use a threshold of 2 shares out of 3.
- Validate the reconstructed key by attempting AES-GCM decryption; authentication failure must never display partial plaintext.
- Never implement the polynomial math ourselves.
- Pin the package version and keep an SBOM/dependency lockfile.

### Passphrase-derived wrapping key

Scrypt will derive a 256-bit KEK from the vault passphrase and a cryptographically random salt. The KEK wraps the random DEK using AES-GCM with its own fresh nonce and AAD. Store only KDF identifier/parameters, salt, wrapping nonce, and wrapped key. Do not store the passphrase or its raw hash. Benchmark before finalizing because JavaScript memory-hard KDF cost varies by browser/device. If the baseline is too slow, tune only with a documented security/performance rationale; do not silently drop to a fast hash.

### Key generation and memory

Use `crypto.getRandomValues()` or `crypto.subtle.generateKey()` for cryptographic randomness. The raw DEK must be available briefly to the Shamir library, so avoid claiming it is always non-extractable. Import a non-extractable key for routine encrypt/decrypt operations where practical, clear references and byte buffers after use as best effort, and document that JavaScript garbage collection prevents guaranteed zeroization.

### Recovery-card custody

The hackathon MVP generates three individual recovery cards in the browser. They are exported to the owner for separate out-of-band delivery to nominees. **The backend stores no share bytes, not even encrypted ones, in this MVP.** During recovery, the approvals are recorded by the server, while two recovery cards are supplied in the recovery browser and combined there. This is a deliberate scope choice that keeps share distribution understandable and avoids building a new public-key messaging protocol during a hackathon.

For a future version with remote share exchange, evaluate a standard HPKE library and recipient public-key enrolment; do not invent an unaudited ECDH/AES protocol in app code.

## 3. Database and auth findings

Supabase's official RLS guide emphasizes that exposed tables need both correct grants and policies, and recommends tests for allow/deny paths. It warns that adding policies does not revoke existing grants and says secret/service-role keys bypass RLS and must remain server-side.

Required practice:

- Enable RLS on every exposed application table.
- Grant only required operations to roles.
- Use `auth.uid()` and ownership/nominee membership checks in policies or server-side route authorization.
- Add indexes for owner IDs and policy predicates.
- Put schema migrations and RLS tests under version control.
- Do not accept `owner_id`, `role`, `state`, `approved_count`, or timestamps as authoritative client input.

## 4. Scalability and system-design decisions

Do the minimum useful work now:

- **Horizontal scaling:** app routes should be stateless so platform instances can scale independently. Put shared throttling state in Redis/a hosted limiter, not in process memory.
- **Vertical scaling:** monitor before upgrading database compute; don't pre-emptively scale a hackathon's synthetic workload.
- **Indexes:** add indexes on `vaults.owner_id`, `nominees.vault_id`, `recovery_requests.vault_id/status`, `approvals.recovery_request_id`, and `audit_events.vault_id/sequence`.
- **Transactions/constraints:** approval threshold and state transitions must be atomic; unique `(recovery_request_id, nominee_id)` prevents duplicate approval counts.
- **Idempotency:** support request IDs or uniqueness guards for check-ins, approvals and event creation.
- **Rate limiting:** protect sign-in-related recovery, invite creation, approvals and state-transition endpoints.
- **Debouncing:** debounce only local search/filter inputs and OCR text preview; never use debounce as a security boundary.
- **Throttling:** limit repeated check-in, invite, approval and recovery-attempt endpoints server-side.
- **CDN/cache:** CDN can cache public JS/CSS/images only. Do not cache auth responses, ciphertext endpoints unnecessarily, and never cache decrypted content. Sensitive responses should use `Cache-Control: no-store`.
- **Partitioning/sharding:** not needed for MVP. Revisit partitioning only if audit-event volume creates measured query/maintenance pressure. Revisit sharding only with demonstrated single-database limits and a designed key/tenant strategy.
- **CAP theorem:** not a feature checklist. For an MVP, prefer one authoritative PostgreSQL primary for vault and state transitions. Avoid multi-region split-brain complexity; a delayed workflow is safer than an incorrect early release.
- **Background scheduling:** a controlled server-side scheduler must advance real workflows. Demo clock routes are separate and server-gated. If a scheduler is temporarily absent, delayed release is acceptable; early release is not.

## 5. Alternatives considered

| Alternative | Why not choose it now |
|---|---|
| Express/Fastify plus a separate React/Vite frontend | More deployment wiring and duplicated type boundaries without improving the MVP's core security. Reconsider if app complexity or API consumers justify a separate backend. |
| Firebase/Firestore | Can work, but relational integrity, transactional approval uniqueness, migrations and SQL-based RLS testing map naturally to this product. |
| MongoDB | Asset payload is encrypted JSON, but the unencrypted workflow metadata benefits from relational constraints and transactions. |
| Prisma + independently hosted PostgreSQL | Good option, but adds deployment/database provisioning choices. Supabase supplies Postgres and auth together; keep migrations portable where practical. |
| Microservices | More failure modes and interfaces for a two-person team; no measured scaling requirement. |
| Kafka/event streaming | Unjustified volume and operations overhead. A compact transactional audit event table is sufficient. |
| Blockchain | Does not solve secrecy or key custody; unnecessary for a private encrypted vault. |
| Server-side encryption only | The backend would have access to decryption capability, violating the core privacy promise. |
| Store Shamir shares in the database | Even encrypted shares increase key-custody and account-recovery complexity. Offline cards make the hackathon threat model clearer. |
| Argon2 implementation from `@noble/hashes` | The upstream repository's audit scope explicitly excludes its Argon2 code. Prefer its scrypt implementation, subject to exact-version review and performance testing. |

## 6. Must-read source material

1. NIST SP 800-38D — GCM authenticated encryption: https://csrc.nist.gov/pubs/sp/800/38/d/final
2. MDN `SubtleCrypto.encrypt()` — supported browser encryption modes and authenticated-encryption guidance: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt
3. MDN `Crypto.getRandomValues()` — cryptographically strong random values: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
4. Privy Shamir library and security considerations: https://github.com/privy-io/shamir-secret-sharing
5. Privy Shamir package: https://www.npmjs.com/package/shamir-secret-sharing
6. Noble hashes repository, KDFs and audit-scope caveats: https://github.com/paulmillr/noble-hashes
7. OWASP Cryptographic Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
8. OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
9. OWASP Key Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html
10. OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
11. Next.js App Router: https://nextjs.org/docs/app
12. Next.js route handlers: https://nextjs.org/docs/app/getting-started/route-handlers
13. Next.js backend-for-frontend security and rate limiting guidance: https://nextjs.org/docs/app/guides/backend-for-frontend
14. Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
15. Supabase server-side auth: https://supabase.com/docs/guides/auth/server-side
16. Upstash TypeScript rate limiting for serverless environments: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview

## 7. Release/version policy

Do not blindly install `latest` packages in the final sprint. Before adding dependencies, record exact versions, release dates, advisory status, license and audit scope. Use lockfiles and automated dependency alerts. Verify deployment platform free-tier constraints on the actual day of deployment; do not make product architecture depend on a specific free quota.
