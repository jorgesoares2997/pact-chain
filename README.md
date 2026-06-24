# PactChain

**Make commitments that stick.**

PactChain is a social dApp on Stellar where groups create binding commitment pools, lock USDC in a Soroban smart contract, and resolve outcomes by vote. The winner gets paid automatically. 2% protocol fee extracted on-chain.

## Problem Statement

Informal social commitments ("first to finish pays dinner") lack enforcement. PactChain replaces trust-based agreements with cryptographic guarantees — USDC is locked in escrow and released automatically when peers vote on the outcome.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React + Vite + Tailwind (Vercel)                       │
│  Stellar Wallets Kit (Freighter / WalletConnect)        │
└───────────────────┬─────────────────────────────────────┘
                    │ REST API
┌───────────────────▼─────────────────────────────────────┐
│  Node.js + Express (Railway / Render)                   │
│  SQLite  — pact metadata, invite links, interactions    │
└───────────────────┬─────────────────────────────────────┘
                    │ Stellar RPC
┌───────────────────▼─────────────────────────────────────┐
│  Soroban Smart Contract (Stellar Testnet)               │
│  Multi-party USDC escrow · Voting · Auto-payout        │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Tech |
|---|---|
| Smart Contract | Rust + Soroban SDK 20 |
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Wallets | @creit.tech/stellar-wallets-kit (Freighter, WalletConnect) |
| Backend | Node.js + Express + better-sqlite3 |
| Monitoring | Sentry (frontend + backend) |
| Analytics | Plausible (custom events) |
| Hosting | Vercel (frontend) + Railway (backend) |

## Smart Contract Features

- Multi-party USDC escrow with time-lock
- 3 resolution modes: **Majority vote**, **Single judge**, **Unanimity**
- Anti-self-vote enforcement
- Auto-payout to winner with 2% protocol fee to treasury
- Auto-refund in Unanimity mode if 48h timeout reached without consensus

## Local Development

### Prerequisites

- Node.js 20+
- Rust + `cargo`
- Soroban CLI (`cargo install --locked stellar-cli --features opt`)
- Freighter wallet browser extension

### 1. Smart Contract

```bash
cd contract
cargo test                    # run all tests
stellar contract build        # compile to WASM
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/pactchain.wasm \
  --network testnet \
  --source YOUR_KEY
```

Save the deployed contract address as `VITE_CONTRACT_ID` in `frontend/.env`.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
mkdir -p data
npm run dev
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Contract Deployment

**Testnet Contract Address:** `TBD — deploy with instructions above`

## Live Demo

**Frontend:** `https://pactchain.vercel.app` _(after deploy)_

## Screenshots

_To be added after deploy._

## License

MIT
