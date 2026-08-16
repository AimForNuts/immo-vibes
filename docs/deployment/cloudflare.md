# Cloudflare Migration Runbook

This document is the source of truth for Cloudflare resources created for ImmoWeb Suite. Keep it current whenever a Worker, route, trigger, secret, D1 database, R2 bucket, custom domain, or Cloudflare setting is added, changed, or removed.

## Migration Goal

Move ImmoWeb Suite from Vercel to Cloudflare in practical stages:

1. Cloudflare Workers/OpenNext runtime and Cloudflare Cron Triggers.
2. Custom domain and DNS cutover from Vercel to Cloudflare.
3. D1 and R2 adoption where they make the app simpler to own.
4. Vercel removal.
5. Neon removal after data migration is complete.

Temporary broken login or data access is acceptable during migration windows because this is currently a single-user hobby project. Prefer fast, understandable checkpoints over elaborate zero-downtime compatibility layers.

## Current Phase

Phase 1 is runtime migration only.

| Area | Current state |
|---|---|
| Hosting/runtime | Cloudflare Workers via OpenNext at `https://immo-web-suite.void-presence.workers.dev` |
| Database | Neon PostgreSQL remains active |
| ORM | Drizzle remains active |
| Auth | better-auth remains active against Neon |
| Cron | Cloudflare Cron Triggers call existing `app/api/cron/*` route handlers |
| Vercel | Still present during cutover window |
| D1 | Not created yet |
| R2 | Not created yet |

Cloudflare account: `Jogada`

## Created Cloudflare Resources

Record every Cloudflare resource here as it is created.

| Resource | Name | Purpose | Source of truth | Status |
|---|---|---|---|---|
| Worker | `immo-web-suite` | Next.js application runtime | `wrangler.jsonc`, `worker.ts` | Created |
| Worker URL | `https://immo-web-suite.void-presence.workers.dev` | Temporary Cloudflare smoke-test hostname | Cloudflare Workers | Created |
| Worker version | `3cc048bc-038c-4126-b485-b63dff5f8235` | Current deployed version after auth URL update | Wrangler deploy output | Created |
| Worker Assets binding | `ASSETS` | Static assets emitted by OpenNext | `wrangler.jsonc` | Created |
| Cron Trigger | `0 0 * * 1` | Weekly item catalog sync | `wrangler.jsonc`, `worker.ts` | Created |
| Cron Trigger | `0 2 * * 1` | Weekly recipe sync | `wrangler.jsonc`, `worker.ts` | Created |
| Cron Trigger | `0 4 * * *` | Daily price sync | `wrangler.jsonc`, `worker.ts` | Created |
| Custom domain | TBD | Production app hostname | Cloudflare dashboard / Wrangler | Not started |
| D1 database | TBD | Future relational data store | Future migration doc | Not started |
| R2 bucket | TBD | Future object/source storage | Future migration doc | Not started |

## Repo Files

| File | Purpose |
|---|---|
| `open-next.config.ts` | OpenNext Cloudflare adapter config |
| `wrangler.jsonc` | Worker name, runtime flags, assets binding, observability, cron schedules |
| `worker.ts` | Custom Worker entry with `fetch` and `scheduled` handlers |
| `package.json` | Cloudflare scripts and dependencies |
| `vercel.json` | Transitional Vercel cron config; remove after Vercel shutdown |

## Runtime Flow

Normal HTTP requests:

1. Cloudflare Worker receives the request.
2. `worker.ts` delegates to the generated OpenNext handler from `.open-next/worker.js`.
3. Next.js routes, pages, middleware/proxy behavior, auth, and API handlers run through OpenNext.
4. Server-side DB calls still go to Neon through `lib/db/index.ts`.

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
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | better-auth signing/encryption secret |
| `BETTER_AUTH_URL` | Yes | Public base URL used by better-auth |
| `CRON_SECRET` | Yes | Protects cron route handlers |
| `RESEND_API_KEY` | No | Password reset email delivery |
| `PASSWORD_RESET_EMAIL_FROM` | No | Password reset sender address |

Currently set on Worker `immo-web-suite`:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CRON_SECRET`

Set a secret:

```bash
npx wrangler secret put DATABASE_URL
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
3. Update `BETTER_AUTH_URL` to the Cloudflare URL for testing.
4. Smoke test login and dashboard.
5. Add the production custom domain in Cloudflare.
6. Update `BETTER_AUTH_URL` to the production domain.
7. Disable Vercel crons to avoid duplicate sync jobs.
8. Point DNS/custom domain traffic at Cloudflare.
9. Watch Worker logs and Neon connection behavior.
10. Remove `vercel.json` and Vercel project only after Cloudflare is stable.

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
| Production hostname | Custom domain setup |
| Whether to use `workers.dev` before domain cutover | First live smoke test |
| Secret values | Runtime DB/auth/cron/email behavior |
| Vercel shutdown timing | Avoid duplicate cron runs |

## Later D1/R2 Planning Notes

Do not start D1/R2 migration until the Cloudflare runtime is usable enough to debug from production logs.

Likely D1 candidates:

- Auth tables after better-auth adapter compatibility is confirmed.
- User preferences.
- Gear presets.
- Price tracker records.
- Sync state and sync logs.
- Cached characters.

Likely R2 candidates:

- Imported/exported source snapshots.
- Large API response archives if API Inspector grows beyond relational storage.
- Generated reports or backup artifacts.

Keep the first D1/R2 phase intentionally small. A good first target is non-critical app-owned data such as `user_preferences` or sync logs, not the entire market catalog.

## Known Warnings

- OpenNext warns that Windows is not the ideal build host. Prefer Linux CI or Cloudflare's build environment for production deploys.
- Next.js warns that the `middleware` convention is deprecated in favor of `proxy`. This is not part of the Cloudflare migration scaffold.
- Current Worker dry-run upload is about 19 MiB raw / 3.85 MiB gzip. Check the active Cloudflare plan limit before relying on the free tier.
