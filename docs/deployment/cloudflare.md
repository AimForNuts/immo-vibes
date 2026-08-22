# Cloudflare Migration Runbook

This document is the source of truth for Cloudflare resources created for ImmoWeb Suite. Keep it current whenever a Worker, route, trigger, secret, D1 database, R2 bucket, custom domain, or Cloudflare setting is added, changed, or removed.

## Migration Goal

ImmoWeb Suite now runs on Cloudflare. This document tracks the Cloudflare resources and the remaining Cloudflare-native migration stages:

1. Cloudflare Workers/OpenNext runtime and Cloudflare Cron Triggers.
2. Use the free Cloudflare `workers.dev` hostname as the production URL.
3. D1 and R2 adoption where they make the app simpler to own.
4. R2 adoption for future object/source storage.

Temporary broken login or data access is acceptable during migration windows because this is currently a single-user hobby project. Prefer fast, understandable checkpoints over elaborate zero-downtime compatibility layers.

## Current Phase

Phase 3 R2 adoption is in progress. The app keeps auth and application data in Cloudflare D1, and the first R2-backed flow archives API Inspector raw response snapshots.

| Area | Current state |
|---|---|
| Hosting/runtime | Cloudflare Workers via OpenNext at `https://immo-web-suite.void-presence.workers.dev` |
| Database | Cloudflare D1 stores better-auth tables and application data |
| ORM | None for app persistence; services use D1 SQL directly |
| Auth | better-auth uses D1 binding `IMMO_SYNC_DB` in production |
| Cron | Cloudflare Cron Triggers call existing `app/api/cron/*` route handlers |
| Vercel | Removed from repo config and no longer part of production |
| D1 | `immo-web-suite-sync` stores better-auth tables, `sync_state`, `sync_job_logs`, `user_preferences`, `price_tracker`, `gear_presets`, `character_pets`, `characters`, `zones`, `item_zones`, `dungeons`, API Inspector tables, `items`, and `market_price_history` |
| R2 | `immo-web-suite-sources` exists and is bound as `IMMO_SOURCES_BUCKET`; API Inspector writes raw response snapshots to it |

Cloudflare account: `Jogada`

## Created Cloudflare Resources

Record every Cloudflare resource here as it is created.

| Resource | Name | Purpose | Source of truth | Status |
|---|---|---|---|---|
| Worker | `immo-web-suite` | Next.js application runtime | `wrangler.jsonc`, `worker.ts` | Created |
| Worker URL | `https://immo-web-suite.void-presence.workers.dev` | Current production hostname on Cloudflare's free `workers.dev` domain | Cloudflare Workers | Created |
| Worker version | `d127bfa5-cb43-4304-a9b7-0aed08164fa6` | Current deployed version with explicit `workers.dev` production config | Wrangler deploy output | Created |
| Worker Assets binding | `ASSETS` | Static assets emitted by OpenNext | `wrangler.jsonc` | Created |
| Cron Trigger | `0 0 * * 1` | Weekly item catalog sync | `wrangler.jsonc`, `worker.ts` | Created |
| Cron Trigger | `0 2 * * 1` | Weekly recipe sync | `wrangler.jsonc`, `worker.ts` | Created |
| Cron Trigger | `0 4 * * *` | Daily price sync | `wrangler.jsonc`, `worker.ts` | Created |
| Custom domain | TBD | Optional future nicer hostname | Cloudflare dashboard / Wrangler | Deferred |
| D1 database | `immo-web-suite-sync` (`112c46c3-0718-4e3f-8a51-d11529b1ba4f`) | better-auth tables, cron sync state, admin sync logs, user preferences, tracked investments, gear presets, character pets, character roster cache, zone metadata, dungeon catalog, API Inspector metadata, item catalog, and market price history | `wrangler.jsonc`, `d1/migrations/` | Created |
| R2 bucket | `immo-web-suite-sources` | API Inspector raw response snapshots and future object/source storage for imported/exported snapshots, raw source payloads, and backup artifacts | `wrangler.jsonc`, `lib/storage/r2.ts` | Created |

## Repo Files

