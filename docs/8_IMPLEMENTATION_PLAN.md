# 10 — Implementation Plan for Two Developers

## Operating principle

Build one secure end-to-end path before adding extras. The core demonstration is: encrypt data in browser → store ciphertext → start recovery with demo clock → two distinct approvals → cooldown/cancel path → two shares reconstruct key locally → decrypt locally → verify privacy and tests.

**Team:** Mayank (Team Lead) and Shyam. No third developer is assumed.

## Phase 0 — Decisions and repo preparation

**Mayank:** confirm docs, create repository, decide package manager, set up the project organization and write the initial README from these specs.  
**Shyam:** review state machine and schema, list edge cases and identify dependencies/audit reports.  
**Exit gate:** both agree on the threat model and the recovery-card custody model.

## Phase 1 — Scaffold and first commit

- Create Next.js App Router project with TypeScript strict mode, lint, test runner and base styling.
- Add `.env.example` with variable names only.
- Add placeholder page and route, app error/loading states, not-found page, CI workflow and a structured `src/` layout.
- Add the docs and Antigravity instructions.
- Confirm local dev server, lint, typecheck, unit test and production build pass.
- Review `.gitignore`, dependency lockfile, secrets and diff; commit the minimal scaffold.

**No full product UI yet.** Generate the visual reference only after this gate.

## Phase 2 — Approved design direction

- Generate the UI reference image with `docs/09_UI_REFERENCE_IMAGE_PROMPT.md`.
- Mayank approves or requests changes.
- ChatGPT documents final design tokens, page structure, responsive behavior, component inventory, empty/loading/error states and copy.
- Implement a shared shell only after design spec is approved.

## Phase 3 — Data and auth foundation

**Mayank:** integrate Supabase Auth client/server patterns, protected layouts and route authorization.  
**Shyam:** create migrations for profiles, vaults, nominees, recovery requests, approvals and audit events; write RLS grants/policies and tests.  
**Pair:** verify every direct data path and service role handling.

**Exit gate:** unauthorized user cannot read or alter another user's rows; CI database checks run successfully in the configured environment.

## Phase 4 — Crypto module (highest priority)

Create small isolated functions for:
- random DEK and salt/nonce generation;
- scrypt KDF with recorded parameters;
- DEK wrapping/unwrapping;
- AES-GCM encrypt/decrypt with explicit AAD and version;
- Shamir split/combine through the reviewed library;
- recovery-card encode/decode and validation;
- crypto buffer lifetime cleanup as best effort.

**Mayank:** integrate UI/client flow.  
**Shyam:** write deterministic fixtures, round-trip tests, tamper tests, wrong-key tests, duplicate-share and one-share tests.

**Exit gate:** known synthetic payload round-trips; modified ciphertext fails; one share cannot recover; two shares from the same split reconstruct; server/network sees no secrets.

## Phase 5 — Vault payload and dashboard

- Owner enters synthetic asset records.
- Encrypt the complete payload on the client.
- Persist ciphertext envelope + wrapped DEK + parameters only.
- Unlock/decrypt locally; lock and idle timeout; save updates with revision checks.
- Add privacy inspection/demo panel that displays only server-stored fields.

**Exit gate:** devtools/network/database inspection confirms there are no plaintext asset fields or share bytes at rest or in transit.

## Phase 6 — Workflow state machine

- Implement pure domain transition rules with server/database time.
- Add check-in, due/grace transitions, pending recovery creation, approvals, cooling-off, cancellation and ready state.
- Use transaction-safe operations and unique constraints.
- Add a demo-only simulated clock, disabled for production.
- Show state/timeline in UI.

**Mayank:** server routes and integration.  
**Shyam:** transition tests, concurrency tests, forbidden-transition tests and timeline validation.

**Exit gate:** all transitions are tested; duplicate approvals count once; cancellation and ready transition races are deterministic.

## Phase 7 — Recovery end to end

- Owner exports three distinct recovery cards and confirms off-site distribution.
- Nominees accept invitations and can approve/decline through authenticated screens.
- After two distinct approvals and cooling-off, authorized recovery screen downloads ciphertext and accepts two cards locally.
- Combine/decrypt on client only; render recovered inventory read-only.
- Record only a client-reported completion event, not a server-verified decryption claim.

**Exit gate:** server never receives share bytes or reconstructed DEK; a valid pair unlocks; invalid pair fails safely; recovery window expiry is enforced.

## Phase 8 — Audit trail and reliability

- Canonicalize event fields and hash-chain per-vault events.
- Verify sequence/hash continuity in UI and tests.
- Clearly describe limitations of an unanchored hash chain.
- Add rate limiting to invite/recovery/approval endpoints; test 429 behavior.
- Ensure authenticated API responses are not cached.
- Add basic accessibility, responsive states and keyboard navigation.

## Phase 9 — Demo hardening

- Seed synthetic users/assets only.
- Verify reset-demo does not alter production or leave real data.
- Rehearse the 3–4 minute narrative.
- Ensure backup demo path if email/invite delivery fails; don't remove auth/state safeguards just to make the demo work.
- Capture short architecture diagram and threat-model summary.
- Run full CI from a clean checkout and rehearse with browser devtools/database console ready.

## 24-hour sprint budget (guideline, not a guarantee)

| Time block | Focus | Definition of done |
|---|---|---|
| Hours 0–2 | Scaffold/commit, env, CI, migrations skeleton | App runs; build/checks pass. |
| Hours 2–5 | Crypto primitives + tests | Round-trip and Shamir unit tests pass. |
| Hours 5–8 | Supabase auth, vault schema, RLS | Cross-user access denied. |
| Hours 8–11 | Encrypted payload save/load, owner unlock | Ciphertext-only storage proven. |
| Hours 11–15 | State machine and approval transaction | Demo clock drives state; duplicate approval guarded. |
| Hours 15–18 | Recovery-card import and local decryption | Two-card unlock works end-to-end. |
| Hours 18–20 | Cancellation, audit chain, negative tests | False trigger cancellation succeeds; tamper test fails verification. |
| Hours 20–22 | UI polish, responsive/accessibility and rate limits | Primary flows are usable and safe. |
| Hours 22–24 | Rehearsal, bug fixes, demo prep | Repeatable demo from fresh synthetic seed. |

This plan is intentionally aggressive. If behind schedule, remove OCR, email automation, complex document uploads, analytics, fancy animation and optional charts. Do not cut encryption tests, RLS, share custody boundaries, recovery approval uniqueness, cancellation or the demo privacy proof.

## Critical path

1. Generate/verify crypto and share behavior.
2. Decide the minimum invite/approval mechanism.
3. Store encrypted envelope and prove no plaintext leakage.
4. Implement state-machine transitions and transaction boundaries.
5. Decrypt locally with two valid shares.
6. Rehearse full flow and false-trigger cancellation.

## Nice-to-have only after core path

- Client-side OCR for local PDF/image extraction (never upload raw file/text in MVP).
- Claim checklist templates.
- Reminder email delivery and outbox.
- Hindi/English copy toggle.
- Printable recovery-card design polish.
- External audit checkpoint/anchor.

## Commit strategy

Use small commits with clear messages, for example:
- `chore: scaffold Next.js app and CI`
- `docs: add product and threat model docs`
- `feat: add encrypted vault envelope primitives`
- `test: cover crypto round-trip and tamper cases`
- `feat: add vault schema and RLS policies`
- `feat: add server-side recovery state machine`
- `feat: add local two-share recovery flow`
- `test: cover recovery cancellation and approval races`

Never commit real recovery cards, sample passphrases that might be reused, production env files, or plaintext financial examples.
