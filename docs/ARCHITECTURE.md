# Last Mile: Zero-Knowledge Digital Estate Continuity Vault
## Comprehensive Engineering & Architecture Specification

**Project Name:** Last Mile  
**Version:** 1.0.0 (Production-Ready Hackathon Specification)  
**Authors & Engineering Team:**  
- **Mayank Sharma** — Core Security, Cryptography Engine, State Machine & Backend APIs (Workstream A)  
- **Shyam** — Product Design, Data Foundation, UI Flows & Accessibility Hardening (Workstream B)  
**Repository:** `MayankSharma-2812/BJP`  
**Target Platform:** Web (Node.js 22+, Next.js 16 Turbopack, Modern Web Crypto API)  

---

## 1. Executive Summary & Problem Space

### 1.1 The Unclaimed Digital Wealth Crisis
In India alone, the Reserve Bank of India (RBI) and the Ministry of Corporate Affairs report over **₹1.5 lakh crore ($18B+)** in unclaimed bank deposits, matured insurance policies, provident funds, and mutual fund investments. Globally, billions of dollars in crypto assets, private equities, and digital properties are lost forever when a breadwinner dies or suffers sudden incapacitation.

The root causes are systemic:
1. **Lack of Discovery:** Family members and nominees are often completely unaware of existing accounts, locker locations, or policy reference numbers.
2. **Bureaucratic Friction:** Claiming legacy assets without precise account numbers or policy documentation takes months or years of court litigation and probate disputes.
3. **The Privacy-Continuity Paradox:** Asset owners are unwilling to hand over full account details and passwords to nominees while alive, fearing premature disclosure, loss of autonomy, or relationship friction.

### 1.2 Existing Solutions & Why They Fail
Existing digital continuity mechanisms suffer from fatal architectural flaws:
- **Custodial Password Vaults (e.g., 1Password, Bitwarden):** Require uploading master passwords or unencrypted recovery kits to a single centralized corporate cloud. Emergency access models designate a single contact who can unilaterally trigger access (single point of failure and coercion).
- **Big Tech Inactivity Managers (Apple Legacy Contact, Google Inactive Account):** Grant sweeping access to entire device backups, private photo galleries, and chat histories rather than compartmentalized financial assets, while requiring cumbersome probate orders and death certificates that take months to process.
- **Traditional "Dead-Man Switches":** Periodically ping an email and dispatch plaintext emails upon timeout. These are easily intercepted, vulnerable to spoofed email triggers, and lack any multi-party threshold verification.

### 1.3 The Last Mile Value Proposition
**Last Mile** is a **zero-knowledge digital estate continuity vault** engineered around three non-negotiable guarantees:
1. **Zero-Knowledge Privacy While Alive:** All confidential asset records and claim instructions are encrypted on the client device using Web Crypto **AES-256-GCM** and **scrypt KDF**. The application server and database store only opaque ciphertext envelopes.
2. **Distributed 2-of-3 Multi-Party Quorum:** The master Data Encryption Key (DEK) is split using audited **Shamir Secret Sharing** into 3 physical Recovery Cards. Any 1 card reveals **zero bits** of key material. Any 2 distinct cards reconstruct the key completely offline.
3. **Fail-Closed State Machine with Cooling-Off Abort:** Inactivity transitions the vault to a due state. A recovery request strictly requires 2 distinct nominee approvals, which automatically triggers a **72-hour cooling-off window**. The owner can abort any false or malicious recovery attempt at any time prior to release with a single click.
4. **Tamper-Evident Canonical Audit Trail:** Every lifecycle transition is canonically serialized (RFC 8785) and linked via a cryptographic **SHA-256 hash chain**, guaranteeing that localized database manipulation or deletion is immediately detectable.

---

