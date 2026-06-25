# PactChain

> **Make commitments that stick.**

PactChain is a social dApp on Stellar where groups create binding commitment pools, lock USDC in a Soroban smart contract, and resolve outcomes by vote. The winner gets paid automatically. No middleman. 2% protocol fee extracted on-chain.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-pactchain.vercel.app-blue)](https://pactchain.vercel.app)
[![Stellar Testnet](https://img.shields.io/badge/Network-Stellar%20Testnet-purple)](https://stellar.expert/explorer/testnet)

---

## Problem Statement

Informal social commitments ("first one to finish pays dinner") lack enforcement. Handshake deals fail because there's no neutral escrow. PactChain replaces trust with cryptographic guarantees — USDC is locked in a Soroban smart contract and released automatically when participants vote on the outcome.

---

## Live Demo

🌐 **Frontend:** https://pactchain.vercel.app  
📄 **Contract WASM Hash:** `a13a3e93534768e263ee2c97a9a5e1491d2efc52c3ec95dcf8790d0482d04a55`  
🔗 **Network:** Stellar Testnet

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Next.js 15 + Tailwind CSS v4 (Vercel)                  │
│  next-intl (EN/PT) · Stellar Wallets Kit (Freighter)    │
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
| Wallet Integration | @creit.tech/stellar-wallets-kit v2 (Freighter) |
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
- **Auto-payout** to winner with 2% protocol fee to treasury
- **Auto-refund** in Unanimity mode if 48h timeout reached without consensus
- One contract instance per pact — deployed on-demand from uploaded WASM

---

## Local Development

### Prerequisites

- Node.js 20+ · pnpm 9+
- Java 21 · Maven 3.9+
- Rust + `cargo`
- Stellar CLI — `cargo install --locked stellar-cli --features opt`
- Freighter browser extension (set to Testnet)

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

## Wallet Interaction Proof

Every user action is logged in `wallet_interactions`. The `/activity` page shows the live feed. Interaction types:

| Action | When |
|---|---|
| `pact_created` | User deploys contract + creates pact |
| `joined_pact` | User joins via invite link |
| `pact_locked` | Creator locks pact → voting opens |
| `voted` | Participant casts vote |
| `pact_won` | Winner resolved |
| `pact_refunded` | Unanimity timeout refund |

---

## User Feedback

Collected via embedded Google Form (accessible from every pact via the feedback button). Summary in `/docs/feedback.md`.

---

## License

MIT
