# Fluent Faucet Discord Bot

Slash-command bot that submits testnet faucet claims via QuickNode. Only **successful** claims are stored (SQLite). Cooldown is per Discord user.

## Requirements

* Node.js ≥ 22
* Discord app & bot token
* QuickNode Partner **Distributor** key
* SQLite via `better-sqlite3`

## Environment

Create `.env`:

```bash
cp .env.example .env
```

> Keep secrets out of git.

## Install

```bash
npm ci
```

## Build & Register Commands

```bash
npm run build
npm run deploy   # overwrites guild slash commands for GUILD_ID
```

Run `deploy` **only** after changing command schema.

## Run

```bash
npm start
```

You should see: `Ready! Logged in as <bot#tag>`.

## Commands

* **`/claim <address>`**

  * Validates address.
  * Local cooldown check (last **successful** claim within `COOLDOWN_SECONDS`).
  * QuickNode `can-claim` → `claim`.
  * Short-polls for tx hash (\~8s). If hash appears → persist:

    * `discord_user_id`, `guild_id`, `channel_id`, `address`, `transaction_id`, `tx_hash`, `amount_wei`, `created_at`.
  * Ephemeral response: amount, recipient, tx link (if available), next claim time.

* **`/status`**

  * No args. Read-only from SQLite.
  * If no successful claim in window → **Eligible now**.
  * Else → shows last amount, recipient (short), tx link, **Next claim** time.
  * Ephemeral.

## Data Model (SQLite)

* File: `DB_PATH` (default `./faucet.sqlite`)
* Table `claims` (only **successful** claims):

  * `created_at` = UNIX seconds (UTC)
  * Unique on `transaction_id`, index on `(discord_user_id, created_at DESC)`.

## Discord Setup

* Create private channel (e.g. `#faucet-devs`), set `FAUCET_CHANNEL_ID`.
* Allow only vetted users (Discord permissions). Optionally require `BUILDER_ROLE_ID`.
* Ensure the bot can **View Channel / Send Messages / Use Application Commands**.

## Notes

* If no tx hash during short poll → reply shows `processing…`; user may run `/claim` later. Cooldown applies only after a **successful** claim is recorded.
* Never expose `QN_DISTRIBUTOR_KEY` to clients.