## 2. End-to-End System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               CLIENT BROWSER TRUST BOUNDARY                            │
│                                                                                        │
│  [Master Passphrase] ──(scrypt KDF)──> [KEK (Key Encryption Key)]                      │
│                                              │                                         │
│  [Random 256-bit DEK] ──(AES-256-GCM)────────┴──────────> [Wrapped DEK Envelope]       │
│         │                                                                              │
│         ├──(AES-256-GCM + AAD)──> [Confidential Assets] ──> [Payload Ciphertext]      │
│         │                                                                              │
│         └──(Privy Shamir 2-of-3 Split)──> [Recovery Card 1 (Share 1)]                  │
│                                          [Recovery Card 2 (Share 2)] ──> Physical Card │
│                                          [Recovery Card 3 (Share 3)]     Distribution  │
└───────────────────────────────────────────────┬────────────────────────────────────────┘
                                                │ HTTPS POST /api/vaults
                                                │ (Ciphertext + Nonce + KDF Params ONLY)
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              SERVER & PERSISTENCE BOUNDARY                             │
│                                                                                        │
│  ┌───────────────────────┐   ┌───────────────────────┐   ┌──────────────────────────┐  │
│  │     Vault Record      │   │    Recovery Request   │   │       Audit Trail        │  │
│  │ (Ciphertext, Nonces,  │   │  (Threshold Counter,  │   │   (RFC 8785 Canonical    │  │
│  │  Deadlines, Status)   │   │  Cooling-off Timers)  │   │  SHA-256 Chained Events) │  │
│  └───────────────────────┘   └───────────────────────┘   └──────────────────────────┘  │
│                                                                                        │
│  * Strict Invariants Enforced: Zero plaintext columns; Nonce uniqueness; RLS fail-closed│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Cryptographic Life Cycle Pipeline

#### Step 1: Client-Side Key Generation & Encryption (`createVaultPackage`)
1. **DEK Generation:** The browser invokes `window.crypto.getRandomValues(new Uint8Array(32))` to create a cryptographically secure 256-bit uniform random Data Encryption Key (DEK).
2. **KDF Key Derivation:** The user's master passphrase and a 16-byte random salt are passed to `scrypt` (`N=131072, r=8, p=1, dkLen=32`, allocating 128 MB of RAM bound) to derive a 256-bit Key Encryption Key (KEK).
3. **DEK Wrapping:** The DEK is encrypted with the KEK using AES-256-GCM with a fresh 12-byte random nonce and Additional Authenticated Data (AAD) bound to the unique `vaultId` (`last-mile:dek-wrap:v1:<vaultId>`).
4. **Payload Encryption:** Confidential asset JSON is validated against `VaultPayloadSchema` and encrypted with the DEK using AES-256-GCM, a unique 12-byte payload nonce, and payload AAD (`last-mile:vault-payload:v1:<vaultId>`).
5. **Secret Splitting:** The DEK is passed to Privy's audited `shamir-secret-sharing` algorithm to generate 3 shares with a threshold of 2 over $GF(256)$.
6. **Recovery Card Generation:** Each share is packaged into a versioned `RecoveryCard` schema, encoded with base64url, and formatted into printable JSON tokens for distribution to 3 nominees.
7. **Memory Hygiene:** Proactive memory wiping is executed on all transient byte arrays (`dek.fill(0)`, `kek.fill(0)`, `salt.fill(0)`, `share.fill(0)`).
8. **Network Dispatch:** Only the encrypted envelopes (`payloadEnvelope`, `wrappedKeyEnvelope`) and KDF salt are transmitted to `POST /api/vaults`. The server never receives the passphrase, DEK, or Shamir shares.

#### Step 2: Inactivity Detection & Dead-Man Switch Heartbeat
1. **Normal State:** The vault status is `ACTIVE`. The owner logs into `/dashboard/checkin` and clicks "Record Check-In".
2. **Heartbeat Processing:** `POST /api/vaults/:vaultId/check-in` verifies owner identity, updates `last_checkin_at`, extends `next_checkin_at` by `checkin_interval_seconds`, and records a canonical `checkin_recorded` audit event.
3. **Missed Deadline Transition:** If `current_time > next_checkin_at`:
   - Vault transitions to `CHECKIN_DUE`.
   - If owner fails to check in before `grace_ends_at`, vault transitions to `GRACE_PERIOD`.
   - In `GRACE_PERIOD`, registered active nominees are authorized to open a recovery request.

#### Step 3: Multi-Party Nominee Approval & Cooling-Off Abort Window
1. **Nominee Trigger:** Nominee 1 opens a recovery request (`POST /api/vaults/:vaultId/recovery-requests`). Status is `pending`.
2. **Threshold Voting:** Nominees record decisions (`POST /api/recovery-requests/:requestId/decision`).
   - Duplicate submissions by the same nominee are handled idempotently via unique constraints.
   - Unauthorized stranger requests return `403 FORBIDDEN`.
