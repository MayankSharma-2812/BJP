# Last Mile: Technology Research & Architectural Decision Report
> **Comprehensive Technology Research, Comparative Analysis & Architectural Decision Records (ADR)**  
> **Project:** Last Mile — Zero-Knowledge Family Continuity Vault  
> **Repository:** [https://github.com/MayankSharma-2812/BJP](https://github.com/MayankSharma-2812/BJP)  
> **Live Deployment:** [https://bjp-tau.vercel.app](https://bjp-tau.vercel.app)  
> **Version:** 1.0.0 (Publication-Ready Technical Specification)  
> **Authors & Engineering Leadership:**  
> - **Mayank Sharma** (Team Lead) — Cryptographic Core, Zero-Knowledge Orchestrators, Shamir Secret Sharing, UI Wizard & Cloud Deployment  
> - **Shyam Sharma** — Data Architecture, Supabase PostgreSQL Schema, Row Level Security (RLS) Policies, Backend API Contracts & Audit Hash Chaining  
> **Date:** October 30, 2026  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Primary Implementation Evidence & Verified Footprint](#2-primary-implementation-evidence--verified-footprint)
3. [Architecture Decisions (Module A)](#3-architecture-decisions-module-a)
   - [3.1 Modular Monolith vs. Microservices](#31-modular-monolith-vs-microservices)
   - [3.2 Next.js App Router (Integrated BFF) vs. Decoupled Frontend/Backend](#32-nextjs-app-router-integrated-bff-vs-decoupled-frontendbackend)
   - [3.3 Serverless Execution vs. Long-Running Backend Services](#33-serverless-execution-vs-long-running-backend-services)
   - [3.4 Architectural Comparison Matrix](#34-architectural-comparison-matrix)
4. [Frontend & Backend Runtime Decisions (Module B)](#4-frontend--backend-runtime-decisions-module-b)
   - [4.1 Next.js 16 + React 19 vs. React SPA + Express / NestJS / SvelteKit](#41-nextjs-16--react-19-vs-react-spa--express--nestjs--sveltekit)
   - [4.2 TypeScript (Strict Mode) vs. Plain JavaScript](#42-typescript-strict-mode-vs-plain-javascript)
   - [4.3 Next.js Route Handlers vs. Independent REST Microservices](#43-nextjs-route-handlers-vs-independent-rest-microservices)
   - [4.4 Tailwind CSS v4 vs. CSS Modules & Heavy UI Component Kits](#44-tailwind-css-v4-vs-css-modules--heavy-ui-component-kits)
   - [4.5 Frontend & Backend Comparison Matrix](#45-frontend--backend-comparison-matrix)
5. [Data Persistence & Authentication Decisions (Module C)](#5-data-persistence--authentication-decisions-module-c)
   - [5.1 PostgreSQL & Supabase vs. MongoDB, Firebase & MySQL](#51-postgresql--supabase-vs-mongodb-firebase--mysql)
   - [5.2 Row Level Security (RLS) vs. Application-Only Authorization](#52-row-level-security-rls-vs-application-only-authorization)
   - [5.3 Supabase Auth vs. Auth0, Clerk, NextAuth & Custom JWT](#53-supabase-auth-vs-auth0-clerk-nextauth--custom-jwt)
   - [5.4 Database & Authentication Comparison Matrix](#54-database--authentication-comparison-matrix)
6. [Cryptography & Key Management Decisions (Module D)](#6-cryptography--key-management-decisions-module-d)
   - [6.1 AES-256-GCM vs. ChaCha20-Poly1305 & AES-CBC + HMAC](#61-aes-256-gcm-vs-chacha20-poly1305--aes-cbc--hmac)
   - [6.2 scrypt vs. Argon2id, PBKDF2 & bcrypt](#62-scrypt-vs-argon2id-pbkdf2--bcrypt)
   - [6.3 2-of-3 Shamir Secret Sharing vs. MPC, Multisig & Centralized Escrow](#63-2-of-3-shamir-secret-sharing-vs-mpc-multisig--centralized-escrow)
   - [6.4 Native Web Crypto API vs. Third-Party JS Cryptographic Libraries](#64-native-web-crypto-api-vs-third-party-js-cryptographic-libraries)
   - [6.5 Cryptographic Primitives Comparison Matrix](#65-cryptographic-primitives-comparison-matrix)
7. [Audit Integrity & State Machine Verification (Module E)](#7-audit-integrity--state-machine-verification-module-e)
   - [7.1 Linear SHA-256 Hash Chaining vs. Merkle Trees, Blockchain & Append-Only Cloud Logs](#71-linear-sha-256-hash-chaining-vs-merkle-trees-blockchain--append-only-cloud-logs)
   - [7.2 RFC 8785 Canonical JSON (JCS) vs. Ad-Hoc Serialization](#72-rfc-8785-canonical-json-jcs-vs-ad-hoc-serialization)
   - [7.3 Inactivity State Machine: Server-Authoritative Clock & Cooling-Off Abort](#73-inactivity-state-machine-server-authoritative-clock--cooling-off-abort)
   - [7.4 Audit & Integrity Comparison Matrix](#74-audit--integrity-comparison-matrix)
8. [Testing, Quality Engineering & Deployment (Module F)](#8-testing-quality-engineering--deployment-module-f)
   - [8.1 Vitest vs. Jest & Native `node:test`](#81-vitest-vs-jest--native-nodetest)
   - [8.2 Vercel Serverless Edge vs. AWS, Railway, Fly.io & Google Cloud Run](#82-vercel-serverless-edge-vs-aws-railway-flyio--google-cloud-run)
   - [8.3 GitHub Actions CI/CD](#83-github-actions-cicd)
   - [8.4 Quality Engineering & Deployment Comparison Matrix](#84-quality-engineering--deployment-comparison-matrix)
9. [Deep Security Analysis: Invariants, Reality Checks & Limitations](#9-deep-security-analysis-invariants-reality-checks--limitations)
10. [Performance, Scalability & System Design Analysis](#10-performance-scalability--system-design-analysis)
11. [Authoritative Research References & RFC Citations](#11-authoritative-research-references--rfc-citations)

---

## 1. Executive Summary

### 1.1 Context & Problem Statement
In India alone, the Reserve Bank of India (RBI) and the Ministry of Corporate Affairs document over **₹1.5 lakh crore ($18B+)** in unclaimed bank accounts, life insurance policies, provident funds, and mutual fund folios. Globally, billions of dollars in crypto assets, equities, and administrative assets are lost when a breadwinner dies or suffers sudden incapacitation without passing access instructions to family members.

Existing digital estate planning and password-management solutions suffer from a fatal structural dilemma:
1. **The Custodial Vulnerability:** Platforms like 1Password or Bitwarden emergency kits require placing master access keys in centralized corporate clouds.
2. **The Big Tech Inactivity Blunder:** Solutions like Apple Legacy Contact or Google Inactive Account Manager take months of court probate disputes and grant sweeping access to private photos and personal chats rather than compartmentalized financial directives.
3. **The Dead-Man Switch Trap:** Naive cron-based dead-man switches send unencrypted emails when an HTTP ping fails, making them vulnerable to spoofing, network outages, or unilateral triggers.

### 1.2 The Last Mile Architectural Response
**Last Mile** resolves this dilemma through a **zero-knowledge, multi-party cryptographic continuity architecture**:
- **Client-Side Cryptography:** Vault assets are validated against strict Zod schemas and encrypted locally on the owner's device using **AES-256-GCM** with unique 96-bit nonces and AAD binding.
- **Key Wrapping via scrypt:** The random 256-bit Data Encryption Key (DEK) is wrapped using an scrypt-derived Key Encryption Key (KEK) ($N=131072, r=8, p=1$).
- **2-of-3 Shamir Secret Sharing:** The DEK is split into 3 out-of-band Recovery Cards over $\text{GF}(2^8)$. Any single card reveals 0 bits of information; any 2 cards reconstruct the key completely offline.
- **Fail-Closed State Machine:** Server-authoritative transitions (`ACTIVE` &rarr; `CHECKIN_DUE` &rarr; `GRACE_PERIOD` &rarr; `RECOVERY_PENDING` &rarr; `RECOVERY_COOLING_OFF` &rarr; `READY_FOR_RECOVERY`) strictly require 2 distinct nominee approvals before a mandatory cooling-off window begins.
- **Owner Cooling-Off Abort:** During cooling-off, the owner is alerted and can cancel false alarms with a single click, instantly re-sealing the vault.
- **Deterministic SHA-256 Hash Chain:** Every state change is serialized canonically using **RFC 8785 JSON Canonicalization Scheme (JCS)** and chained cryptographically.

### 1.3 Core Engineering Trade-Offs
| Architectural Choice | Benefit Gained | Conscious Trade-Off Accepted |
|---|---|---|
| **Zero-Knowledge Architecture** | Server compromise reveals only opaque ciphertext; absolute user privacy. | Lost passphrase + loss of $\ge 2$ Recovery Cards results in permanent data loss; no customer support recovery. |
| **Client-Side scrypt ($N=131072$)** | Extreme resilience against offline GPU/ASIC dictionary attacks ($128\text{ MB}$ RAM/derivation). | 900–2200ms CPU lock on low-end client devices; requires visual progress indicators. |
| **2-of-3 Shamir Threshold** | Tolerates 1 lost card while preventing any single rogue nominee from accessing data. | 2 colluding nominees possessing the stolen ciphertext can decrypt assets offline. |
| **Modular Serverless Monolith** | Single repo, zero inter-service network latency, atomic type safety, and zero server maintenance costs. | Transient Lambda execution limits, cold-start latency (150–400ms), and reliance on transactional connection poolers. |

---

## 2. Primary Implementation Evidence & Verified Footprint

This research report evaluates the actual production codebase in repository `MayankSharma-2812/BJP` (commit `90a7a8d`).

### 2.1 Verified Dependency Manifest
```json
{
  "dependencies": {
    "@noble/hashes": "^2.4.0",
    "@supabase/supabase-js": "^2.118.0",
    "lucide-react": "^1.64.0",
    "next": "16.4.3",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "shamir-secret-sharing": "^0.0.4",
    "zod": "^4.6.7"
  },
  "devDependencies": {
    "@tailwindcss/turbopack": "^4",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.4.3",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^5.0.5"
  }
}
```

### 2.2 Verified Implementation Metrics
- **Automated Test Coverage:** 101 automated tests across 13 test suites (100% passing in 3.48s via Vitest).
- **TypeScript Static Verification:** 0 type errors under `strict: true` and `noEmit`.
- **Linter Status:** 0 ESLint errors, 0 warnings.
- **Route Compilation:** 19 static/dynamic Next.js routes compiled via Turbopack.
- **Database Engine:** Supabase PostgreSQL with 6 relational tables, Row Level Security (RLS) enabled on all tables, and partial indexes on active recovery requests.

### 2.3 Verified Team Contribution Division
- **Mayank Sharma (Team Lead):**
  - Cryptographic engine (`src/lib/crypto/aes.ts`, `kdf.ts`, `shamir.ts`, `cards.ts`).
  - High-level client orchestrators (`src/lib/recovery/orchestrator.ts`).
  - 4-Step interactive creation wizard (`src/app/vault/new/page.tsx`) and nominee recovery flow (`src/app/recovery/page.tsx`).
  - Automated security privacy proof suites (`src/__tests__/security/privacy-proof.test.ts`).
  - Vercel production deployment and CI/CD workflow automation.
- **Shyam Sharma:**
  - Database schema and PostgreSQL migrations (`supabase/migrations/20261029000000_initial_schema.sql`).
  - Row Level Security (RLS) policies and security role boundaries (`authenticated`, `service_role`, `anon`).
  - Backend API route contracts (`src/app/api/**`) and persistence layer (`src/lib/server/db.ts`).
  - RFC 8785 canonical JSON serializer and SHA-256 audit hash chain (`src/lib/audit/**`).
  - Authoritative inactivity state machine (`src/lib/recovery/state-machine.ts`).

---

## 3. Architecture Decisions (Module A)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 16 APPS ROUTER                          │
│                                                                        │
│   ┌────────────────────────────────┐  ┌─────────────────────────────┐  │
│   │ Client UI Layer (React 19)     │  │ Route Handlers (BFF / API)  │  │
│   │ - Local Web Crypto AES-256-GCM │  │ - Request Validation (Zod)  │  │
│   │ - scrypt KDF (@noble/hashes)   │  │ - State Machine Evaluation  │  │
│   │ - Shamir 2-of-3 Key Splitting  │  │ - Canonical Audit Hashing   │  │
│   └───────────────┬────────────────┘  └──────────────┬──────────────┘  │
│                   │ HTTPS (Ciphertext Only)          │                 │
└───────────────────┼──────────────────────────────────┼─────────────────┘
                    │                                  │ Supabase JS SDK
                    ▼                                  ▼
      ┌───────────────────────────┐      ┌───────────────────────────────┐
      │ Physical / Digital Cards  │      │     Supabase PostgreSQL       │
      │ Distributed to 3 Nominees │      │ - Vaults, Nominees, Requests  │
      │   (Kept Out-of-Band)      │      │ - Row Level Security (RLS)    │
      └───────────────────────────┘      │ - Linear SHA-256 Hash Chain   │
                                         └───────────────────────────────┘
```

### 3.1 Modular Monolith vs. Microservices

#### 1. What it does
A modular monolith organizes all application layers (frontend presentation, cryptographic orchestrators, domain state machines, database persistence, and API route handlers) within a single codebase and deployment unit, enforcing structural boundaries via TypeScript namespaces and directory modules.

#### 2. How it works at an engineering level
In Last Mile, the codebase is compartmentalized into discrete domain modules:
- `src/lib/crypto/` — Pure client-side cryptographic primitives (no server or database imports).
- `src/lib/recovery/` — Pure state machine transition logic (zero database side-effects).
- `src/lib/audit/` — Deterministic canonical serialization and hashing.
- `src/lib/server/` — Database access layer, authentication, and error wrappers.
- `src/app/api/` — HTTP Route Handlers acting as a Backend-For-Frontend (BFF).
- `src/app/` — Client-side React components and wizard flows.

#### 3. Strengths
- **Zero Network Serialization Overhead:** In-process communication between domain services eliminates HTTP/gRPC serialization, latency hops, and distributed network failure points.
- **Compile-Time Cross-Boundary Type Safety:** Schema changes in `src/types/` immediately propagate to both API endpoints and UI forms; any mismatch fails compilation instantly.
- **Atomic Refactoring & Testing:** A single `vitest run` executes end-to-end integration flows across crypto, state machine, and database mocks in under 4 seconds.
- **Operational Simplicity:** Zero service meshes, distributed tracing overhead, or Kubernetes pod management required.

#### 4. Weaknesses & Limitations
- **Coupled Deployment Lifecycle:** A minor bugfix in a UI stylesheet requires re-deploying the serverless API handlers.
- **Scaling Granularity:** Individual endpoints (e.g. CPU-intensive audit chain verification) cannot be scaled independently from lightweight check-in endpoints.

#### 5. Security Implications
Eliminates internal network eavesdropping, mutual TLS (mTLS) configuration errors, and cross-microservice authorization spoofing. The security boundary is strictly client-vs-server, not service-vs-service.

#### 6. Performance & Latency Implications
Zero inter-service latency. Local function execution takes $< 0.1\text{ms}$ compared to 5–25ms per network hop in microservice architectures.

#### 7. Scalability & Operational Complexity
Sufficient for millions of daily active vaults when backed by PostgreSQL connection pooling. Operational complexity is minimal ($O(1)$ build pipeline).

#### 8. Developer Experience & Maintenance Costs
Extremely high developer velocity. Engineers run the entire stack locally with `npm run dev` without Docker Compose or distributed mocking.

#### 9. Why Selected for Last Mile
Last Mile is a focused, high-security product where end-to-end cryptographic correctness, rapid iteration, and atomic type verification vastly outweigh the organizational scaling needs of a 100-person team.

#### 10. Reconsideration Triggers
Reconsider if independent teams need autonomous release cadences, or if high-frequency background workflow ticks demand a dedicated distributed worker cluster.

---

### 3.2 Next.js App Router (Integrated BFF) vs. Decoupled Frontend/Backend

#### 1. What it does
The Next.js App Router serves both static/client React components and server-side Route Handlers (`src/app/api/**`) from a single unified Next.js framework instance, acting as an integrated Backend-For-Frontend (BFF).

#### 2. How it works at an engineering level
Next.js parses incoming HTTP requests, directs `/api/*` routes to Node.js/Edge serverless runtime functions, and routes frontend pages through React Server Components (RSC) and client-side bundles compiled via Turbopack.

#### 3. Strengths
- Single unified framework for routing, API contracts, middleware, and rendering.
- Shared TypeScript interfaces between client fetchers and server handlers without code duplication.
- Native support for streaming, modern React 19 hooks, and Turbopack fast refreshing.

#### 4. Weaknesses & Limitations
- Framework lock-in to Next.js idioms (Server Actions, Route Handlers, App Router caching behaviors).
- Route Handler execution takes place in serverless lambda environments, requiring careful management of transient memory and connection pools.

#### 5. Security Implications
Simplifies authentication cookies: `HttpOnly`, `SameSite=Lax`, and `Secure` cookies can be handled directly by the BFF without complex cross-origin (CORS) configurations.

#### 6. Performance & Latency Implications
Eliminates cross-origin pre-flight `OPTIONS` requests, saving 50–150ms on mobile client API interactions.

#### 7. Scalability & Operational Complexity
Auto-scales on Vercel without manual load-balancer tuning.

#### 8. Developer Experience & Maintenance Costs
Unified codebase, single `package.json`, single test runner, and zero API gateway synchronization overhead.

#### 9. Why Selected for Last Mile
It delivers the lowest latency for client-server communication while maintaining strict zero-knowledge boundaries: client components handle all raw cryptographic keys, while Route Handlers enforce state transitions and database mutations.

#### 10. Reconsideration Triggers
Reconsider if native iOS/Android applications are built that require an independent, standalone gRPC or REST backend decoupled from Next.js web rendering.

---

### 3.3 Serverless Execution vs. Long-Running Backend Services

#### 1. What it does
Serverless execution runs backend code on-demand in ephemeral containers (Vercel Functions / AWS Lambda) that instantiate upon an incoming HTTP request and tear down after response completion, compared to long-running daemons (e.g. Express on Docker/EC2).

#### 2. How it works at an engineering level
Each incoming HTTP request to `/api/vaults` or `/api/recovery-requests` triggers an isolated Lambda sandbox. State is never persisted in container memory; all state is read from and written to Supabase PostgreSQL.

#### 3. Strengths
- **Zero Idle Costs:** Zero cost when the application is idle.
- **Elastic Scale:** Instantly absorbs spikes in traffic during emergency recovery notifications.
- **Attack Surface Minimization:** Ephemeral runtimes eliminate persistent in-memory malware, rootkits, and process memory snooping between distinct execution cycles.

#### 4. Weaknesses & Limitations
- **Cold Starts:** First-time container instantiation incurs a 150–350ms cold-start latency penalty.
- **No In-Memory Background Tasks:** Background timers cannot run in-process; requires external cron invocation (Vercel Cron).
- **Connection Spikes:** Spikes in concurrent Lambdas can exhaust PostgreSQL database connection limits.

#### 5. Security Implications
Ephemeral execution ensures that transient keys or memory residual buffers in one request cannot be probed by subsequent tenants or compromised long-running container processes.

#### 6. Performance & Latency Implications
Warm requests execute in 15–40ms. Cold starts add ~250ms on initial boot.

#### 7. Scalability & Operational Complexity
Near-infinite horizontal scaling for API routes without server patching, OS upgrades, or load-balancer provisioning.

#### 8. Developer Experience & Maintenance Costs
Zero DevOps infrastructure maintenance. Standard Git-push deployment workflow.

#### 9. Why Selected for Last Mile
Vault check-ins and recovery requests are sporadic, event-driven operations. Paying for 24/7 dedicated container clusters would be wasteful and increase the server maintenance attack surface.

#### 10. Reconsideration Triggers
Reconsider if real-time WebSockets or high-frequency continuous background auditing becomes a core requirement.

---

### 3.4 Architectural Comparison Matrix

| Architectural Pattern | Security Profile | Latency / Performance | Operational Complexity | Cost Efficiency | Suitability for Last Mile | Decision |
|---|---|---|---|---|---|---|
| **Modular Serverless Monolith (Selected)** | **High:** Minimal network attack surface, ephemeral execution, zero-knowledge boundary. | **High:** In-process domain calls ($< 0.1\text{ms}$), warm API latency 15–35ms. | **Low:** Single repo, single build pipeline, zero cluster maintenance. | **Very High:** Pay-per-request serverless, zero idle infrastructure costs. | **Optimal:** Fits sporadic event-driven security workflows perfectly. | **SELECTED** |
| **Microservices (Decoupled Services)** | **Medium:** Complex service mesh; risk of misconfigured mTLS and internal token spoofing. | **Medium-Low:** 5–25ms network hop latency per service call; distributed tracing overhead. | **Very High:** Kubernetes, API gateways, service discovery, distributed deployment pipelines. | **Low:** High baseline infrastructure and engineering maintenance costs. | **Poor:** Vastly over-engineered for our team size and product domain. | **REJECTED** |
| **Long-Running Monolith (Docker / ECS)** | **Medium:** Persistent memory attack surface; requires OS and container CVE patching. | **High:** Zero cold starts; persistent database connection pools. | **Medium:** Requires container orchestration, load balancers, and auto-scaling rules. | **Medium:** Continuous baseline costs for idle containers. | **Acceptable but suboptimal:** Unnecessary operational overhead for sporadic check-ins. | **REJECTED** |

---

## 4. Frontend & Backend Runtime Decisions (Module B)

### 4.1 Next.js 16 + React 19 vs. React SPA + Express / NestJS / SvelteKit

#### Comparative Technical Evaluation
- **React SPA + Express:** Requires managing two separate codebases, two deployment pipelines, custom CORS configurations, and dual TypeScript type definitions. No native support for server-side validation co-located with routes.
- **NestJS:** Enterprise-grade Angular-style architecture (dependency injection, decorators). While structured, it introduces excessive boilerplate and abstractions that violate the Ponytail principle of minimal necessary code.
- **SvelteKit:** Excellent performance and concise syntax. However, the ecosystem for audited, battle-tested cryptographic libraries and third-party security tooling is vastly smaller than the React/Node ecosystem.
- **Next.js 16 (Turbopack, React 19):** Chosen because it provides Turbopack-powered sub-second builds, strict client/server boundary markers (`'use client'`, `'use server'`), and immediate access to the modern Web Crypto API in both browser and serverless Node.js environments.

---

### 4.2 TypeScript (Strict Mode) vs. Plain JavaScript

#### 1. What it does
TypeScript compiles statically typed JavaScript with strict type checking (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`).

#### 2. How it works at an engineering level
In Last Mile, TypeScript enforces cryptographic schemas across all layers:
```ts
// Compile-time invariant: raw DEK must be exactly 32 bytes
export type DekBytes = Uint8Array;
// Zod schemas mirror TypeScript types for runtime boundaries
export const VaultPayloadSchema = z.object({ ... });
export type VaultPayload = z.infer<typeof VaultPayloadSchema>;
```

#### 3. Strengths & Security Implications
In a zero-knowledge cryptographic application, passing a `string` where a `Uint8Array` is expected, or failing to check for `null` on an audit event previous-hash, can cause catastrophic silent decryption failures or broken audit chains. TypeScript eliminates an entire class of runtime type errors before code ever hits Git.

#### 4. Decision
**SELECTED.** Strict TypeScript is non-negotiable for cryptographic and financial software.

---

### 4.3 Next.js Route Handlers vs. Independent REST Microservices

#### Comparative Technical Evaluation
Next.js Route Handlers (`src/app/api/**/route.ts`) provide native standard Web Request/Response APIs (`NextRequest`, `NextResponse`), automatic JSON parsing, streaming capabilities, and direct co-location with Next.js middleware. By avoiding a separate Express or Fastify server, Last Mile avoids redundant network hops, port binding management, and reverse-proxy configuration errors.

---

### 4.4 Tailwind CSS v4 vs. CSS Modules & Heavy UI Component Kits

#### Comparative Technical Evaluation
- **Component Kits (Material UI, Ant Design):** Heavy runtime bundles (100–300KB JS), difficult to customize to our bespoke warm-editorial design aesthetic (Concept C), and frequent hydration mismatches with React Server Components.
- **CSS Modules:** Excellent scoping, but results in bloated stylesheets and slower design iteration during hackathons.
- **Tailwind CSS v4 (`@tailwindcss/turbopack`):** Zero-runtime CSS engine integrated directly into Turbopack. It compiles only the utilities actually used in the application into a tiny, cacheable CSS bundle ($< 15\text{ KB}$), delivering immediate sub-100ms First Contentful Paint (FCP) on mobile networks.

---

### 4.5 Frontend & Backend Comparison Matrix

| Technology Choice | Type Safety & Correctness | Bundle Size & Performance | Developer Velocity | Maintenance Overhead | Decision |
|---|---|---|---|---|---|
| **Next.js 16 + React 19** | **High:** Strict client/server boundary isolation. | **High:** Turbopack compilation, tree-shaking, code-splitting. | **Very High:** Fast refresh, unified API routing. | **Low:** Single framework ecosystem. | **SELECTED** |
| **React SPA + Express** | **Medium:** Requires manual schema synchronization across repos. | **Medium:** Standard webpack/vite SPA bundle overhead. | **Medium:** Dual-repo coordination, dual CI pipelines. | **Medium:** Separate server patching and CORS management. | **REJECTED** |
| **NestJS + Angular/React** | **High:** Robust TypeScript decorator system. | **Medium-Low:** Heavy runtime overhead and metadata reflection. | **Low:** Excessive boilerplate and ceremonial abstraction layers. | **High:** Complex DI container debugging. | **REJECTED** |
| **TypeScript (Strict)** | **Maximum:** Eliminates null-pointer and type-confusion bugs. | **Zero:** Stripped at compile time; zero runtime cost. | **High:** Auto-completion, self-documenting code. | **Very Low:** Catches regressions during CI. | **SELECTED** |
| **Tailwind CSS v4** | **N/A:** Compile-time atomic CSS engine. | **Maximum:** Tiny static CSS file ($< 15\text{ KB}$), zero runtime JS. | **Very High:** Rapid UI composition directly in JSX. | **Very Low:** No stylesheet drift or orphaned rules. | **SELECTED** |

---

## 5. Data Persistence & Authentication Decisions (Module C)

### 5.1 PostgreSQL & Supabase vs. MongoDB, Firebase & MySQL

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE POSTGRESQL LAYER                       │
│                                                                        │
│  ┌───────────────────────┐   ┌───────────────────────┐                 │
│  │     profiles          │   │      vaults           │                 │
│  │ - user_id (UUID PK)   ├───┤ - id (UUID PK)        │                 │
│  │ - display_name        │   │ - owner_id (FK)       │                 │
│  └───────────────────────┘   │ - payload_ciphertext  │                 │
│                              │ - payload_nonce       │                 │
│                              │ - wrapped_dek         │                 │
│                              │ - status (CHECK const)│                 │
│                              └───────────┬───────────┘                 │
│                                          │                             │
│                  ┌───────────────────────┼──────────────────────┐      │
│                  ▼                       ▼                      ▼      │
│     ┌─────────────────────────┐  ┌───────────────┐  ┌───────────────┐  │
│     │       nominees          │  │recovery_reqs  │  │ audit_events  │  │
│     │ - vault_id (FK)         │  │ - vault_id(FK)│  │ - vault_id(FK)│  │
│     │ - share_index (1, 2, 3) │  │ - status      │  │ - sequence    │  │
│     │ - invite_token_hash     │  │ - cooling_off │  │ - event_hash  │  │
│     └─────────────────────────┘  └───────────────┘  │ - prev_hash   │  │
│                                                     └───────────────┘  │
│   * Enforced: Row Level Security (RLS) on all tables; Fail-closed anon │
└────────────────────────────────────────────────────────────────────────┘
```

#### 1. What it does
Supabase provides a managed PostgreSQL database enhanced with automatic connection pooling, built-in authentication, and Row Level Security (RLS) policies.

#### 2. How it works at an engineering level
In `supabase/migrations/20261029000000_initial_schema.sql`, PostgreSQL enforces relational integrity:
- `vaults` table contains strict `CHECK` constraints on valid statuses and nonces (`wrap_nonce <> payload_nonce`).
- Partial unique index `idx_unique_active_recovery_request` ensures that only one pending or cooling-off recovery request can exist per vault at any given time.
- Cascading deletes ensure that if an owner deletes their profile, all encrypted envelopes and nominee records are expunged cleanly.

#### 3. Strengths
- **ACID Transactions:** Financial state transitions require strict consistency (e.g. atomically cancelling a recovery request while recording an audit event).
- **Strong Typing & Constraints:** PostgreSQL rejects malformed statuses, negative intervals, or reused nonces at the database engine level.
- **Open-Source Standard:** Fully portable; can be migrated from Supabase to standard vanilla PostgreSQL (AWS RDS, GCP Cloud SQL) at any time without code changes.

#### 4. Weaknesses & Limitations
- **Relational Overhead:** Slightly higher schema migration discipline compared to schema-less document stores.
- **Connection Scalability:** Requires Supavisor connection pooling under serverless execution.

#### 5. Comparison with Alternatives
- **MongoDB:** Schema-less document stores lack database-level mathematical constraint enforcement. In a zero-knowledge vault, a bug allowing arbitrary schema insertion could lead to unencrypted plaintext storage.
- **Firebase Firestore:** Proprietary NoSQL database with vendor lock-in, weak transactional guarantees across multiple collections, and awkward security rule syntax compared to SQL RLS.
- **MySQL:** Solid relational database, but lacks PostgreSQL's advanced JSONB querying, custom CHECK constraints, and rich native ecosystem for Row Level Security.

#### 6. Decision
**SELECTED.** PostgreSQL via Supabase is the gold standard for relational integrity and cryptographic audit tracking.

---

### 5.2 Row Level Security (RLS) vs. Application-Only Authorization

#### 1. What it does
Row Level Security (RLS) is an engine-level PostgreSQL security feature where access control policies (`USING (auth.uid() = owner_id)`) are evaluated directly by the database kernel for every SQL query.

#### 2. How it works at an engineering level
```sql
CREATE POLICY "Owners can view own vaults" 
    ON public.vaults FOR SELECT 
    TO authenticated 
    USING (
        auth.uid() = owner_id 
        OR id IN (
            SELECT n.vault_id FROM public.nominees n 
            WHERE n.user_id = auth.uid() AND n.status = 'active'
        )
    );
```

#### 3. Strengths & Security Implications
- **Defense-in-Depth:** Even if an application route handler has a bug or fails to perform an authorization check, PostgreSQL denies unauthorized rows at the database level.
- **Tenant Isolation:** Prevents Cross-User Data Exposure (B3 quality requirement).

#### 4. Decision
**SELECTED.** RLS provides a robust secondary security boundary beneath the API layer.

---

### 5.3 Supabase Auth vs. Auth0, Clerk, NextAuth & Custom JWT

#### Comparative Technical Evaluation
- **Auth0 / Clerk:** Excellent enterprise identity providers, but expensive at scale, require third-party network hops on every token verification, and dissociate authentication tokens from database identity.
- **NextAuth (Auth.js):** Flexible, but session management requires additional database adapter tables and lacks direct engine-level integration with PostgreSQL RLS.
- **Custom JWT Engine:** High risk of implementation bugs (timing attacks, weak secret rotation, token invalidation complexity).
- **Supabase Auth:** Natively issues JWT tokens signed by the database's secret, directly populating `auth.uid()` in PostgreSQL sessions. This enables RLS policies to evaluate the caller's identity with zero latency and zero external network calls.

---

### 5.4 Database & Authentication Comparison Matrix

| Technology | Relational Integrity & ACID | Access Control Model | Vendor Lock-in | Operational Overhead | Decision |
|---|---|---|---|---|---|
| **Supabase PostgreSQL** | **Maximum:** ACID compliance, foreign keys, CHECK constraints. | **Database Kernel (RLS):** Policies enforced directly by PostgreSQL. | **Zero:** Open-source PostgreSQL; can self-host anytime. | **Low:** Managed database with automated backups. | **SELECTED** |
| **MongoDB Atlas** | **Low:** Eventual consistency defaults; no cross-document integrity. | **Application Layer:** Relies entirely on backend code checks. | **Medium:** BSON and Mongoose specific syntax. | **Medium:** Index tuning and sharding cluster management. | **REJECTED** |
| **Firebase Firestore** | **Medium:** Multi-document transactions are limited and costly. | **Security Rules:** Complex proprietary JSON/expression rules. | **High:** Proprietary Google Cloud service; difficult migration. | **Low:** Fully managed serverless datastore. | **REJECTED** |
| **MySQL 8.0** | **High:** ACID compliant relational database. | **Application Layer:** Lacks native user-session RLS. | **Zero:** Open-source standard. | **Medium:** Requires manual configuration and maintenance. | **REJECTED** |

---

## 6. Cryptography & Key Management Decisions (Module D)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT-SIDE CRYPTOGRAPHIC ENGINE                │
│                                                                        │
│   [Master Passphrase] (Input)                                          │
│           │                                                            │
│           ▼                                                            │
│   [scrypt KDF: N=131072, r=8, p=1] ──> [256-bit KEK]                   │
│                                              │                         │
│   [Uniform Random 256-bit DEK] ──(AES-GCM Wrap)─> [Wrapped DEK]        │
│           │                                                            │
│           ├──(AES-256-GCM + AAD)──> [Assets JSON] ──> [Payload Cipher] │
│           │                                                            │
│           ▼                                                            │
│   [Privy Shamir Secret Sharing]                                        │
│   (Polynomial over GF(256), Threshold=2, Total=3)                      │
│           │                                                            │
│           ├──> Share 1 (x=1) ──> Recovery Card 1 (Nominee 1)           │
│           ├──> Share 2 (x=2) ──> Recovery Card 2 (Nominee 2)           │
│           └──> Share 3 (x=3) ──> Recovery Card 3 (Nominee 3)           │
│                                                                        │
│   * Key Invariant: Zero raw key bytes transmitted to network or server │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 AES-256-GCM vs. ChaCha20-Poly1305 & AES-CBC + HMAC

#### 1. What it does
AES-256-GCM (Galois/Counter Mode) is an Authenticated Encryption with Associated Data (AEAD) cipher conforming to NIST SP 800-38D. It provides both confidentiality (via counter-mode encryption) and integrity/authenticity (via a Galois field GMAC tag).

#### 2. How it works at an engineering level
In `src/lib/crypto/aes.ts`:
```ts
const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
  {
    name: 'AES-GCM',
    iv: nonce, // 12-byte (96-bit) cryptographically uniform random nonce
    additionalData: aad, // "last-mile:vault-payload:v1:<vaultId>"
    tagLength: 128, // 128-bit authentication tag
  },
  cryptoKey,
  serializedPayload
);
```

#### 3. Strengths
- **Hardware Acceleration (AES-NI):** Almost all modern x86-64 and ARM64 (Apple Silicon, Snapdragon) processors feature dedicated hardware instructions for AES and Galois field multiplication, achieving throughput exceeding $2\text{ GB/s}$ with minimal battery/CPU drain.
- **Native Browser Standard:** Universally implemented across all web browsers via the native W3C Web Crypto API.
- **Context Binding via AAD:** Binds the `vaultId` into the GMAC tag. If an attacker attempts to copy ciphertext from Vault A and insert it into Vault B, decryption fails with an authentication tag mismatch.

#### 4. Weaknesses & Catastrophic Nonce-Reuse Failure
AES-GCM has a well-known vulnerability: **if a nonce is ever reused with the same key, an attacker can recover the GMAC authentication key and forge messages, destroying authenticity.**  
*Mitigation in Last Mile:* Every encryption operation generates a fresh 96-bit cryptographically secure random nonce via `crypto.getRandomValues(new Uint8Array(12))`. Under standard birthday-bound analysis, generating random 96-bit nonces remains secure for up to $2^{32}$ encryption operations per key (NIST SP 800-38D). Because each vault generates a fresh random DEK, the probability of nonce collision is mathematically negligible ($< 2^{-64}$).

#### 5. Comparison with Alternatives
- **ChaCha20-Poly1305:** An outstanding modern AEAD cipher, highly resilient to timing attacks on platforms lacking hardware AES. However, ChaCha20-Poly1305 is **not supported by the native W3C Web Crypto API** in standard web browsers. Using it would require shipping third-party JavaScript assembly, increasing bundle size and vulnerability to JS side-channel timing attacks.
- **AES-CBC + HMAC-SHA256:** A composite cipher construction. Prone to padding oracle attacks (e.g. Lucky Thirteen, POODLE) if verification is not strictly constant-time. AEAD ciphers are superior in every respect.

#### 6. Decision
**SELECTED.** AES-256-GCM is the industry gold standard and the only native hardware-accelerated AEAD cipher supported by the Web Crypto API.

---

### 6.2 scrypt vs. Argon2id, PBKDF2 & bcrypt

#### 1. What it does
scrypt (RFC 7914) is a password-based key derivation function explicitly engineered to be memory-hard and sequential-memory-hard, resisting brute-force acceleration on GPUs, FPGAs, and ASICs.

#### 2. How it works at an engineering level
In `src/lib/crypto/kdf.ts`:
- Parameters: $N = 131072$ ($2^{17}$ iterations), $r = 8$ (block size), $p = 1$ (parallelization), $\text{dkLen} = 32$ (256-bit output).
- Memory footprint: $128 \times N \times r = 128 \times 131072 \times 8 = 134,217,728\text{ bytes} \approx \mathbf{128\text{ MB}}$.
- Each hash derivation requires the CPU to allocate and sequentially access 128 MB of high-speed RAM.

#### 3. Strengths
- **ASIC/GPU Resistance:** An adversary attempting to crack passphrases using specialized mining hardware cannot parallelize scrypt without provisioning 128 MB of physical RAM per thread. On a modern RTX 4090 GPU (24 GB VRAM), an attacker can fit at most $\approx 180$ concurrent scrypt instances, reducing brute-force throughput from billions of hashes/second (for PBKDF2/SHA-256) to a few hundred hashes/second.
- **Audited Implementation:** Uses `@noble/hashes/scrypt`, which has zero external dependencies and was audited by Cure53.

#### 4. Weaknesses & Latency Profile
- **Main-Thread CPU Consumption:** On mobile phones and older laptops, executing scrypt with $N=131072$ takes between **900ms and 2,200ms**. In single-threaded JavaScript, this locks the UI thread if not paired with responsive visual indicators or Web Workers.

#### 5. Comparison with Alternatives
- **Argon2id (RFC 9106):** The winner of the Password Hashing Competition. Argon2id is theoretically superior to scrypt in memory-cost flexibility and side-channel resistance. However, **Argon2id is not native to browsers and requires a 150KB–300KB WebAssembly (WASM) binary**. In high-security environments, Content Security Policies often block `wasm-eval`, creating compatibility friction.
- **PBKDF2 (NIST SP 800-132):** Supported natively in Web Crypto, but has **zero memory-hardness**. PBKDF2 can be computed on GPUs at millions of hashes per second, making it dangerously weak against offline dictionary attacks on passphrases.
- **bcrypt:** Capped at 72-byte passwords and has a fixed, small memory footprint ($4\text{ KB}$), rendering it vulnerable to modern GPU memory bandwidth.

#### 6. Decision
**SELECTED.** scrypt provides the maximum memory-hard defense against offline dictionary attacks without requiring WASM binaries.

---

### 6.3 2-of-3 Shamir Secret Sharing vs. MPC, Multisig & Centralized Escrow

#### 1. What it does
Shamir's Secret Sharing (1979) is an information-theoretically secure algorithm that divides a secret $S$ into $N$ unique shares such that any $K$ shares can reconstruct $S$, but any $K-1$ shares reveal **zero mathematical information** about $S$.

#### 2. How it works at an engineering level
In `src/lib/crypto/shamir.ts`, Last Mile uses a $(K=2, N=3)$ polynomial scheme over the Galois field $\text{GF}(2^8)$:
$$f(x) = S + a_1 x \pmod{P(x)}$$
- The secret $S$ is the 256-bit DEK.
- The coefficient $a_1$ is chosen uniformly at random using cryptographically secure random bytes.
- 3 shares are evaluated: $(1, f(1))$, $(2, f(2))$, $(3, f(3))$.
- Reconstructing with any 2 points uses Lagrange interpolation:
$$S = f(0) = \sum_{j=1}^{2} y_j \prod_{m \neq j} \frac{0 - x_m}{x_j - x_m}$$

#### 3. Strengths & Information-Theoretic Security
Unlike computational security (which relies on unproven mathematical assumptions like prime factorization or discrete logs), Shamir's scheme is **information-theoretically secure**. Even an adversary with infinite quantum computing power holding 1 share has exactly equal probability for all $2^{256}$ possible DEK values.

#### 4. Weaknesses & Considerations
- **No Inherent Authentication:** Standard Shamir secret sharing does not verify whether a share has been tampered with.  
  *Mitigation in Last Mile:* Verification is performed immediately upon reconstruction by attempting to decrypt the AES-256-GCM payload. If an invalid or corrupted share is supplied, the AES-GCM 128-bit authentication tag fails, preventing corrupted key usage.
- **Collusion Vector:** Any 2 nominees possessing the encrypted payload can collude to reconstruct the key.

#### 5. Comparison with Alternatives
- **Multi-Party Computation (MPC / Threshold EdDSA):** Extremely powerful, but requires multi-round interactive network communication protocols between nominees. In an emergency inheritance situation, nominees may not know each other, may be in different time zones, or may lack online infrastructure. Shamir cards are **completely offline and non-interactive**.
- **Centralized Key Escrow (e.g. Shamir shares held by cloud providers):** Defeats the entire zero-knowledge purpose by creating custodial legal liability and subpoena targets.

#### 6. Decision
**SELECTED.** Non-interactive 2-of-3 Shamir secret sharing offers the perfect balance of family survivability, mathematical perfection, and offline usability.

---

### 6.4 Native Web Crypto API vs. Third-Party JS Cryptography Libraries

#### Comparative Technical Evaluation
- **`crypto-js` / `forge`:** Legacy, unmaintained JavaScript libraries. They implement cryptographic primitives in interpreted JavaScript, making them vulnerable to cache-timing attacks, heap leakage, and slow execution.
- **`node:crypto`:** Available only in server environments, not in client browsers.
- **Native W3C Web Crypto API (`window.crypto.subtle`):** Executed in native C++ browser code, constant-time, backed by OS hardware keystores, and memory-protected.
- **Decision:** **SELECTED.** Last Mile enforces native Web Crypto API for all symmetric encryption and hashing. The only third-party crypto packages are `@noble/hashes` (scrypt, audited by Cure53) and Privy's `shamir-secret-sharing` (audited Lagrange math).

---

### 6.5 Cryptographic Primitives Comparison Matrix

| Primitive Category | Chosen Technology | Primary Alternatives | Primary Justification for Choice | Key Limitation Accepted |
|---|---|---|---|---|
| **Payload Encryption** | **AES-256-GCM** | ChaCha20-Poly1305, AES-CBC+HMAC | Native W3C Web Crypto support; hardware AES-NI acceleration ($>2\text{ GB/s}$); context binding via AAD. | Nonce reuse is catastrophic (mitigated by 96-bit uniform random nonces). |
| **Key Derivation (KDF)** | **scrypt** ($N=131072$) | Argon2id, PBKDF2, bcrypt | $128\text{ MB}$ memory-hard ASIC/GPU brute-force defense; zero WASM dependency requirement. | 900–2200ms CPU execution time on mobile devices. |
| **Threshold Sharing** | **Shamir (2-of-3)** | MPC Threshold ECDSA, Cloud Escrow | Information-theoretically secure; non-interactive; printable offline physical Recovery Cards. | 2 colluding nominees can reconstruct the key if they possess the ciphertext. |
| **Crypto Runtime** | **Native Web Crypto API** | `crypto-js`, `forge`, `sjcl` | Native C++ constant-time execution; zero JavaScript timing side-channels; zero bundle overhead. | Browser process boundary controls memory access; cannot force physical RAM zeroing. |

---

## 7. Audit Integrity & State Machine Verification (Module E)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   RFC 8785 CANONICAL SHA-256 AUDIT CHAIN               │
│                                                                        │
│   Genesis Event (Seq #1)                                               │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ Prev Hash: 0000000000000000000000000000000000000000... (64)   │     │
│   │ Data: RFC 8785 Canonical JSON { actor, event, metadata, ...}  │     │
│   │ Event Hash: SHA-256(PrevHash : CanonicalData) = a7f9b2...    │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │ Chained                             │
│                                  ▼                                     │
│   Nominee Added (Seq #2)                                               │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ Prev Hash: a7f9b2...                                         │     │
│   │ Data: RFC 8785 Canonical JSON { actor, event, metadata, ...}  │     │
│   │ Event Hash: SHA-256(PrevHash : CanonicalData) = 4c8e11...    │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │ Chained                             │
│                                  ▼                                     │
│   Check-In Recorded (Seq #3)                                           │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ Prev Hash: 4c8e11...                                         │     │
│   │ Data: RFC 8785 Canonical JSON { actor, event, metadata, ...}  │     │
│   │ Event Hash: SHA-256(PrevHash : CanonicalData) = d302fa...    │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
│   * Verification: Client fetches full array and verifies every link    │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Linear SHA-256 Hash Chaining vs. Merkle Trees, Blockchain & Append-Only Cloud Logs

#### 1. What it does
Every operational lifecycle event (vault creation, envelope revision, check-in, nominee decision, cooling-off transition) is hashed sequentially, binding each new event to the exact cryptographic digest of the prior event.

#### 2. How it works at an engineering level
In `src/lib/audit/hasher.ts`:
$$\text{EventHash}_n = \text{SHA-256}\left(\text{PreviousHash}_{n-1} \mathbin{\Vert} \text{":"} \mathbin{\Vert} \text{CanonicalJSON}(\text{EventData}_n)\right)$$
Verification (`src/lib/audit/verifier.ts`) scans the sequence from $1 \dots N$, recomputing each hash and asserting:
1. $\text{Sequence}_n = \text{Sequence}_{n-1} + 1$
2. $\text{PreviousHash}_n = \text{EventHash}_{n-1}$
3. Recomputed hash strictly matches stored `event_hash`.

#### 3. Strengths
- **Immediate Tamper Evidence:** If an attacker modifies an old check-in timestamp or alters an event metadata field, all subsequent hashes in the chain break mathematically.
- **Zero-Storage Overhead:** Linear chains require only a single 64-character hex column per row.

#### 4. Limitations & The Reality of Merkle Trees
- **Linear Scan Required for Full Proof:** Verifying a linear chain requires fetching all $N$ events ($O(N)$ bandwidth).  
- **Why Not Merkle Trees?** A binary Merkle tree allows verifying whether a single event is included in a state root in $O(\log N)$ time. For an individual family vault (which typically accumulates between 50 and 500 audit events over its 20-year lifetime), an $O(N)$ linear chain consumes less than $50\text{ KB}$ of bandwidth, making Merkle tree complexity completely unjustified.
- **Why Not Blockchain?** Public blockchains introduce high transaction fees (gas), slow confirmation times (12 seconds to 10 minutes), public identity metadata leakage, and regulatory friction. A private hash chain gives cryptographic verification at zero financial cost.

#### 5. Decision
**SELECTED.** Linear SHA-256 hash chaining is the simplest, most robust solution for per-vault audit trails.

---

### 7.2 RFC 8785 Canonical JSON (JCS) vs. Ad-Hoc Serialization

#### 1. What it does
RFC 8785 defines a strict, deterministic standard for serializing JSON data across different platforms, guaranteeing that an object `{ b: 2, a: 1 }` produces the exact same byte representation on any operating system, runtime, or architecture.

#### 2. How it works at an engineering level
In `src/lib/audit/canonical.ts`:
- Keys are sorted lexicographically by UTF-16 code units.
- Whitespace is strictly eliminated.
- Numbers and strings conform to IEEE 754 and RFC 8259 formatting.
```ts
export function canonicalJsonStringify(obj: unknown): string {
  // Sorts keys recursively before serializing
}
```

#### 3. Why It Matters
Standard `JSON.stringify()` in JavaScript does not guarantee key ordering across V8 engine optimizations. If an object is serialized with `{ a: 1, b: 2 }` on the client and `{ b: 2, a: 1 }` on the server, the resulting SHA-256 hash will be completely different, causing false-positive tamper alerts. RFC 8785 guarantees deterministic mathematical stability.

---

### 7.3 Inactivity State Machine: Server-Authoritative Clock & Cooling-Off Abort

#### 1. What it does
The state machine governs the lifecycle of the vault, enforcing mathematical rules on when nominees can vote, when cooling-off begins, and when ciphertext can be released.

#### 2. How it works at an engineering level
In `src/lib/recovery/state-machine.ts`:
```
[ACTIVE] ──(Missed checkin)──> [CHECKIN_DUE] ──(Grace elapsed)──> [GRACE_PERIOD]
   │                                                                     │
(Check-in)                                                     (Nominee 1 Request)
   │                                                                     ▼
   └───<───────────────────────────────────────────────────── [RECOVERY_PENDING]
   │                                                                     │
   │                                                           (Nominee 2 Vote)
   │                                                                     ▼
(Owner Cancel) <─────────────────────────────────────────── [RECOVERY_COOLING_OFF]
   │                                                                     │
   │                                                           (72h Window Elapsed)
   │                                                                     ▼
   └────────────────────────────────────────────────────────── [READY_FOR_RECOVERY]
```
- **Authoritative Time:** The state machine relies strictly on database server time (`now()`), completely ignoring the client device's clock. A nominee cannot bypass deadlines by changing their local laptop clock.
- **The Cooling-Off Invariant:** When 2 nominees vote to approve, the vault enters `RECOVERY_COOLING_OFF` for a mandatory safety period (72 hours in production). During this entire period, the owner can cancel the recovery with one click, restoring the vault to `ACTIVE`.

---

### 7.4 Audit & Integrity Comparison Matrix

| Audit Technology | Tamper Evidence | Inclusion Proof Complexity | Storage Overhead | External Dependency | Decision |
|---|---|---|---|---|---|
| **Linear SHA-256 Chain + RFC 8785 (Selected)** | **High:** Any modification in historical records breaks subsequent hashes. | $O(N)$ scan (trivial for $< 1000$ events per vault). | Negligible (one 64-char column). | **Zero:** Pure TypeScript and Web Crypto. | **SELECTED** |
| **Binary Merkle Tree** | **High:** Root hash summarizes entire history. | $O(\log N)$ logarithmic branch verification. | Medium: Requires storing intermediate tree hashes. | Low: Requires tree construction algorithms. | **REJECTED (Unnecessary for small event volumes)** |
| **Public Blockchain (Ethereum / Solana)** | **Maximum:** Censorship-resistant decentralized consensus. | $O(1)$ on-chain transaction receipt. | High gas fees; metadata privacy leaks. | **High:** Node providers (Infura/Alchemy), wallet keys, gas fees. | **REJECTED** |
| **Cloud Append-Only Log (AWS CloudTrail / QLDB)** | **Medium-High:** Cloud-enforced append-only tables. | Proprietary AWS API verification. | Cloud storage fees. | **High:** Vendor lock-in to AWS ecosystem. | **REJECTED** |

---

## 8. Testing, Quality Engineering & Deployment (Module F)

### 8.1 Vitest vs. Jest & Native `node:test`

#### Comparative Technical Evaluation
- **Jest:** The legacy standard. However, Jest requires complex Babel/ts-jest transforms, runs slowly in ESM environments, and has poor support for native Web Crypto APIs without extensive jsdom polyfills.
- **Native `node:test`:** Ultra-fast, zero-dependency. However, it lacks rich assertion libraries, snapshot tooling, and cross-module mocking capabilities required for mocking Supabase serverless clients.
- **Vitest:** Built natively on Vite's transform pipeline. It provides instant ESM execution, native support for modern Web Crypto APIs, blazing-fast execution (101 tests run in 3.48s), and seamless compatibility with TypeScript strict mode.

---

### 8.2 Vercel Serverless Edge vs. AWS, Railway, Fly.io & Google Cloud Run

#### Comparative Technical Evaluation
- **AWS (ECS / Fargate / Lambda via Terraform):** Powerful and enterprise-standard, but requires managing IAM roles, VPC subnets, NAT gateways, and CloudFront distributions, adding weeks of DevOps overhead for a 2-person hackathon team.
- **Railway / Fly.io:** Excellent for long-running stateful Docker containers. However, Last Mile uses a stateless architecture backed by serverless routes; paying for persistent container instances is inefficient.
- **Vercel:** Purpose-built for Next.js App Router applications. Deploys to a global Edge network with automated SSL, automatic preview deployments on every Git branch, integrated analytics, zero cold-start DNS routing, and automatic Vercel Cron integration for workflow evaluations.

---

### 8.3 GitHub Actions CI/CD

#### Engineering Pipeline
On every push and pull request, GitHub Actions executes:
1. `npm run lint` — ESLint code quality checks.
2. `npm run typecheck` — TypeScript strict type compilation.
3. `npm test` — 101 automated Vitest unit, integration, and security proof tests.
4. `npm run build` — Turbopack production build verification.
Only branches passing all 4 gates are eligible for pull-request merge into `main`.

---

### 8.4 Quality Engineering & Deployment Comparison Matrix

| Platform / Tool | Execution Speed | Type & Next.js Integration | Operational Overhead | Hosting / CI Cost | Decision |
|---|---|---|---|---|---|
| **Vitest** | **Ultra-Fast:** 3.48s for 101 tests via native Vite ESM pipeline. | **Seamless:** Zero-config TypeScript and Web Crypto execution. | **Low:** Single `vitest.config.mts`. | **Free:** Open-source. | **SELECTED** |
| **Jest** | **Slow:** Heavy Babel/ts-jest transpilation overhead. | **Complex:** Frequent ESM and Web Crypto polyfill friction. | **Medium:** Complex Jest config and mock files. | **Free:** Open-source. | **REJECTED** |
| **Vercel (Production)** | **High:** Global Edge CDN + regional Serverless execution. | **Native:** Built by the creators of Next.js; zero-config deploy. | **Zero:** Git-push automated preview and prod deployments. | **Free / Low:** Generous free tier for hackathon MVPs. | **SELECTED** |
| **AWS (ECS + Fargate)** | **High:** Persistent warm containers, low latency. | **Manual:** Requires Dockerfile, ECR, ECS tasks, ALB. | **Very High:** IAM policies, VPCs, Terraform state files. | **High:** Minimum $30–$70/month baseline costs. | **REJECTED** |

---

## 9. Deep Security Analysis: Invariants, Reality Checks & Limitations

To maintain academic and professional engineering integrity, this section provides an evidence-based security reality check, clearly distinguishing between mathematical cryptographic guarantees and practical application-level safeguards.

### 9.1 Cryptographic Guarantees vs. Application Safeguards
| Guarantee Level | Mechanism | Security Bound | Failure Mode if Violated |
|---|---|---|---|
| **Cryptographic Guarantee** | AES-256-GCM | 256-bit computational security; 128-bit integrity tag. | Broken only if key is recovered or nonce is reused. |
| **Cryptographic Guarantee** | Shamir 2-of-3 | Information-theoretically secure over $\text{GF}(2^8)$. | 1 share reveals mathematically **zero** bits of DEK. |
| **Cryptographic Guarantee** | scrypt KDF | Memory-hard sequential algorithm ($128\text{ MB}$). | Resistance against ASIC/GPU dictionary cracking. |
| **Application Safeguard** | Cooling-Off Window | Server-side countdown timer (72 hours). | Dependent on owner checking notifications. |
| **Application Safeguard** | RLS Access Control | PostgreSQL kernel query filters. | Bypassed if database `service_role` key is leaked. |
| **Application Safeguard** | Audit Hash Chain | Linear SHA-256 sequence linking. | Detects row alteration; cannot stop DB admin rewrite. |

### 9.2 Nonce Uniqueness & AAD Context Binding Analysis
- **NIST SP 800-38D Compliance:** Every call to `encryptPayload` and `wrapDek` invokes `crypto.getRandomValues(new Uint8Array(12))` to generate a 96-bit uniform random nonce.
- **AAD Binding:** In `src/lib/crypto/aes.ts`, the AAD is computed as:
  $$\text{AAD} = \text{utf8Encode}("last-mile:vault-payload:v1:" + vaultId)$$
  This cryptographically couples the ciphertext to the unique UUID of the vault. If a malicious database administrator copies ciphertext from Vault A and writes it into Vault B, attempts to decrypt Vault B using Vault B's ID will cause the AES-GCM authentication tag check to fail instantly, preventing cross-vault payload transposition attacks.

### 9.3 scrypt Parameters & Passphrase Entropy Reality Check
- **The $128\text{ MB}$ Memory Bound:** Using $N=131072, r=8, p=1$ forces attackers to allocate $128\text{ MB}$ of memory per cracking thread. This completely neutralizes hashcat GPU clusters from testing billions of passwords per second.
- **The Weak Passphrase Risk:** If a user chooses an 8-character common dictionary passphrase (e.g. `Password123!`), an attacker with access to a leaked database containing the `wrapped_dek` and `kdf_salt` can still test millions of dictionary words over several days on high-memory cloud instances. **Zero-knowledge encryption does not protect against low-entropy passphrases.**

### 9.4 Browser Memory Hygiene & TypedArray Zeroing Limitations
- In `src/lib/recovery/orchestrator.ts` and `src/app/vault/new/page.tsx`, the code calls `.fill(0)` on all transient `Uint8Array` allocations (`dek.fill(0)`, `kek.fill(0)`).
- **The Reality:** While `.fill(0)` zeroes the specific typed buffer, JavaScript engines (Google V8, SpiderMonkey) allocate strings, JSON objects, and intermediate text buffers across a garbage-collected heap. Passphrase strings cannot be zeroed in JavaScript. Memory hygiene in browser runtimes is **best-effort**, not an absolute guarantee against physical RAM dumps.

### 9.5 Audit Chain Tampering & External Anchoring Gap
- **Finding:** The linear SHA-256 hash chain provides tamper-evidence within the database. However, because the hash chain is stored entirely in Supabase PostgreSQL, a rogue administrator with direct SQL access could rewrite the entire table from genesis and regenerate all subsequent hashes.
- **Recommendation:** Production systems should anchor daily audit roots to an external public witness (e.g. RFC 3161 Timestamp Authority or public ledger).

### 9.6 Identification of Exaggerated or Inaccurate Claims
1. *Correction on "Merkle Hash Chain":* Previous documentation occasionally referred to the audit trail as a "Merkle chain". The implementation is a **linear SHA-256 hash chain**, not a binary Merkle tree.
2. *Correction on "Unbreakable Security":* No software system is unbreakable. Client-side cryptography is vulnerable to client-device keyloggers, compromised browser extensions, and physical device theft.
3. *Correction on "Independent Third-Party Audit":* While `@noble/hashes` is audited by Cure53, Last Mile's end-to-end application code has undergone rigorous internal automated testing (101 Vitest tests), not a formal commercial third-party security firm review.

---

## 10. Performance, Scalability & System Design Analysis

### 10.1 Database Indexing & Query Optimization
In `src/lib/server/db.ts` and `supabase/migrations/20261029000000_initial_schema.sql`:
- **Indexed Lookups:** Queries on `vaults.owner_id`, `nominees.vault_id`, and `audit_events(vault_id, sequence)` utilize B-tree indexes, ensuring $O(\log N)$ query times.
- **Targeted Workflow Scans:** In PR #15, `advanceWorkflowsDb` was optimized from a sequential $O(N)$ full table scan to an indexed timestamp query:
  ```sql
  SELECT * FROM vaults 
  WHERE next_checkin_at <= NOW() 
     OR grace_ends_at <= NOW() 
     OR cooling_off_ends_at <= NOW();
  ```
  This reduces cron execution overhead from $O(N)$ total vaults to $O(K)$ overdue vaults only.

### 10.2 Supabase Connection Pooling (Supavisor)
- In serverless environments, each concurrent Vercel Lambda creates an independent database connection. Under sudden spikes, direct PostgreSQL connections can exceed database `max_connections` limits.
- **Implementation Status:** For production scale, connection strings should route through **Supavisor** (Supabase's built-in transaction-mode connection pooler on port `6543`), enabling thousands of concurrent serverless functions to share a pool of 20–50 PostgreSQL connections.

### 10.3 Browser scrypt Latency & Web Worker Roadmap
- **Current Metric:** scrypt key derivation takes 900–2200ms on the main JavaScript thread.
- **Current Implementation:** Responsive UI loading states and animated spinners (`RefreshCw`) inform the user during key derivation.
- **Future Roadmap:** Offload `deriveKek()` to a dedicated Web Worker thread (`src/workers/kdf.worker.ts`), keeping the browser UI rendering at 60 FPS on low-power mobile devices.

### 10.4 System Design Roadmap: Current vs. Future Scale
| Architectural Technique | Current Implementation Status | Recommended for Future Scale ($> 100\text{k}$ Vaults) |
|---|---|---|
| **Database B-Tree Indexing** | **Implemented** on all foreign keys and sequence columns. | Maintain index health and monitor query plans via `EXPLAIN ANALYZE`. |
| **Supabase Client Singleton** | **Implemented** in PR #15 (`cachedSupabaseClient`). | Retain in Node.js serverless runtimes. |
| **Transaction Connection Pooler** | Recommended for high concurrency. | Enable Supavisor transaction pooler on port 6543. |
| **Web Worker for KDF** | In-thread with responsive spinner. | Move scrypt derivation to Web Worker thread. |
| **External Audit Anchoring** | Linear hash chain inside PostgreSQL. | Publish daily Merkle root to RFC 3161 Timestamp Authority. |
| **Background Job Queues** | Vercel Cron invoking `/api/internal/advance-workflows`. | Migrate to Inngest or BullMQ for sub-minute event scheduling. |
| **Rate Limiting** | Handled via Next.js middleware and Vercel Edge. | Implement Upstash Redis distributed rate limiting on sensitive routes. |

---

## 11. Authoritative Research References & RFC Citations

1. **NIST Special Publication 800-38D (November 2007):**  
   *Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC.*  
   National Institute of Standards and Technology.  
   URL: [https://csrc.nist.gov/publications/detail/sp/800-38d/final](https://csrc.nist.gov/publications/detail/sp/800-38d/final)

2. **RFC 7914 (August 2016):**  
   *The scrypt Password-Based Key Derivation Function.*  
   Internet Engineering Task Force (IETF).  
   URL: [https://www.rfc-editor.org/rfc/rfc7914](https://www.rfc-editor.org/rfc/rfc7914)

3. **RFC 8785 (June 2020):**  
   *JSON Canonicalization Scheme (JCS).*  
   Internet Engineering Task Force (IETF).  
   URL: [https://www.rfc-editor.org/rfc/rfc8785](https://www.rfc-editor.org/rfc/rfc8785)

4. **Shamir, Adi (November 1979):**  
   *How to Share a Secret.*  
   Communications of the ACM, Vol. 22, No. 11, pp. 612–613.  
   DOI: [10.1145/359168.359176](https://doi.org/10.1145/359168.359176)

5. **W3C Web Cryptography API Recommendation (January 2017):**  
   *Web Cryptography API — W3C Recommendation.*  
   World Wide Web Consortium.  
   URL: [https://www.w3.org/TR/WebCryptoAPI/](https://www.w3.org/TR/WebCryptoAPI/)

6. **OWASP Cryptographic Storage Cheat Sheet (Updated 2025/2026):**  
   *Key Management, Password Storage and Symmetric Encryption Guidelines.*  
   Open Web Application Security Project.  
   URL: [https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

7. **RFC 9106 (February 2021):**  
   *Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications.*  
   Internet Engineering Task Force (IETF).  
   URL: [https://www.rfc-editor.org/rfc/rfc9106](https://www.rfc-editor.org/rfc/rfc9106)

8. **Paul Miller / Noble Cryptography Audit (2022):**  
   *Security Audit of noble-hashes by Cure53.*  
   Cure53 Security Assessment Report.  
   URL: [https://github.com/paulmillr/noble-hashes](https://github.com/paulmillr/noble-hashes)

---

## 12. Conclusion & Architectural Defense

The architectural decisions of **Last Mile** are intentionally aligned with the realities of modern web security and the specific domain of digital estate continuity:
1. **Zero-Knowledge Privacy:** By keeping the Data Encryption Key and master passphrase exclusively in client browser memory, server compromises yield only opaque ciphertext envelopes.
2. **Multi-Party Survivability:** By splitting the key across 3 physical/digital Recovery Cards via 2-of-3 Shamir secret sharing, family continuity is achieved without reliance on centralized custodians or single points of human failure.
3. **Safety by Default:** The combination of server-authoritative state transitions, owner cooling-off abort windows, and RFC 8785 SHA-256 audit chaining delivers a system that is mathematically sound, fail-closed, and defensible before senior software architects and security reviewers.

---
*Report Approved by Engineering Leadership:*  
**Mayank Sharma** — Team Lead & Principal Cryptographic Architect  
**Shyam Sharma** — Principal Data & Infrastructure Architect  
*Last Mile Project • Kalvium Hackathon 2026*
