# Backend: Supabase setup

Purse works fully without a backend. Adding Supabase enables sign-in with a magic link and syncs transactions and budgets across devices. Setup takes about 10 minutes on Supabase's free tier.

## 1. Create a project

1. Sign up at [supabase.com](https://supabase.com) and create a new project. Pick the region closest to your users (for India, Mumbai `ap-south-1`).
2. Wait for it to finish provisioning.

## 2. Create the database schema

Either paste the migration into the SQL editor or use the Supabase CLI.

**SQL editor:** open **SQL Editor → New query**, paste the contents of `supabase/migrations/20261004000000_init.sql`, and run it.

**CLI:**

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

This creates the `transactions` and `budgets` tables, their constraints and indexes, the Row Level Security policies, and adds both tables to realtime.

## 3. Configure sign-in

In **Authentication → URL Configuration**:

- **Site URL:** your deployed app, for example `https://Sairam0207.github.io/purse/`
- **Redirect URLs:** add the same URL, plus `http://localhost:5173` and `http://localhost:4173` for local development.

Email sign-in is enabled by default. Supabase's built-in email service is rate limited (a few emails per hour) and is fine for a portfolio. For real traffic, add your own SMTP provider under **Authentication → Emails → SMTP Settings**.

## 4. Point the app at your project

From **Project Settings → API**, copy the **Project URL** and the **anon public** key.

**Locally:** copy `.env.example` to `.env` and fill both values, then `npm run dev`.

**GitHub Pages:** in your repository, go to **Settings → Secrets and variables → Actions** and add:

| Type | Name | Value |
| --- | --- | --- |
| Variable | `SUPABASE_URL` | Project URL |
| Variable | `SUPABASE_ANON_KEY` | anon public key |

The deploy workflow passes them to the build. If they're missing, the site deploys in local-only mode.

> **Is it safe to publish the anon key?** Yes. It's designed to be public and is visible in any Supabase app's JavaScript. It only identifies the project. What protects data is Row Level Security: every query runs as the signed-in user, and the policies only allow access to that user's own rows. Never put the `service_role` key in frontend code.

## How sync works

```
 UI ──writes──▶ local store (instant) ──queues──▶ outbox (persisted)
                      ▲                               │ batched, retried with backoff
                      │                               ▼
                 apply changes ◀── pull (keyset cursor) / realtime ◀── Supabase Postgres (RLS)
```

- **Offline first.** The UI reads and writes the local store, so it never waits on the network. Changes go into a persisted outbox and are sent when online, in batches of up to 500.
- **Idempotent writes.** Transaction ids are UUIDs generated on the device, so every write is an upsert. A retry after a timeout can't create a duplicate.
- **Soft deletes.** Deleting sets `deleted_at`, so other devices learn about deletions through incremental sync. A purge function removes rows deleted more than 90 days ago.
- **Incremental pulls.** Devices fetch only rows changed since their last cursor `(updated_at, id)`. `updated_at` is always set by the database, so device clock skew can't cause missed changes.
- **Realtime.** Changes from other devices arrive over Supabase Realtime. After a reconnect the app does a pull to fill any gap.
- **Conflicts.** An unsent local edit wins until it's sent. After that, the latest write on the server wins.
- **Bad data doesn't block the queue.** If the server permanently rejects a row (for example, a constraint violation), that one row is dropped and reported, and everything else still syncs.
- **Sign-in with existing local data.** Transactions you created before signing in can be added to your account; you're asked first. Sample and test data is never uploaded. If a different account signs in on the same device, the previous account's local copy is cleared first.
- **Sign-out** clears the local copy so the next person on a shared device can't see it, after warning if anything hasn't synced yet.

## Testing the backend

| Test | Command | What it proves |
| --- | --- | --- |
| Sync engine unit tests | `npm test` | Outbox, batching, retries, conflict rules, pagination, account switching, against an in-memory fake server |
| Database tests (pgTAP) | `npm run test:db` | Users can't read, change, or delete other users' data; constraints hold; upserts are idempotent; timestamps are server-owned |
| Cloud E2E | `npm run test:e2e` | The real app and supabase-js in a browser, with Supabase's HTTP API mocked: PKCE sign-in, pull, push payloads, offline queueing across reloads |

`npm run test:db` needs a Postgres with pgTAP and a `DATABASE_URL`. It loads a small shim of Supabase's `auth` schema so the tests run on plain Postgres. With the Supabase CLI and Docker, `supabase start && supabase test db` runs the same tests against the full local stack.
