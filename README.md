# Last Mile — Zero-Knowledge Family Continuity Vault

> **Hackathon MVP**  
> **Team:** Mayank Sharma (Team Lead) & Shyam

Last Mile helps individuals organize sensitive family financial and administrative information in an encrypted vault that trusted nominees can recover together if the owner becomes unreachable.

---

## Key Pillars

- **Client-Side Encryption:** Vault records are encrypted using AES-256-GCM in the browser before transmission. The server only stores ciphertext envelopes.
- **2-of-3 Shamir Secret Sharing:** The Data Encryption Key (DEK) is split into 3 recovery shares with a threshold of 2. Recovery cards are kept out-of-band; no share bytes are stored on the server.
- **Inactivity State Machine:** Server-authoritative transitions (`ACTIVE` → `CHECK_IN_DUE` → `GRACE_PERIOD` → `RECOVERY_PENDING` → `COOLING_OFF` → `RECOVERY_READY`).
- **Owner Cancellation & Safeguards:** Multi-layer protections prevent accidental release; the owner can cancel false triggers during grace and cooling-off.
- **Tamper-Evident Audit History:** Hash-chained events record operational lifecycle changes.

---

## Tech Stack

- **Framework:** Next.js (App Router), React 19, TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **Database & Auth:** Supabase Auth + PostgreSQL with Row Level Security (RLS)
- **Cryptography:** Web Crypto API, `@noble/hashes` (scrypt), `shamir-secret-sharing` (Privy)

---

## Getting Started

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Setup

```bash
# Clone repository
git clone https://github.com/MayankSharma-2812/BJP.git
cd BJP

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Run checks
npm run lint
npm run typecheck
npm run test

# Run development server
npm run dev
```

---

## Documentation

Full architectural specifications, API contracts, threat model, and test plans are in the [`docs/`](docs/) directory.