| File | Purpose |
|---|---|
| `open-next.config.ts` | OpenNext Cloudflare adapter config |
| `wrangler.jsonc` | Worker name, runtime flags, assets binding, observability, cron schedules |
| `worker.ts` | Custom Worker entry with `fetch` and `scheduled` handlers |
| `d1/migrations/0001_sync_state.sql` | D1 schema for the `sync_state` table |
| `d1/migrations/0002_sync_job_logs.sql` | D1 schema for the `sync_job_logs` table |
| `d1/migrations/0003_user_preferences.sql` | D1 schema for the `user_preferences` table |
| `d1/migrations/0004_price_tracker.sql` | D1 schema for the `price_tracker` table |
| `d1/migrations/0005_gear_presets.sql` | D1 schema for the `gear_presets` table |
| `d1/migrations/0006_character_pets.sql` | D1 schema for the `character_pets` table |
| `d1/migrations/0007_characters.sql` | D1 schema for the `characters` cache table |
| `d1/migrations/0008_zones.sql` | D1 schema for the `zones` and `item_zones` tables |
| `d1/migrations/0009_dungeons.sql` | D1 schema for the `dungeons` table |
| `d1/migrations/0010_api_inspector.sql` | D1 schema for the API Inspector metadata tables |
| `d1/migrations/0011_items.sql` | D1 schema for the `items` catalog table |
| `d1/migrations/0012_market_price_history.sql` | D1 schema for the `market_price_history` table |
| `d1/migrations/0013_auth.sql` | D1 schema for better-auth `user`, `session`, `account`, and `verification` tables |
| `lib/db/d1.ts` | Cloudflare D1 binding helper |
| `lib/storage/r2.ts` | Cloudflare R2 `IMMO_SOURCES_BUCKET` binding helper |
| `lib/services/auth-users.service.ts` | D1-backed user/account settings and admin user service |
| `lib/services/sync-state.service.ts` | D1-backed sync-state read/write service |
| `lib/services/admin/sync-logs.service.ts` | D1-backed admin sync log read/write service |
| `lib/services/user-preferences.service.ts` | D1-backed user preferences read/write service |
| `lib/services/price-tracker.service.ts` | D1-backed investment tracker read/write service |
| `lib/services/gear-presets.service.ts` | D1-backed gear preset read/write service |
| `lib/services/character-pets.service.ts` | D1-backed character pet read/write service |
| `lib/services/character-cache.ts` | D1-backed character roster cache service |
| `lib/services/admin/zones.service.ts` | D1-backed zone metadata and item-zone association service |
| `lib/services/admin/dungeons.service.ts` | D1-backed dungeon catalog service |
| `lib/services/admin/api-inspector.service.ts` | D1-backed API Inspector metadata service |
| `lib/services/admin/api-inspector-r2-snapshots.service.ts` | R2-backed API Inspector raw response snapshot service |
| `lib/services/items.service.ts` | D1-backed item catalog service |
| `lib/services/market-price-history.service.ts` | D1-backed market price history service |
| `package.json` | Cloudflare scripts and dependencies |

## Runtime Flow

Normal HTTP requests:

1. Cloudflare Worker receives the request.
2. `worker.ts` delegates to the generated OpenNext handler from `.open-next/worker.js`.
3. Next.js routes, pages, middleware/proxy behavior, auth, and API handlers run through OpenNext.
4. better-auth and migrated app data read/write through D1 binding `IMMO_SYNC_DB`.
5. Services access D1 through the `IMMO_SYNC_DB` binding.
6. Future source/object storage can access R2 through the `IMMO_SOURCES_BUCKET` binding.

Scheduled cron requests:

1. Cloudflare invokes the Worker `scheduled` handler for a configured cron expression.
2. `worker.ts` maps the expression to one existing route:
   - `0 0 * * 1` -> `/api/cron/sync-items`
   - `0 2 * * 1` -> `/api/cron/sync-recipes`
   - `0 4 * * *` -> `/api/cron/sync-prices`
3. The Worker creates an internal `POST` request with `Authorization: Bearer ${CRON_SECRET}`.
4. Existing route-level `CRON_SECRET` validation remains unchanged.

## Required Secrets

Set these as Cloudflare Worker secrets. Do not put real values in `wrangler.jsonc`, README, docs, or committed env files.

| Secret | Required now | Purpose |
|---|---:|---|
| `BETTER_AUTH_SECRET` | Yes | better-auth signing/encryption secret |
| `BETTER_AUTH_URL` | Yes | Public base URL used by better-auth |
| `CRON_SECRET` | Yes | Protects cron route handlers |
| `RESEND_API_KEY` | No | Password reset email delivery |
| `PASSWORD_RESET_EMAIL_FROM` | No | Password reset sender address |

