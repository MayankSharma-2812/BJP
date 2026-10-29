# 01 — Product Requirements Document (PRD)

## 1. Overview

Last Mile is a privacy-first family continuity vault for organizing asset inventory and claim instructions. Its differentiator is the combination of client-side encryption, 2-of-3 recovery, inactivity workflow safeguards, and demonstrable privacy boundaries.

## 2. Problem statement

Families can struggle to locate financial assets and understand the next steps when an owner is unavailable. Information may be scattered across folders, emails, statements and memory. Existing password managers solve credentials, while generic document drives do not provide a carefully governed recovery workflow. Last Mile focuses on an encrypted inventory and actionable claim instructions.

## 3. Target users

### Primary: owner

An adult who wants trusted family members to know what exists and how to proceed in an emergency, without giving those people routine access today.

### Secondary: recovery nominee

A trusted person chosen by the owner to participate in a future recovery. A nominee is not automatically a legal heir, executor, beneficiary or owner of any listed asset.

### Tertiary: family member using recovered information

A person who receives the approved, decrypted vault information and follows the instructions to contact relevant institutions or professionals.

## 4. Goals

- Let an owner create, encrypt, update and unlock an inventory.
- Keep vault content and recovery shares out of server plaintext.
- Require two of three nominee approvals and two valid shares for recovery.
- Provide a check-in schedule, reminders/status, grace period, approval threshold, cooling-off period and owner cancellation.
- Make the state machine and security behavior visible to reviewers.
- Show a clear audit trail and a raw ciphertext/database view for the demo.
- Deliver an accessible, calm, premium interface that works on laptop and mobile.

## 5. Non-goals for the MVP

- Actual financial transfers or bank/insurer integrations.
- Storing bank passwords, PINs, OTPs, payment-card secrets, private keys or password-manager exports.
- Legal advice, automated probate, will generation, legal status checks or proof of death.
- Automatic discovery of bank accounts or account aggregation.
- Production-grade identity verification or dispute resolution.
- Multi-region database writes, microservices, sharding, event streaming, or blockchain.
- Fully automated OCR/AI extraction. It can be a later feature after core encryption/recovery is proven.
- Claims of independent security certification or production readiness.

## 6. MVP functional requirements

### FR-01 — Sign-up and sign-in

Users can create and access an account through Supabase Auth. Authentication does not decrypt vault content by itself; the owner also supplies the vault passphrase.

**Acceptance:** signed-out users cannot access vault metadata/actions; expired sessions are handled clearly; sign-in errors reveal no sensitive account information.

### FR-02 — Create vault

The owner creates a vault passphrase and chooses check-in timing. Client-side code generates a random DEK, derives a KEK from the passphrase using scrypt, wraps the DEK, and splits the DEK into three shares with threshold two.

**Acceptance:** no plaintext vault payload, raw DEK or share bytes are sent to a server; the UI shows recovery-card save/print steps and requires an explicit acknowledgement that losing two shares makes recovery impossible.

### FR-03 — Asset inventory

The owner can add, edit, view and delete structured entries such as asset type, institution nickname, reference label, approximate/optional value, beneficiary/contact, location of documents, and a “how to claim” checklist.

**Acceptance:** all user-entered inventory fields are inside an encrypted payload; only the encrypted envelope is stored remotely. Avoid collecting fields not necessary for the demo. Warn users not to enter credentials or identifiers.

### FR-04 — Client-side lock/unlock

The owner can unlock the vault using the passphrase, decrypt locally, lock it manually, and lock after a short idle timeout. Browser memory is the only active plaintext workspace.

**Acceptance:** refresh/re-login requires unlocking again; no plaintext is written to localStorage, sessionStorage, IndexedDB, logs, analytics, or server responses.

### FR-05 — Nominee setup

The owner records three nominees and a delivery/checklist state for each recovery card. Nominee contact and identity metadata are not vault content and remain visible to the service, which must be disclosed.

**Acceptance:** exactly three active nominee slots are configured for the MVP; each card is separately identified; no share bytes appear in database tables, network requests, telemetry, or logs.

### FR-06 — Check-in schedule

The owner can perform a check-in, which updates the server-side last-checked-in timestamp and resets the deadline. The service starts the recovery workflow only after the due time and grace period have passed.

**Acceptance:** server time is authoritative; repeating a check-in is idempotent; a late check-in during grace resets the process.

### FR-07 — Recovery state machine

The system supports `ACTIVE`, `CHECK_IN_DUE`, `GRACE_PERIOD`, `RECOVERY_PENDING`, `COOLING_OFF`, `RECOVERY_READY`, `RECOVERED`, and `CANCELLED/REACTIVATED` outcomes as defined in `04_APP_FLOW.md`.

