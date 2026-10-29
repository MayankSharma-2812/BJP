# 07 — Security Threat Model

## 1. Security claim we may make

“Vault content is encrypted in the browser before upload. The service stores the encrypted payload and key-wrapping metadata, but it does not receive the vault passphrase, raw vault key, plaintext asset inventory or recovery shares. Recovery requires two distinct nominee approvals plus two recovery shares, and decryption occurs in the recovery browser.”

This statement is valid only if network traffic, server code, logs, database tables, error reporting and analytics all preserve those boundaries.

## 2. Claims we must not make

- “The app proves that the owner has died.” Inactivity is only an absence of check-in signal.
- “Nobody can ever access the data.” XSS, malicious client code, compromised devices, stolen shares, owner coercion and future vulnerabilities remain possible.
- “The database has no information about the user.” It still contains account/nominee identities, status, deadlines, timestamps, IDs, ciphertext size and traffic/operational metadata.
- “The audit trail is immutable.” A single database-backed hash chain can be rewritten by a sufficiently privileged attacker unless an independently retained checkpoint or external anchor exists.
- “The project is audited/certified.” We may cite audits of specific third-party libraries, not our application.
- “Recovery guarantees access to funds.” The app only organizes information and claim instructions; institutions and applicable law govern access and ownership.
- “A recovery QR is just a harmless invite.” A recovery card contains secret material and must be protected like a key.

## 3. Assets

- Vault plaintext: asset names, policy descriptions, instructions, contact notes and documents metadata.
- DEK and KEK material.
- Three recovery shares.
- Owner passphrase and active browser session.
- Invite tokens and nominee identities.
- State-machine integrity, deadlines and approvals.
- Audit chain head/checkpoints.
- Availability of encrypted payload and owner/recovery workflow.

## 4. Adversaries and threats

| Threat | Impact | Mitigation / residual risk |
|---|---|---|
| Database read compromise | Ciphertext and operational metadata exposed. | Encrypt payload and wrapped DEK client-side; don't store shares. Metadata still leaks. |
| Database write/rollback | Ciphertext replacement, state manipulation, audit rewrites. | AES-GCM authentication catches ciphertext tampering; state transitions run server-side with constraints/transactions; hash-chain verification detects some edits if checkpoints are retained. A privileged operator may rewrite unanchored history. |
| Stolen owner account | Attacker may alter metadata/start cancellation if authenticated. | Session protections, rate limiting, recent auth for sensitive actions, vault passphrase still required to decrypt. Stolen passphrase plus ciphertext can enable decryption. |
| Stolen recovery card | One share alone is insufficient under 2-of-3 threshold, but it is sensitive. | Distribute separately; never upload shares; require two shares. Two stolen shares can recover. |
| Two nominees collude | They can reconstruct the key after the release policy allows it if they also obtain the two shares. | This is intrinsic to the 2-of-3 trust model. Owner must choose nominees carefully. |
| Owner misses check-in accidentally | Recovery process could start. | Grace period, notifications, distinct nominee approvals, cooling-off and owner cancellation. These reduce but do not eliminate risk. |
| Malicious nominee approves twice | Could inflate threshold. | Unique constraint `(request_id, nominee_id)`, transaction-safe count, audit event. |
| State-transition race | Early release or cancellation overwritten. | Row lock/optimistic concurrency; expected-state compare-and-swap; concurrency tests; fail closed. |
| XSS/compromised frontend bundle | Malicious code could read plaintext/key when user unlocks. | CSP, minimal third-party scripts, escaping, dependency review, no unsafe HTML, no arbitrary analytics. Cannot fully protect against a compromised app delivery path. |
| Malicious browser extension/device malware | Could read screen, keystrokes or browser memory. | Out of scope for full prevention; warn users to use trusted updated devices and avoid real data during hackathon. |
| Passphrase guessing after database theft | Wrapped DEK may be attacked offline. | Memory-hard scrypt, salt, tuned parameters, strong passphrase guidance; stored KDF parameters visible. Benchmark and review. |
| Recovery share corruption/mislabeling | Recovery fails or share mismatch. | Versioned card format, vault ID binding, distinct indices, card-save verification, AES-GCM tag verification. |
| Scheduler outage | Recovery is delayed. | Fail safe: never transition early. Monitor scheduler lag and retry idempotently. |
| Denial of service / automated requests | Service unavailable, spam invites. | Rate limits, validation/body limits, auth, platform protections; don't overengineer. |
| Sensitive data in logs/backups | Privacy exposure. | Allowlisted events, redaction tests, ciphertext-only backups, access control and retention plan. |

## 5. Privacy boundaries

### Encrypted inside payload

- Asset type, institution labels, policy/reference labels, approximate values, claim checklists, notes and user-provided instructions.
- Document contents if future versions add them. For MVP, avoid upload of actual documents.

### Visible to backend

- Account IDs and email used for auth/invites, nominee rows, invite lifecycle metadata, vault ID/owner ID, workflow status and deadlines, event timestamps, ciphertext lengths, KDF params/salt, nonce and wrapped DEK ciphertext, request metadata required for abuse prevention.

### Never sent to backend

- Vault passphrase, raw KEK bytes, raw DEK bytes, Shamir share bytes/recovery card payload, decrypted asset content, raw document OCR text.

## 6. Threat-model assumptions

- Browser crypto primitives and the chosen reviewed libraries behave as documented.
- The deployed JavaScript bundle is not malicious at the moment the owner unlocks the vault.
- Owner chooses a sufficiently strong passphrase and distributes shares out-of-band.
- Fewer than two recovery shares are compromised before authorized recovery.
- Nominees are trusted to the extent required by a 2-of-3 recovery scheme.
- Users understand that exported recovery cards can be copied.

If any assumption is unacceptable, the product needs a more substantial design review before production use.

## 7. Required hardening before real users

- Independent application-level security review and penetration test.
- Audit exact versions of crypto libraries and confirm the associated reports' scope.
- Add strict CSP and test all routes against XSS/CSRF/IDOR.
- Review current Next.js/Supabase security guidance and advisories.
- Define account recovery, key rotation, vault deletion, backup, breach response, rate limits and retention.
- Verify real scheduler, email delivery and delayed job behavior under outages.
- Model malicious nominee, owner incapacitation, incorrect death assumptions, coercion and family dispute cases with domain/legal experts.
- Document recovery-card printing, copying, destruction and replacement flows.
- Do not onboard real financial records until those steps are completed.