Currently set on Worker `immo-web-suite`:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CRON_SECRET`

Legacy `DATABASE_URL` was removed from Worker secrets after the D1 cutover; do not recreate it unless a future branch intentionally reintroduces a non-D1 data source.

Set a secret:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
```

## Local Commands

```bash
npm install
npm run lint
npx tsc --noEmit
npm run build
npx opennextjs-cloudflare build
npx wrangler deploy --dry-run
npm run preview
```

`npm run preview` builds through OpenNext and serves through Wrangler's local Workers runtime.

## Deploy Commands

First deploy:

```bash
npx opennextjs-cloudflare build
npx wrangler deploy
```

Or use the package script:

```bash
npm run deploy
```

## GitHub Actions CD

`.github/workflows/ci.yml` deploys to Cloudflare Workers on pushes to `master` after type check, build, and Cloudflare D1 migrations pass. Pull requests run CI and smoke tests but do not deploy production or apply migrations.

The workflow uses Node.js 22 because current Wrangler releases require Node.js 22 or newer.

Required GitHub Actions repository secrets:

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account that owns Worker `immo-web-suite` |
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy authentication |
| `BETTER_AUTH_SECRET` | Build/runtime auth config |
| `BETTER_AUTH_URL` | Build-time auth URL fallback |
| `NEXT_PUBLIC_APP_URL` | Build-time client auth URL fallback |
| `E2E_EMAIL` | Playwright smoke login |
| `E2E_PASSWORD` | Playwright smoke login |

The deploy job pins the production URL to `https://immo-web-suite.void-presence.workers.dev` for `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`.

The `CLOUDFLARE_API_TOKEN` used by CI must include account-level `Workers R2 Storage: Edit` permission while the Worker has active R2 bindings or when bucket operations are run through Wrangler.

### D1 Migrations

D1 migrations live in `d1/migrations/` and are applied by the `Run DB migrations` GitHub Actions job before production deploy:

```bash
npx wrangler d1 migrations apply immo-web-suite-sync --remote
```

The same command can be run manually from the repo when a migration needs to be applied outside CI. It requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in the shell environment.

When adding a D1 table:

1. Add an append-only SQL migration under `d1/migrations/`.
2. Bind or reuse the D1 database in `wrangler.jsonc`.
3. Run the migration against remote D1 before production traffic depends on it, or merge through CI and let the `Run DB migrations` job apply it.
4. Document the table and ownership in this runbook and `docs/database.md`.

### R2 Buckets

R2 buckets are created with Wrangler and bound through `wrangler.jsonc`.

Current bucket:

| Bucket | Binding | Purpose | Status |
|---|---|---|---|
| `immo-web-suite-sources` | `IMMO_SOURCES_BUCKET` | API Inspector raw response snapshots and future source/archive storage | Created |

Create another bucket:

```bash
npx wrangler r2 bucket create <bucket-name>
```

List buckets:

```bash
npx wrangler r2 bucket list
```

When adding an R2-backed feature:

1. Reuse `IMMO_SOURCES_BUCKET` unless the data has a clearly separate lifecycle or access policy.
2. Keep object-key construction in a service/domain module, not in UI components.
3. Access the bucket through `lib/storage/r2.ts`.
4. Document the object prefix, owner service, and cleanup policy in this runbook.

Current R2 object prefixes:

| Prefix | Owner | Contents | Cleanup policy |
|---|---|---|---|
| `api-inspector/<endpoint-key>/<YYYY-MM-DD>/` | `lib/services/admin/api-inspector-r2-snapshots.service.ts` | Raw IdleMMO API Inspector responses with metadata, inferred schema, and schema diff | Manual for now; keep while endpoint documentation is still evolving |

After deploy, verify:

1. Public Worker URL loads.
2. `/login` loads.
3. Login succeeds or fails in an understood way.
4. `/dashboard` either loads or redirects correctly.
5. `/api/cron/sync-prices` rejects unauthenticated manual requests with `401`.
6. Cloudflare dashboard shows the three cron triggers.
7. Worker logs show no immediate boot-time errors.

Latest smoke test against `https://immo-web-suite.void-presence.workers.dev`:

| Check | Result |
|---|---|
| `GET /` | `200` |
| `GET /login` | `200` |
| `GET /dashboard` without session | `307` to `/login?from=%2Fdashboard` |
| `POST /api/cron/sync-prices` without auth | `401` |

## Cutover Checklist

