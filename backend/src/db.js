import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../data/pactchain.db");

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS pacts (
    id          TEXT PRIMARY KEY,
    contract_id TEXT UNIQUE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    creator     TEXT NOT NULL,
    stake_amount INTEGER NOT NULL,
    max_participants INTEGER NOT NULL,
    deadline    INTEGER NOT NULL,
    resolution_mode TEXT NOT NULL,
    judge       TEXT,
    status      TEXT NOT NULL DEFAULT 'open',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS invite_links (
    code        TEXT PRIMARY KEY,
    pact_id     TEXT NOT NULL REFERENCES pacts(id),
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS wallet_interactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet      TEXT NOT NULL,
    action      TEXT NOT NULL,
    pact_id     TEXT,
    meta        TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

export default db;
