# 🛡️ Last Mile — Zero-Knowledge Family Continuity Vault

[![Live Demo](https://img.shields.io/badge/Live%20Demo-bjp--tau.vercel.app-emerald?style=for-the-badge&logo=vercel)](https://bjp-tau.vercel.app)
[![Tests Passing](https://img.shields.io/badge/Vitest-101%2F101%20Passed-success?style=for-the-badge&logo=vitest)](https://bjp-tau.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js%2016-Turbopack-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

> **Kalvium Hackathon MVP**  
> **Team:** Mayank Sharma (Team Lead) & Shyam Sharma  
> **Live Deployment:** [https://bjp-tau.vercel.app](https://bjp-tau.vercel.app)

---

## 💡 What is Last Mile?

**Last Mile** is a zero-knowledge emergency continuity vault that helps individuals securely organize life-critical financial records, insurance policies, and legal directives. 

If the vault owner is active, the vault remains completely sealed. If an unexpected tragedy or prolonged inactivity occurs, trusted family nominees can collectively recover and decrypt the vault instructions using **2-of-3 Shamir Secret Sharing**, with zero reliance on centralized custodians or cloud master keys.

---

## 🏛️ Core Security Invariants

```
                                  +------------------------------------+
                                  |    Client Browser (Zero-Knowledge) |
                                  +------------------------------------+
                                    |              |                 |
                   AES-256-GCM      |              | scrypt KDF      | Shamir (2-of-3)
               (Encrypted Payload)  |              | (N=131072)      | Polynomial Split
                                    v              v                 v
                       +-------------------+  +----------+   +-------------------+
                       | Ciphertext + AAD  |  | Wrapped  |   | 3 Recovery Cards  |
                       | Nonce & Timestamp |  | DEK (KEK)|   | Held Out-of-Band  |
                       +-------------------+  +----------+   +-------------------+
                                    |              |                   |
                         (HTTPS)    |              |                   | (Given to
                                    v              v                   |  Nominees)
                       +---------------------------------+             v
                       |      Supabase PostgreSQL        |     +-------------------+
                       |   Zero Plaintext / Zero DEK     |     | Nominee 1: Card 1 |
                       |   Tamper-Evident SHA-256 Audit  |     | Nominee 2: Card 2 |
                       +---------------------------------+     | Nominee 3: Card 3 |
                                                               +-------------------+
```

1. **True Zero-Knowledge Encryption:**  
   The server and database never receive, see, or store the master passphrase, the raw 256-bit Data Encryption Key (DEK), or unencrypted asset payload. All encryption and key derivations occur client-side via the Web Crypto API.
2. **2-of-3 Threshold Cryptography (Shamir Secret Sharing):**  
   The DEK is split into 3 mathematical shares over $\text{GF}(2^8)$. Any single nominee holding 1 card possesses **zero bytes** of recoverable key material. Any 2 distinct nominees can combine their physical or digital recovery cards in their browser to reconstruct the exact 256-bit DEK.
3. **Server-Authoritative Inactivity State Machine:**  
   Vault states strictly progress through server-enforced lifecycle phases:  
   `ACTIVE` &rarr; `CHECKIN_DUE` &rarr; `GRACE_PERIOD` &rarr; `RECOVERY_COOLING_OFF` &rarr; `READY_FOR_RECOVERY`.
4. **Owner Cooling-Off Abort Safety Window:**  
   If an emergency recovery request is initiated, the owner is alerted and has a mandatory cooling-off window to cancel the attempt with a single click, instantly restoring active vault security.
5. **Tamper-Evident Cryptographic Audit Trail:**  
   Every state change, check-in, nominee decision, and payload update is hashed canonically using RFC 8785 JSON canonicalization and appended to a SHA-256 hash chain, guaranteeing verifiable auditability.

---

## 🚀 Live Demo Walkthrough

Try the live production application at **[bjp-tau.vercel.app](https://bjp-tau.vercel.app)**:

| Step | Page | Description |
| :--- | :--- | :--- |
| **1. Create Vault** | [`/vault/new`](https://bjp-tau.vercel.app/vault/new) | Enter assets, choose 3 nominees, and generate 3 cryptographic Recovery Cards client-side. |
| **2. Owner Check-In** | [`/dashboard/checkin`](https://bjp-tau.vercel.app/dashboard/checkin) | Verify your presence with a cryptographic check-in heartbeat to extend the vault deadline by 30 days. |
| **3. Audit Trail** | [`/dashboard/activity`](https://bjp-tau.vercel.app/dashboard/activity) | View the tamper-evident SHA-256 Merkle chain with live verification. |
| **4. Nominee Recovery** | [`/recovery`](https://bjp-tau.vercel.app/recovery) | Paste any 2 of the 3 Recovery Cards to reconstruct the DEK and decrypt the vault locally in memory. |

---

## 🛠️ Tech Stack & Architecture

- **Frontend & App Framework:** Next.js 16 (App Router, Turbopack, React 19)
- **Styling & UI:** Tailwind CSS, Lucide Icons, Mobile-First Responsive Design
- **Cryptographic Primitives:**
  - **Payload Encryption:** AES-256-GCM with Additional Authenticated Data (`vaultId`, schema version)
  - **Key Derivation (KDF):** scrypt (`N=131072, r=8, p=1, dkLen=32`) via `@noble/hashes`
  - **Threshold Splitting:** Shamir's Secret Sharing (2-of-3) via `shamir-secret-sharing` (Privy)
  - **Audit Integrity:** SHA-256 canonical Merkle hash chain
- **Database & Authentication:** Supabase (PostgreSQL with Row Level Security policies)
- **Deployment Platform:** Vercel (Edge network, Serverless Functions)
- **Testing & Verification:** Vitest (101 automated integration, security, and cryptographic unit tests)

---

## 💻 Local Development & Testing

### 1. Prerequisites
- **Node.js:** `>= 20.x`
- **npm:** `>= 10.x`

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/MayankSharma-2812/BJP.git
cd BJP

# Install dependencies
npm install

# Setup local environment (mock storage by default)
cp .env.example .env.local

# Run development server
npm run dev
```

### 3. Verification Suite
```bash
# Run full Vitest test suite (101 tests)
npm test

# Run TypeScript strict typecheck
npm run typecheck

# Run ESLint check
npm run lint

# Run optimized production build
npm run build
```

---

## 📖 Deep-Dive Engineering Documentation

- **[Technology Research & Architectural Decisions](docs/TECH_STACK_RESEARCH.md):** Evidence-based architectural decision records (ADR), comparative tech stack analysis, and security boundary evaluation.
- **[System Architecture & Technical Specification](docs/ARCHITECTURE.md):** Complete cryptographic design specification, mathematical proofs, threat model, tech stack trade-offs, and failure mode analysis.
- **[Live Demo Runbook & Rehearsal Script](docs/DEMO_WALKTHROUGH.md):** Rehearsal script with talking points, curl commands, and expected outputs for live hackathon presentations.

---

## 👥 Authors & Team Contributions

- **Mayank Sharma** (Team Lead) — Cryptographic core, client-side zero-knowledge orchestrators, Shamir secret sharing, UI wizard, and deployment architecture.
- **Shyam Sharma** — Supabase database schema, Row Level Security (RLS) policies, backend API contract implementation, and audit trail hash chaining.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