3. **Quorum Trigger:** Upon receiving the 2nd approval (`approvedCount == 2`):
   - The state machine immediately transitions vault and request status to `COOLING_OFF`.
   - The cooling-off countdown timer is initiated (72 hours in production, 30 seconds in demo mode).
4. **Owner Cancellation Path:** During `COOLING_OFF`, the owner dashboard displays an emergency warning. If the owner logs in and clicks "Cancel Recovery" (`POST /api/recovery-requests/:requestId/cancel`), the recovery request is immediately aborted (`cancelled`), cooling-off deadlines are invalidated, and the vault is restored to `ACTIVE`.

#### Step 4: Offline Recombination & Decryption (`recoverVault`)
1. **Session Release:** If the cooling-off window elapses without owner cancellation, the vault transitions to `RECOVERY_READY`.
2. **Zero-Plaintext Delivery:** `GET /api/recovery-requests/:requestId/session` verifies the request is in `RECOVERY_READY` and releases only the encrypted ciphertext envelope and nonces, setting `Cache-Control: no-store`.
3. **Client-Side Reconstruction:** Any 2 nominees enter their physical Recovery Cards into `/recovery`:
   - Card schemas are validated; mismatched vault IDs or identical share indices are rejected fail-closed.
   - The raw share byte arrays are combined via `combineShares([shareA, shareB])` to reconstruct the exact 256-bit DEK.
   - The browser decrypts the ciphertext envelope using Web Crypto AES-256-GCM.
   - Transient key buffers are immediately zeroed. The decrypted financial legacy inventory renders in read-only mode in the browser.

---

## 3. Technology Stack & Architectural Decision Matrix

Every architectural and algorithmic choice in Last Mile was made after evaluating industry alternatives, security boundaries, and runtime performance constraints.

| Component / Layer | Technology Chosen | Rationale & Justification | Alternatives Considered | Why Alternatives Were Rejected |
| :--- | :--- | :--- | :--- | :--- |
| **System Architecture** | Modular Monolith (Next.js 16 App Router) | Single deployment target, unified TypeScript types across frontend and backend, zero API drift, lowest latency for hackathon velocity. | Microservices (Go/Node microservices, gRPC) | Massive operational overhead, Kubernetes orchestration complexity, high risk of serialization mismatch under tight hackathon deadlines. |
| **Symmetric Encryption** | Web Crypto `AES-256-GCM` | Authenticated Encryption with Associated Data (AEAD). Guarantees both confidentiality and ciphertext integrity. Hardware-accelerated via CPU AES-NI instructions in all modern browsers. | AES-CBC + HMAC-SHA256, ChaCha20-Poly1305 | AES-CBC lacks native authentication and is vulnerable to padding oracle attacks. ChaCha20 requires non-native third-party JS/Wasm libraries. |
| **Context Binding** | Additional Authenticated Data (AAD) | Binds `vaultId` into AES-GCM tag calculation. Prevents ciphertext transplantation attacks between vaults. | Plain AES-GCM without AAD | Attacker could copy ciphertext from Vault A into Vault B in the database without triggering tag failure. |
| **Key Derivation (KDF)** | `scrypt` via `@noble/hashes` (`N=131072, r=8, p=1`) | Memory-hard algorithm allocating 128 MB RAM per attempt. Renders GPU/ASIC parallel dictionary attacks mathematically prohibitive. Audited pure JS implementation. | PBKDF2, bcrypt, Argon2 | PBKDF2 has zero memory hardness (vulnerable to RTX 4090 GPU farms). bcrypt truncates at 72 bytes. Argon2 requires heavy Wasm binaries rejected by strict browser CSPs. |
| **Secret Sharing** | 2-of-3 Shamir Secret Sharing (`shamir-secret-sharing`) | Audited by Cure53 & Zellic (Privy). Information-theoretic security: 1 share reveals mathematically **0 bits** of the key. Completely offline-compatible via paper cards. | Threshold Multi-Sig, Multi-Party Computation (MPC) | Multi-Sig is blockchain-dependent, expensive, and leaks public metadata. MPC requires real-time synchronous network handshakes between participants. |
| **Audit Verification** | RFC 8785 Canonical JSON + SHA-256 Hash Chaining | Guarantees deterministic key sorting and continuous cryptographic tamper-evidence without tokens or gas fees. | Public Blockchain (Ethereum/Polygon), Plain Database Logs | Blockchains introduce gas costs, transaction delays, and public timestamp exposure. Plain logs provide zero tamper-evidence against database tampering. |
| **Database & Persistence** | PostgreSQL + Supabase with Row-Level Security (RLS) | ACID transactions for multi-party voting, relational integrity for nominees/requests, declarative RLS access control. | NoSQL (MongoDB, DynamoDB) | Weaker transactional guarantees; complex multi-party state machine transitions risk race conditions. |
| **Simulation Engine** | Server-Gated Demo Clock (`demo-clock`) | Server-authoritative virtual time acceleration gated by `assertDemoModeEnabled()`. Allows testing 180-day lifecycles in seconds without touching system hardware clocks. | Client System Time Spoofing | Relying on client time is insecure: any user could change their laptop clock in Chrome DevTools to bypass cooling-off. |

