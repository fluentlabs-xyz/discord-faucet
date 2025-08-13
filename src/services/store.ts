import process from 'node:process';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH ?? './faucet.sqlite';
const db = new Database(DB_PATH);

// One-time schema: only successful claims are stored
db.exec(`
CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')), -- UNIX seconds (UTC)
  discord_user_id TEXT NOT NULL,
  guild_id TEXT,
  channel_id TEXT,
  address TEXT NOT NULL,
  transaction_id TEXT NOT NULL,   -- distributor transaction id
  tx_hash TEXT NOT NULL,          -- real tx hash (required for "successful")
  amount_wei TEXT                 -- optional, from can-claim
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_txid ON claims(transaction_id);
CREATE INDEX IF NOT EXISTS idx_claims_user_time ON claims(discord_user_id, created_at DESC);
`);

export type ClaimRow = {
	id: number;
	created_at: number; // UNIX seconds (UTC)
	discord_user_id: string;
	guild_id?: string | null;
	channel_id?: string | null;
	address: string;
	transaction_id: string;
	tx_hash: string;
	amount_wei?: string | null;
};

/** Insert a successful claim (idempotent by transaction_id). */
export function recordSuccess(input: {
	discord_user_id: string;
	guild_id?: string;
	channel_id?: string;
	address: string;
	transaction_id: string;
	tx_hash: string;
	amount_wei?: string;
	created_at_sec?: number; // optional override; defaults to now
}) {
	const created_at = input.created_at_sec ?? Math.floor(Date.now() / 1000);
	const stmt = db.prepare(`
    INSERT OR IGNORE INTO claims
      (created_at, discord_user_id, guild_id, channel_id, address, transaction_id, tx_hash, amount_wei)
    VALUES
      (@created_at, @discord_user_id, @guild_id, @channel_id, @address, @transaction_id, @tx_hash, @amount_wei)
  `);
	stmt.run({ ...input, created_at });
}

/** Get the latest claim by user within a time window (in seconds). */
export function getLastByUserInWindow(discord_user_id: string, windowSeconds: number): ClaimRow | undefined {
	const boundary = Math.floor(Date.now() / 1000) - windowSeconds;
	const stmt = db.prepare(`
    SELECT * FROM claims
     WHERE discord_user_id = ?
       AND created_at >= ?
     ORDER BY created_at DESC
     LIMIT 1
  `);
	return stmt.get(discord_user_id, boundary) as ClaimRow | undefined;
}

/** Get the latest claim by user (no window). */
export function getLastByUser(discord_user_id: string): ClaimRow | undefined {
	const stmt = db.prepare(`
    SELECT * FROM claims
     WHERE discord_user_id = ?
     ORDER BY created_at DESC
     LIMIT 1
  `);
	return stmt.get(discord_user_id) as ClaimRow | undefined;
}
