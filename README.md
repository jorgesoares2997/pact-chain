# PactChain

> **Make commitments that stick.**

PactChain is a social dApp on Stellar where groups create binding pacts, lock USDC in a Soroban smart contract, and resolve outcomes by vote. Payouts are automatic. No middleman. 2% protocol fee extracted on-chain.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-pactchain.vercel.app-blue)](https://pactchain.vercel.app)
[![Stellar Testnet](https://img.shields.io/badge/Network-Stellar%20Testnet-purple)](https://stellar.expert/explorer/testnet)

---

## Problem Statement

Informal social commitments lack enforcement. Handshake deals fail because there's no neutral escrow. PactChain replaces trust with cryptographic guarantees — USDC is locked in a Soroban smart contract and released automatically when participants vote on the outcome.

---

## Pact Types

### Opinion Pact
A group prediction or debate. Participants stake USDC and vote on any outcome they define (e.g. "Will ETH hit $5k?"). Voters on the winning side split the pool proportionally. Supports custom vote options and 3 resolution modes.

### Commitment Pact
A personal accountability contract. One person commits to a goal (e.g. "I will ship this feature by Friday"), sets success criteria and evidence requirements. A judge (or majority) rules whether the commitment was met. Creator collects the pool on success; witnesses split it on failure.

---

## Live Demo

🌐 **Frontend:** https://pactchain.vercel.app  
📄 **Contract WASM Hash:** `653b74db708024679f0bee259ec557c98dadf95a07e7898d304ff3cb8dde5e58`  
🔗 **Network:** Stellar Testnet · Token: Circle testnet USDC

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Next.js 15 + Tailwind CSS v4 (Vercel)                  │
│  next-intl (EN/PT) · Stellar Wallets Kit v2.4           │
│  Freighter · LOBSTR · xBull · CactusLink · WalletConnect│
└────────────────────────┬─────────────────────────────────┘
                         │ REST API
┌────────────────────────▼─────────────────────────────────┐
│  Spring Boot 3 + Java 21 (Railway / Render)             │
│  H2 (dev) / PostgreSQL via Supabase (prod)              │
│  Liquibase migrations · Sentry error tracking           │
└────────────────────────┬─────────────────────────────────┘
                         │ Stellar RPC
┌────────────────────────▼─────────────────────────────────┐
│  Soroban Smart Contract — Stellar Testnet               │
│  Rust + Soroban SDK 21.7.6 · USDC escrow · Auto-payout │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Rust · Soroban SDK 21.7.6 · Stellar Testnet |
| Frontend | Next.js 15 · Tailwind CSS v4 · TypeScript |
| Wallet Integration | @creit.tech/stellar-wallets-kit v2.4 (Freighter, LOBSTR, xBull, CactusLink, WalletConnect) |
| i18n | next-intl (English + Portuguese) |
| Backend | Spring Boot 3 · Java 21 · Spring Data JPA |
| Database | H2 (dev) · PostgreSQL via Supabase (prod) |
| Migrations | Liquibase |
| Error Tracking | Sentry |
| Hosting | Vercel (frontend) · Railway (backend) |

---

## Smart Contract Features

- **Multi-party USDC escrow** with configurable stake amount per participant
- **3 resolution modes:** Majority vote · Single judge · Unanimity
- **Custom vote options** defined at pact creation (e.g. Yes/No, Completed/Failed)
- Anti-self-vote enforcement on-chain
- **Auto-payout** to winning-side voters with 2% protocol fee to treasury
- **Auto-refund** in Unanimity mode if 48h timeout reached without consensus
- One contract instance per pact — deployed on-demand from uploaded WASM

---

## Multi-Wallet Support

PactChain uses `@creit.tech/stellar-wallets-kit` v2.4 to support all major Stellar wallets via a unified wallet picker modal:

| Wallet | Desktop | Mobile |
|---|---|---|
| Freighter | Browser extension | — |
| LOBSTR | Browser extension | Deep link |
| xBull | Browser extension | Deep link |
| CactusLink | Browser extension | Deep link |
| WalletConnect | QR code | Deep link (requires Reown project ID) |

To enable WalletConnect mobile deep links, get a free project ID at [cloud.reown.com](https://cloud.reown.com) and set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `.env`.

---

## Local Development

### Prerequisites

- Node.js 20+ · pnpm 9+
- Java 21 · Maven 3.9+
- Rust + `cargo`
- Stellar CLI — `cargo install --locked stellar-cli --features opt`
- Any supported Stellar wallet (Freighter recommended for desktop dev)

### 1. Smart Contract (already deployed — skip unless changing)

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
stellar contract install \
  --wasm target/wasm32-unknown-unknown/release/pactchain.wasm \
  --network testnet \
  --source YOUR_KEY_NAME
# Copy the returned hex hash → NEXT_PUBLIC_CONTRACT_WASM_HASH
```

### 2. Backend

```bash
cd backend
./mvnw spring-boot:run
# API → http://localhost:8080
# H2 console → http://localhost:8080/h2-console
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # fill in values
pnpm install
pnpm dev               # → http://localhost:3000
```

---

## Environment Variables

### Frontend (`frontend/.env`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_WASM_HASH=<hex from stellar contract install>
NEXT_PUBLIC_USDC_TOKEN_ID=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
NEXT_PUBLIC_TREASURY_ADDRESS=<your Stellar G... address>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=   # optional — enables mobile deep links
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
```

### Backend (env or `application.properties`)

```env
DATABASE_URL=jdbc:postgresql://<host>:5432/postgres
DB_DRIVER=org.postgresql.Driver
DB_USER=postgres
DB_PASS=<password>
FRONTEND_URL=https://pactchain.vercel.app
PORT=8080
```

---

## Database Schema (key tables)

| Table | Purpose |
|---|---|
| `pacts` | Pact metadata — `pact_type` (OPINION/COMMITMENT), `success_criteria`, `evidence_requirements`, resolution mode, deadline, status |
| `pact_participants` | On-chain verified participants with stake amount and tx hash |
| `wallet_interactions` | Full audit log of every user action |
| `pact_votes` | Structured vote records for tally display |
| `pact_results` | Per-option vote counts used for resolution |
| `invite_links` | Short-code invite URLs for sharing |

---

## Wallet Interaction Proof

Every user action is logged in `wallet_interactions`. The `/activity` page shows the live feed.

| Action | When |
|---|---|
| `pact_created` | User deploys contract + creates pact |
| `joined_pact` | User joins via invite link and stakes USDC |
| `voted` | Participant casts vote on-chain |
| `pact_won` | Winner resolved — payout triggered |
| `pact_refunded` | Unanimity timeout → full refund |

---

## User Feedback

Collected via embedded Google Form (accessible from every pact via the feedback button).

---

## License

MIT