---

## 4. Threat Model & Security Trade-Offs

### 4.1 Threat Boundary Analysis

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 THREAT ANALYSIS                                  │
├──────────────────────────┬─────────────────────────────────┬─────────────────────┤
│ Threat Actor / Scenario  │ Attack Vector                   │ Mitigation Implemented
├──────────────────────────┼─────────────────────────────────┼─────────────────────┤
│ 1. Rogue Server / DBA    │ Database breach or rogue admin  │ Zero-Knowledge: DB  │
│    Compromise            │ reads raw database tables.      │ holds only AES-GCM  │
│                          │                                 │ ciphertext; no keys.│
├──────────────────────────┼─────────────────────────────────┼─────────────────────┤
│ 2. Single Rogue Nominee  │ Nominee attempts unilateral     │ Shamir 2-of-3 math: │
│    or Stolen Card        │ vault decryption with 1 card.   │ 1 share yields 0    │
│                          │                                 │ bits of key material│
├──────────────────────────┼─────────────────────────────────┼─────────────────────┤
│ 3. Nominee Offline KEK   │ Nominee holding 1 card brute-   │ Nominee View Masking│
│    Brute-Force Attack    │ forces owner passphrase via     │ blanks wrapped DEK &│
│                          │ wrapped DEK and salt.           │ salt for nominees.  │
├──────────────────────────┼─────────────────────────────────┼─────────────────────┤
│ 4. Ciphertext            │ Attacker copies ciphertext blob │ AAD context binding │
│    Transplantation       │ from victim vault to own vault. │ invalidates AES-GCM │
│                          │                                 │ tag on mismatch.    │
├──────────────────────────┼─────────────────────────────────┼─────────────────────┤
│ 5. Audit Log Alteration  │ Malicious admin edits timestamps│ RFC 8785 canonical  │
│    or Deletion           │ or drops an audit row.          │ SHA-256 chain breaks│
│                          │                                 │ immediately.        │
├──────────────────────────┼─────────────────────────────────┼─────────────────────┤
│ 6. False-Alarm / Rogue   │ Nominees trigger recovery while │ 72h Cooling-Off     │
│    Nominee Collusion     │ owner is alive and healthy.     │ window with owner   │
│                          │                                 │ "Cancel" override.  │
└──────────────────────────┴─────────────────────────────────┴─────────────────────┘
```

### 4.2 Security Trade-Offs & Architectural Decisions

#### Trade-Off 1: Client-Side Custody vs Managed Cloud Recovery
- **Trade-off:** Requiring users to generate and physically distribute 3 paper Recovery Cards increases user operational responsibility compared to commercial cloud backups.
- **Justification:** Eliminates all corporate custody liability. If the Last Mile company shuts down, goes bankrupt, or is seized, families can still recover their vaults completely offline using any browser.

#### Trade-Off 2: Nominee View Masking
- **Trade-off:** Nominees cannot view the full vault record or inspect KDF parameters.
- **Justification:** If nominees could query `wrapped_dek` and `kdf_salt`, a malicious nominee holding 1 physical card could run an offline GPU dictionary attack on the owner's master passphrase to recover the KEK and DEK without waiting for a second nominee. The server explicitly strips `wrappedDek: ''` and `kdfSalt: ''` for all non-owner requests.

#### Trade-Off 3: Enforced Cooling-Off Delay
- **Trade-off:** Nominees cannot instantly access funds upon submitting their approvals; they must wait for the cooling-off window (72 hours in production) to elapse.
- **Justification:** This delay is the only reliable defense against wrongful death misdeclarations, social engineering, or accidental triggers, giving the living owner sufficient time to abort the request.

---

## 5. Verification, Testing & Quality Gates

The implementation adheres to a **Zero-Red Quality Gate Policy**: every commit and pull request must pass 100% green across unit tests, security assertions, TypeScript strict checks, ESLint, and production Next.js builds.

### 5.1 Test Suite Breakdown (97 Tests across 12 Suites)

| Test Suite File | Scope & Invariants Tested | Tests Passing |
| :--- | :--- | :---: |
| `src/types/__tests__/types.test.ts` | Zod runtime schema boundaries, UUID validation, envelope contracts | 9 |
| `src/lib/crypto/__tests__/crypto.test.ts` | AES-256-GCM roundtrips, AAD tampering, scrypt KDF derivation, Shamir 2-of-3 split/combine, card serialization | 17 |
| `src/lib/audit/__tests__/audit.test.ts` | RFC 8785 canonical stringification, SHA-256 chaining, metadata sanitization, verifier tamper detection | 12 |
| `src/lib/recovery/__tests__/state-machine.test.ts` | Pure state machine rules, 2-of-3 nominee approval deduplication, cooling-off countdowns, owner cancellation | 23 |
| `src/lib/server/validation.test.ts` | Server-side deep recursive validation against prohibited plaintext keys (`assertZeroPlaintext`) | 6 |
| `src/app/api/persistence.test.ts` | Vault envelope creation, nominee roster setup, invite token hashing, RLS isolation | 5 |
| `src/components/__tests__/ui-flows.test.ts` | Component rendering, Concept C visual hierarchy, responsive navigation | 2 |
| `src/lib/server/authorization-quality.test.ts` | Strict cross-user 401/403 denial, nominee-restricted view masking, full crypto roundtrip | 3 |
| `src/__tests__/api/recovery-routes.test.ts` | Recovery API routes, check-in deadline resets, voting quorum, cooling-off cancellation, no-store headers | 9 |
| `src/__tests__/integration/orchestration.test.ts` | End-to-end client orchestrator tests (`createVaultPackage`, `unlockVault`, `recoverVault`, memory hygiene) | 6 |
| `src/__tests__/security/privacy-proof.test.ts` | Automated memory scan asserting zero plaintext in DB dumps, single-share defense, audit tamper proof | 4 |
| `src/smoke.test.ts` | Framework sanity, Node 22 Web Crypto availability, environment configuration | 1 |
| **Total Test Suite** | **Comprehensive Full-Spectrum Verification** | **97 / 97 (100%)** |

### 5.2 Verification Pipeline Commands
```bash
# 1. Typecheck: Strict TypeScript validation (0 errors)
npm run typecheck

