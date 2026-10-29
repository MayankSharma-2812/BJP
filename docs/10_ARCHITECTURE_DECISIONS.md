# 12 — Architecture Decision Records

## ADR-001: Modular monolith over microservices

**Decision:** Next.js App Router with server route handlers and shared domain modules.  
**Reason:** Two developers, one primary web client, low request volume and a 24-hour sprint. A single deployment lowers coordination and operational risk.  
**Consequences:** Keep module boundaries explicit; split into a separate API only if later requirements or measurements justify it.

## ADR-002: Client-side encryption before upload

**Decision:** Browser encrypts the complete vault payload using AES-256-GCM. The API accepts only ciphertext envelopes.  
**Reason:** This is the product's core privacy boundary. Web Crypto provides browser-supported crypto operations and GCM authentication.  
**Consequences:** No server-side search over encrypted asset details, no server-side previews, and no plaintext analytics. UI must handle local unlock/lock. Deploying malicious client code remains a residual threat.

## ADR-003: Split the DEK, not the passphrase

**Decision:** Generate a random DEK and split the DEK into three shares with a threshold of two. Use a passphrase-derived KEK only to wrap the DEK for the owner's routine unlock.  
**Reason:** A uniformly random high-entropy key is appropriate for Shamir sharing; a human passphrase is not.  
**Consequences:** Normal owner access requires passphrase; recovery can use two shares. Losing two shares and the passphrase means the vault is unrecoverable.

## ADR-004: Recovery cards are out-of-band in the MVP

**Decision:** Generate three recovery cards in the browser and do not store any share bytes on the server. Nominees approve through the app; recovery participants bring two cards to the recovery browser.  
**Reason:** Avoid creating a custom encrypted messaging protocol under hackathon pressure and keep the server outside the share-custody boundary.  
**Consequences:** Recovery is less seamless; the app needs strong instructions, separate distribution and duplicate/mismatched card handling. A future remote recovery protocol requires a vetted HPKE design and a new threat review.

## ADR-005: Supabase Auth/Postgres with explicit RLS

**Decision:** Use Supabase for auth and PostgreSQL; enable RLS and deliberately configure grants and policies.  
**Reason:** It reduces setup and gives relational constraints/transactions for approval uniqueness/state changes.  
**Consequences:** Must test direct table access and maintain migrations; never expose service/secret keys in the browser.

## ADR-006: scrypt for passphrase KDF

**Decision:** Use scrypt from `@noble/hashes`, with a salted, versioned, benchmarked configuration.  
**Reason:** Passphrase-based wrapping requires a KDF; scrypt is memory-hard. The upstream noble-hashes documentation says its Argon2 implementation was outside its independent audit scope, so do not cite the package's general audit claim as an Argon2 audit.  
**Consequences:** Browser performance needs measurement; tune with a documented security/performance rationale and store parameters so future versions can migrate.

## ADR-007: Hash-chained audit history, not “immutable log”

**Decision:** Store sequential events with previous hash and SHA-256 event hash; provide a verifier.  
**Reason:** It creates a clear visible integrity demonstration without introducing blockchain or external infrastructure.  
**Consequences:** An unanchored chain in a single mutable database can be rewritten by a privileged attacker. Production assurance needs independently retained checkpoints or an external anchor.

## ADR-008: One database primary; no sharding/partitioning initially

**Decision:** Start with one PostgreSQL primary, indexes, transactions, and stateless app instances.  
**Reason:** Current scale doesn't justify distributed writes or partition management.  
**Consequences:** Monitor workload; partition high-volume audit records or introduce read replicas only from measured need. Keep state transitions authoritative and serialized.

## ADR-009: Demo clock is server-gated

**Decision:** The simulated clock is only available in development/demo mode and cannot accept an arbitrary client time in production.  
**Reason:** Real recovery timelines are safety-critical; a front-end-only clock is not an acceptable authority.  
**Consequences:** Demonstration is fast but visually labelled as simulation; production workflow needs a reliable scheduler.

## ADR-010: OCR is post-MVP

**Decision:** Do not include OCR in the initial critical path. If added later, perform extraction locally in a worker and encrypt results before persistence.  
**Reason:** OCR adds privacy, file handling, error and accessibility work without proving the core differentiator.  
**Consequences:** Initial users enter structured data manually. Do not upload documents or extracted text during the hackathon.
