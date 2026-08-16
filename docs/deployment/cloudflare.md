# Cloudflare Migration Runbook

This document is the source of truth for Cloudflare resources created for ImmoWeb Suite. Keep it current whenever a Worker, route, trigger, secret, D1 database, R2 bucket, custom domain, or Cloudflare setting is added, changed, or removed.

## Migration Goal

Move ImmoWeb Suite from Vercel to Cloudflare in practical stages:

1. Cloudflare Workers/OpenNext runtime and Cloudflare Cron Triggers.
2. Use the free Cloudflare `workers.dev` hostname as the production URL.
3. D1 and R2 adoption where they make the app simpler to own.
4. Neon removal after data migration is complete.

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
| Vercel | Removed from repo config; project can be turned off in Vercel |
| D1 | Not created yet |
| R2 | Not created yet |

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
| D1 database | TBD | Future relational data store | Future migration doc | Not started |
| R2 bucket | TBD | Future object/source storage | Future migration doc | Not started |

## Repo Files

| File | Purpose |
|---|---|
| `open-next.config.ts` | OpenNext Cloudflare adapter config |
| `wrangler.jsonc` | Worker name, runtime flags, assets binding, observability, cron schedules |
| `worker.ts` | Custom Worker entry with `fetch` and `scheduled` handlers |
| `package.json` | Cloudflare scripts and dependencies |

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

## GitHub Actions CD

`.github/workflows/ci.yml` deploys to Cloudflare Workers on pushes to `master` after type check, build, and database migrations pass. Pull requests run CI and smoke tests but do not deploy production.

Required GitHub Actions repository secrets:

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account that owns Worker `immo-web-suite` |
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy authentication |
| `DATABASE_URL` | Build-time and migration database access |
| `BETTER_AUTH_SECRET` | Build/runtime auth config |
| `BETTER_AUTH_URL` | Build-time auth URL fallback |
| `NEXT_PUBLIC_APP_URL` | Build-time client auth URL fallback |
| `E2E_EMAIL` | Playwright smoke login |
| `E2E_PASSWORD` | Playwright smoke login |

The deploy job pins the production URL to `https://immo-web-suite.void-presence.workers.dev` for `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`.

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
5. Turn off or delete the Vercel project to stop old Vercel cron executions.
6. Update external bookmarks/links to the `workers.dev` URL.
7. Watch Worker logs and Neon connection behavior.

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
| Vercel shutdown timing | Turn off/delete the Vercel project after Cloudflare smoke checks pass |

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
