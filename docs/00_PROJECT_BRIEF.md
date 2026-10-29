# 00 — Project Brief and Source of Truth

## One-line description

**Last Mile helps a person organize important family financial and administrative information in an encrypted vault that trusted people can recover together if the owner becomes unreachable.**

## The problem

When a person dies or becomes incapacitated, family members may not know which policies, fixed deposits, investments, accounts, subscriptions, documents or claim procedures exist. Even when the assets are legitimate, missing information can delay action and create stress.

## Product promise

- The owner can keep a structured inventory of important assets and instructions.
- Vault content is encrypted in the browser before it leaves the device.
- The server stores ciphertext, not plaintext asset records or encryption keys.
- A 2-of-3 Shamir scheme lets any two of three recovery-share holders reconstruct the vault key.
- A configurable check-in and grace-period state machine prevents a single missed reminder from immediately exposing the vault.
- The owner can cancel a false trigger during the recovery process.
- A hash-chained audit log makes inconsistencies detectable when prior checkpoints are retained; it is not claimed to defeat a fully privileged database operator who can rewrite all records and checkpoints.

## Product boundaries

Last Mile is an information-continuity tool, not a legal executor or financial intermediary. It does not establish legal death, prove incapacity, adjudicate disputes, make bank or insurer claims, transfer property, execute payments, or replace a will or professional legal/financial advice.

For the hackathon, use invented data such as `Example Bank`, `Policy-TEST-1042`, and fake contact names. Never use real bank account numbers, passwords, PINs, OTPs, private keys, identity documents or policy documents.

## Team

- **Mayank Sharma — Team Lead:** product owner, system architecture, integration, demo narrative and technical decisions.
- **Shyam — Developer:** co-owner of implementation; proposed lead for test coverage, state-machine integration and delivery checks. Final allocation can change by mutual agreement.

The plan assumes two developers only.

## Hackathon goal

Produce a cohesive end-to-end demo, not a large collection of disconnected features. The main demo must prove all of these:

1. The owner creates a vault and adds synthetic assets/instructions.
2. The browser encrypts content and saves only a ciphertext envelope.
3. Three distinct recovery cards are generated; the app clearly tells the owner to deliver them securely and separately.
4. A database inspection shows ciphertext and metadata but no plaintext assets or recovery shares.
5. The owner misses a check-in; the simulated clock advances the state through the grace/recovery process.
6. Two nominee approvals satisfy the policy threshold.
7. Two valid shares are entered into the recovery browser, combined locally, and the vault decrypts locally.
8. The owner can cancel a false trigger before release.
9. State-machine and cryptography tests pass.

## Decisions already made

- Name: Last Mile.
- Team: Mayank (Team Lead) and Shyam.
- Architecture: modular monolith; no microservices.
- Frontend/full stack: Next.js App Router + TypeScript.
- Auth/database: Supabase Auth + PostgreSQL with RLS.
- Data encryption: Web Crypto API AES-256-GCM.
- Recovery scheme: independently audited `shamir-secret-sharing` TypeScript library, threshold 2 of 3.
- Key derivation: scrypt using the audited portion of `@noble/hashes`, after a browser performance smoke test. Do not use the Argon2 implementation from that package because its project documentation states Argon2 is outside the independent audit scope.
- OCR and AI: not in the MVP critical path.
- UI reference: generate after scaffold and the first clean commit; obtain approval before freezing detailed UI specifications.

## Product principles

1. Privacy by default.
2. Failure-safe rather than optimistic.
3. Explain sensitive actions and their consequences in plain language.
4. Honest claims over marketing claims.
5. Minimal data collection.
6. No unnecessary infrastructure.
7. A working, rehearsed demo beats a long feature list.

## Terminology

- **Vault key / DEK:** a randomly generated 256-bit key used to encrypt vault content.
- **KEK:** a key derived from the owner's vault passphrase; it encrypts the DEK for normal owner access.
- **Share:** one output from splitting the DEK with a 2-of-3 threshold.
- **Recovery card:** a QR/printable/downloadable representation of one share. It is secret material and must be delivered and stored safely.
- **Nominee:** one of three trusted people authorized to approve a recovery request.
- **Check-in:** an owner action that proves they can still access the service; it is not a medical or legal proof of wellbeing.
- **Cooling-off period:** the delay after approval before recovery shares may be combined for release.
- **Simulated clock:** a development/demo-only control for advancing workflow time; never exposed as a production feature.
