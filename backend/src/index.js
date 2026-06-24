import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import db from "./db.js";
import "dotenv/config";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

const app = express();
app.use(Sentry.expressErrorHandler());
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

// ── Pacts ──────────────────────────────────────────────────────────────────

// Create pact metadata (called by frontend after contract deploy)
app.post("/pacts", (req, res) => {
  const {
    contractId,
    title,
    description,
    creator,
    stakeAmount,
    maxParticipants,
    deadline,
    resolutionMode,
    judge,
  } = req.body;

  if (!contractId || !title || !creator) {
    return res.status(400).json({ error: "contractId, title, creator required" });
  }

  const id = nanoid(12);
  db.prepare(`
    INSERT INTO pacts (id, contract_id, title, description, creator, stake_amount,
      max_participants, deadline, resolution_mode, judge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, contractId, title, description, creator, stakeAmount, maxParticipants,
    deadline, resolutionMode, judge || null);

  // Generate invite link code
  const code = nanoid(8);
  db.prepare("INSERT INTO invite_links (code, pact_id) VALUES (?, ?)").run(code, id);

  logInteraction(creator, "pact_created", id);

  res.json({ id, code, inviteUrl: `${process.env.FRONTEND_URL || ""}/join/${code}` });
});

app.get("/pacts/:id", (req, res) => {
  const pact = db.prepare("SELECT * FROM pacts WHERE id = ?").get(req.params.id);
  if (!pact) return res.status(404).json({ error: "Not found" });
  res.json(pact);
});

app.patch("/pacts/:id/status", (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE pacts SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true });
});

// ── Invite Links ──────────────────────────────────────────────────────────

app.get("/invite/:code", (req, res) => {
  const link = db
    .prepare("SELECT invite_links.*, pacts.* FROM invite_links JOIN pacts ON invite_links.pact_id = pacts.id WHERE invite_links.code = ?")
    .get(req.params.code);

  if (!link) return res.status(404).json({ error: "Invalid invite code" });
  res.json(link);
});

// Create additional invite link for existing pact
app.post("/pacts/:id/invite", (req, res) => {
  const pact = db.prepare("SELECT * FROM pacts WHERE id = ?").get(req.params.id);
  if (!pact) return res.status(404).json({ error: "Not found" });

  const code = nanoid(8);
  db.prepare("INSERT INTO invite_links (code, pact_id) VALUES (?, ?)").run(code, pact.id);
  res.json({ code, inviteUrl: `${process.env.FRONTEND_URL || ""}/join/${code}` });
});

// ── Wallet Interactions ───────────────────────────────────────────────────

app.post("/interactions", (req, res) => {
  const { wallet, action, pactId, meta } = req.body;
  if (!wallet || !action) return res.status(400).json({ error: "wallet and action required" });

  logInteraction(wallet, action, pactId, meta);
  res.json({ ok: true });
});

app.get("/interactions", (req, res) => {
  const { wallet, pactId, limit = 50 } = req.query;
  let query = "SELECT * FROM wallet_interactions WHERE 1=1";
  const params = [];

  if (wallet) { query += " AND wallet = ?"; params.push(wallet); }
  if (pactId) { query += " AND pact_id = ?"; params.push(pactId); }
  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(Number(limit));

  res.json(db.prepare(query).all(...params));
});

// ── Health ────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ ok: true }));

// ── Helpers ───────────────────────────────────────────────────────────────

function logInteraction(wallet, action, pactId = null, meta = null) {
  db.prepare(
    "INSERT INTO wallet_interactions (wallet, action, pact_id, meta) VALUES (?, ?, ?, ?)"
  ).run(wallet, action, pactId, meta ? JSON.stringify(meta) : null);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`PactChain backend running on :${PORT}`));