# 2. Lint: ESLint static analysis (0 errors, 0 warnings)
npm run lint

# 3. Test: Vitest full suite execution (97/97 passing in ~3.2s)
npm run test

# 4. Build: Next.js Turbopack production compilation (100% clean)
npm run build
```

---

## 6. Engineering Limitations & Honest Disclosures

To maintain absolute technical integrity, we explicitly document the system's operational boundaries and intentional limitations:

1. **Unanchored Hash Chains:** The audit trail uses local SHA-256 hash chaining. This detects any localized record tampering, row deletion, or sequence alteration if an earlier checkpoint hash is retained. However, it does not prevent a rogue super-administrator with root database access from dropping and re-generating an entire chain from genesis unless an external cryptographic checkpoint (e.g., public timestamping service or Git commit) is anchored out-of-band.
2. **Browser Memory Lifetime:** While our orchestrators execute proactive zeroing (`buffer.fill(0)`) on TypedArrays, JavaScript runtime environments and V8 garbage collectors do not guarantee instantaneous memory compaction. A sophisticated attacker with root OS access running a live RAM scraper during the exact millisecond of decryption could theoretically capture transient key material.
3. **Physical Card Protection:** Shamir Secret Sharing guarantees that 1 share contains zero information. However, if an attacker physically compromises **2 out of the 3** distributed physical cards, they possess the mathematical threshold to reconstruct the DEK once the vault ciphertext is released.
4. **Simulation Scaffolding:** The `demo-clock` endpoint is an intentional engineering scaffold designed for hackathon evaluation and automated CI testing. It is strictly disabled in production via `assertDemoModeEnabled()` checking `NEXT_PUBLIC_DEMO_MODE === 'true'`.

---

## 7. Team Member Contribution Matrix

The project was executed using a strict, zero-overlap dual-workstream division of responsibilities:

### Mayank Sharma — Lead Engineer: Workstream A (Security & Backend Core)
- **Phase 0:** Authored foundational Zod validation schemas, TypeScript interfaces, and contract test suites (`src/types/**`).
- **Phase 1:** Engineered browser cryptography engine: Web Crypto AES-256-GCM, context-bound AAD, scrypt KEK derivation, Privy 2-of-3 Shamir Secret Sharing, and versioned Recovery Card serialization (`src/lib/crypto/**`).
- **Phase 2:** Built canonical audit engine: RFC 8785 deterministic JSON stringifier, metadata sanitization disallowing secret fields, SHA-256 hash chaining, and mathematical chain verifier (`src/lib/audit/**`).
- **Phase 3:** Engineered recovery state machine: fail-closed transition matrix, 2-of-3 nominee approval deduplication, cooling-off countdown calculation, owner cancellation, and server-gated demo clock engine (`src/lib/recovery/**`).
- **Phase 4:** Built production API route handlers: `/api/vaults/[vaultId]/check-in`, `/api/vaults/[vaultId]/recovery-requests`, `/api/recovery-requests/[requestId]/decision`, `/api/recovery-requests/[requestId]/cancel`, `/api/recovery-requests/[requestId]/session`, `/api/dev/demo-clock`, and `/api/vaults/[vaultId]/audit`.
- **Phase 5:** Designed high-level client orchestrators: `createVaultPackage`, `unlockVault`, `recoverVault`, and proactive buffer zeroing memory hygiene (`src/lib/crypto/vault-creator.ts`, `src/lib/crypto/vault-unlock.ts`, `src/lib/recovery/recovery-orchestrator.ts`).
- **Phase 6:** Engineered automated zero-plaintext security proofs: full database dump leak scanners, single-share mathematical defense assertions, and the live hackathon presentation runbook (`src/__tests__/security/privacy-proof.test.ts`, `docs/DEMO_WALKTHROUGH.md`).

### Shyam — Product Engineer: Workstream B (Data Foundation, UI & Product Experience)
- **Phase B1:** Designed Supabase PostgreSQL schema migration `20261029000000_initial_schema.sql`, table constraints, foreign keys, and strict Row-Level Security (RLS) policies fail-closing `anon` access. Implemented baseline vault persistence APIs and deep recursive `assertZeroPlaintext` validation.
- **Phase B2:** Implemented approved Concept C editorial scrapbook design system (`#FAF7F2` warm paper backgrounds, cream cards, charcoal typography, gold brush highlights). Built shared UI shell (`Navbar`, `AppSidebar`, `AppHeader`, `StatCard`, `VaultTimeline`) and 10 core user journeys (`/`, `/vault/new`, `/dashboard`, `/dashboard/assets`, `/dashboard/nominees`, `/dashboard/checkin`, `/dashboard/recovery`, `/nominee/approval`, `/recovery`, `/dashboard/activity`).
- **Phase B3:** Wired real browser cryptography into UI flows: connected `/vault/new` wizard to client-side DEK generation and Shamir splitting, and wired `/recovery` portal to local card combination. Authored cross-user denial and nominee view masking authorization tests (`src/lib/server/authorization-quality.test.ts`).
- **Phase B4 & Hardening:** Integrated workflow API endpoints into client UI buttons (check-in, recovery cancellation, nominee voting, live audit badge). Hardened accessibility across mobile drawers, form labels, focus rings (`focus-visible:ring-2`), and ARIA live regions (`role="alert"`). Authored automated 7-step presentation demo sequence (`src/__tests__/e2e/demo-sequence.test.ts`).