1. Deploy Worker to the generated `workers.dev` URL.
2. Set all required secrets.
3. Update `BETTER_AUTH_URL` to the `workers.dev` production URL.
4. Smoke test login and dashboard.
5. Update external bookmarks/links to the `workers.dev` URL.
6. Watch Worker logs for D1/auth/runtime errors.

## What Codex Needs To Create Cloudflare Resources

Codex can prepare code without account access. To actually create the Worker and configure Cloudflare, Codex needs one of these access paths:

| Access path | What is needed | Notes |
|---|---|---|
| Wrangler login | Run `npx wrangler login` in the local environment | Easiest if you are present to complete browser auth |
| API token | `CLOUDFLARE_API_TOKEN` available in the shell | Token needs Workers Scripts edit/deploy permissions and account read access |
| Cloudflare plugin | Installed and connected Cloudflare plugin | Useful if you want account operations through the connector instead of local Wrangler |

Codex also needs these project decisions/values:

| Value | Needed for |
|---|---|
| Cloudflare account to deploy into | Worker creation |
| Worker name | Defaults to `immo-web-suite` from `wrangler.jsonc` |
| Production hostname | Currently `https://immo-web-suite.void-presence.workers.dev` |
| Whether to add a custom domain later | Optional cleanup only |
| Secret values | Runtime DB/auth/cron/email behavior |
| Legacy provider cleanup | Keep Vercel disconnected; remove old provider state when found |

## Later D1/R2 Planning Notes

Cloudflare runtime and D1 migration are usable in production. R2 foundation exists, and API Inspector raw response snapshots are the first R2-backed data flow.

Likely D1 candidates:

- Auth tables. Done: D1 `user`, `session`, `account`, and `verification` through better-auth direct D1 support plus `lib/services/auth-users.service.ts`.
- Gear presets.
- Price tracker records.
- Sync state and sync logs.
- Cached characters. Done: D1 `characters` through `lib/services/character-cache.ts`.

Likely R2 candidates:

- Imported/exported source snapshots.
- Large API response archives if API Inspector grows beyond relational storage.
- Generated reports or backup artifacts.

Keep the first R2 data phase intentionally small. A good first target is non-critical source/archive data, not the relational market catalog.

Current D1 migration status:

| Table | D1 database | Status |
|---|---|---|
| `sync_state` | `immo-web-suite-sync` | First D1 table; used by cron gate/observability |
| `sync_job_logs` | `immo-web-suite-sync` | Admin sync observability; append-only log storage |
| `user_preferences` | `immo-web-suite-sync` | User language and dashboard layout |
| `price_tracker` | `immo-web-suite-sync` | User-tracked investment items |
| `gear_presets` | `immo-web-suite-sync` | Saved gear loadouts |
| `character_pets` | `immo-web-suite-sync` | Saved character pet stats |
| `characters` | `immo-web-suite-sync` | Cached character roster |
| `zones` | `immo-web-suite-sync` | Admin-managed zone metadata |
| `item_zones` | `immo-web-suite-sync` | Gathering item to zone associations |
| `dungeons` | `immo-web-suite-sync` | Dungeon catalog and loot metadata |
| `api_endpoint_specs` | `immo-web-suite-sync` | API Inspector endpoint catalog/config |
| `api_response_schemas` | `immo-web-suite-sync` | API Inspector saved schemas |
| `api_schema_observations` | `immo-web-suite-sync` | API Inspector observation history |
| `items` | `immo-web-suite-sync` | Item catalog, inspect metadata, tier-1 price cache, and recipe metadata |
| `market_price_history` | `immo-web-suite-sync` | Append-only per-tier market price history |
| `user` | `immo-web-suite-sync` | better-auth user profile plus `role`, `idlemmo_token`, and `idlemmo_character_id` |
| `session` | `immo-web-suite-sync` | better-auth sessions |
| `account` | `immo-web-suite-sync` | better-auth credentials/accounts |
| `verification` | `immo-web-suite-sync` | better-auth verification and password reset records |

Neon/Postgres and Drizzle have been removed from the application. D1 is the persistence source of truth.

## Known Warnings

- OpenNext warns that Windows is not the ideal build host. Prefer Linux CI or Cloudflare's build environment for production deploys.
- Next.js warns that the `middleware` convention is deprecated in favor of `proxy`. This is not part of the Cloudflare migration scaffold.
- Current Worker dry-run upload is about 19 MiB raw / 3.85 MiB gzip. Check the active Cloudflare plan limit before relying on the free tier.