**Acceptance:** every transition is validated server-side and recorded; clients cannot choose their own state; invalid transitions are rejected; duplicate requests do not duplicate effects.

### FR-08 — Nominee approval

After recovery becomes pending, nominated and authenticated users can approve or decline. Two distinct active nominees must approve. Repeated approval from one nominee counts once.

**Acceptance:** unique database constraint prevents duplicate approvals; requests are authenticated, authorized, rate-limited and audited; approvals alone do not decrypt the vault.

### FR-09 — Cooling-off and cancellation

After two approvals, the system starts a cooling-off period. The owner can cancel/reactivate the vault with their authenticated account and vault passphrase before release. A false trigger must be reversible before recovery is ready.

**Acceptance:** successful cancellation invalidates pending recovery sessions and cannot be overwritten by a stale approval request; race conditions are covered by tests.

### FR-10 — Recovery

Once the cooling-off period ends, the recovery page downloads the encrypted envelope and requires two valid recovery shares. Share combination and vault decryption happen in the browser.

**Acceptance:** server never receives the shares or the reconstructed key; one share fails; two valid shares succeed; wrong/corrupted shares produce a generic, non-leaky error; the recovered plaintext is not persisted remotely.

### FR-11 — Audit history

The app records non-secret events and computes a hash chain. The client can verify a retrieved sequence and the UI labels what the chain proves and what it cannot prove.

**Acceptance:** no secret data enters audit payloads; event order and previous hashes are validated; tampering with an entry breaks verification. Documentation explicitly states that a privileged attacker who can rewrite the entire database and all checkpoints may defeat an unanchored hash chain.

### FR-12 — Demo mode

A gated local/demo control advances a simulated clock to show overdue, grace, approval, cooling-off, cancel and recovery flows.

**Acceptance:** the control is disabled in production builds by default and the backend rejects requests unless an explicit server-side demo-mode setting is enabled. Never accept client-supplied arbitrary production timestamps.

### FR-13 — Database privacy demo

A reviewer-facing page or documented SQL query shows only ciphertext envelopes and operational metadata for a synthetic vault.

**Acceptance:** no asset names, instructions, DEK bytes, passphrase, recovery shares or decrypted data are visible.

## 7. Recommended state durations for the demo

These values are demonstration defaults and must be labelled as configurable, not medical/legal advice:

- Check-in interval: 2 minutes in demo mode; longer in normal configuration.
- Grace period: 2 minutes in demo mode; suggested illustrative default of 7 days outside demo mode.
- Cooling-off: 2 minutes in demo mode; suggested illustrative default of 48 hours outside demo mode.
- Recovery unlock window: 24 hours after the cooling-off period, after which a fresh authorized recovery session is needed.

The demo clock changes simulated workflow time only. Production logic must use server time and a controlled scheduler.

## 8. UX requirements

- Plain language; do not use crypto jargon as the primary user-facing explanation.
- Clearly distinguish **inactivity signal**, **nominee approval**, **cooling-off**, **share reconstruction**, and **decryption**.
- Show the user what the service can see, what it cannot see, and what information remains in metadata.
- Recovery-card screens must use explicit warnings and require the user to verify each card is safely saved.
- Never use alarming red UI for ordinary overdue reminders. Reserve destructive styling for irreversible or high-risk actions.
- Provide loading, retry, success, empty, validation and error states.
- Desktop-first for the hackathon demo, fully responsive for mobile. Keyboard accessible with clear focus indicators.

## 9. Success metrics for the demo

- 100% of core happy path completed without manual database edits.
- No plaintext asset data or share bytes found in network capture or database inspection.
- All state transition tests pass.
- One-share recovery fails; two-share recovery succeeds.
- False-trigger cancellation succeeds in the cooling-off state.
- Judge can understand the product within 30 seconds and observe the security proof within 2 minutes.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Encryption implementation bugs | Use browser Web Crypto primitives; keep crypto module small; use tested Shamir/KDF libraries; write test vectors and edge tests. |
| Owner loses passphrase | Normal owner unlock is lost; recovery requires two of three shares. Explain this before enrollment. |
| Two recovery shares lost | Recovery becomes impossible. Require separate distribution and clear confirmation. |
| False trigger | Grace period, two-person approval threshold, cooling-off and owner cancellation. |
| XSS or compromised frontend bundle | Strict CSP, minimize third-party scripts, dependency audit, no plaintext analytics; note the residual risk. |
| Misleading “zero knowledge” marketing | Use precise copy; disclose visible metadata and the trust in deployed client code. |
| Hackathon time pressure | Make OCR, email automation and polish optional; core crypto/state machine first. |
| Legal misunderstanding | Explicitly state that recovery does not determine ownership or replace legal processes. |
