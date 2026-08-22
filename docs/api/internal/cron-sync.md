# Cron Sync Routes

Server-only routes called by Cloudflare Cron Triggers. They are not called from the UI.

Sources:
- `app/api/cron/sync-items/route.ts`
- `app/api/cron/sync-recipes/route.ts`
- `app/api/cron/sync-prices/route.ts`
- `wrangler.jsonc`
- `lib/services/sync-state.service.ts`

All cron sync routes require:

```http
Authorization: Bearer <CRON_SECRET>
```

If `CRON_SECRET` is missing or the authorization header does not match, the route returns:

```json
{ "error": "Unauthorized" }
```

with status `401`.

The active schedule is:

| Route | Schedule | Purpose |
|---|---|---|
| `POST /api/cron/sync-items` | Monday 00:00 UTC | Refresh item catalog fields for all known IdleMMO item types. |
| `POST /api/cron/sync-recipes` | Monday 02:00 UTC | Populate missing recipe result links for recipe items, gated on item sync. |
| `POST /api/cron/sync-prices` | Daily 04:00 UTC | Refresh market prices for the next batch of items ordered by oldest check time. |

The retired `POST /api/cron/sync-market` route was removed because it duplicated `sync-items`, was not scheduled, did not update `sync_state`, and its name implied price syncing even though it only refreshed catalog data.

`sync_state` is stored in Cloudflare D1 via `lib/services/sync-state.service.ts`. The item catalog is stored in Cloudflare D1 via `lib/services/items.service.ts`. Market price history is stored in Cloudflare D1 via `lib/services/market-price-history.service.ts`.

---

## POST /api/cron/sync-items

Refreshes catalog fields in `items` for every type in `IDLEMMO_ITEM_TYPES`.

### Data Source

Uses the first admin user row with a non-null `idlemmo_token`, then calls `searchItemsByType(type, token)` for each item type.

### 200 OK

```json
{
  "synced": 4200,
  "types": 42
}
```

### Errors

| Status | Body | Cause |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid cron secret. |
| 500 | `{ "error": "No admin IdleMMO token configured" }` | No admin account has an IdleMMO token. |

### Side Effects

- Upserts D1 `items.hashed_id`, `name`, `type`, `quality`, `image_url`, `vendor_price`, and `synced_at`.
- Marks `sync_state.job = "items"` as `running` before work starts.
- Marks `sync_state.job = "items"` as `done` after the loop completes.
- Logs and continues if one item type fails.

---

## POST /api/cron/sync-recipes

Populates missing `items.recipe_result_hashed_id` values for `RECIPE` rows.

### Gate

Requires D1 `sync_state.job = "items"` to have `status = "done"` and `completed_at` equal to the current UTC date. If the gate fails, the route does not call IdleMMO.

### Data Source

Uses the first admin user row with a non-null `idlemmo_token`, then calls:

```text
GET https://api.idle-mmo.com/v1/item/{hashedId}/inspect
```

for each matching recipe item.

### 200 OK

When skipped by the gate:

```json
{
  "skipped": true,
  "reason": "items sync not completed today"
}
```

When work runs:

```json
{
  "populated": 120,
  "noData": 8,
  "errors": 0
}
```

### Errors

| Status | Body | Cause |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid cron secret. |
| 500 | `{ "error": "No admin IdleMMO token configured" }` | No admin account has an IdleMMO token. |

### Side Effects

- Reads recipe candidates from D1 `items` where `type = "RECIPE"` and `recipe_result_hashed_id IS NULL`.
- Stores the inspected result item hash when present.
- Stores `"NONE"` when inspect succeeds but has no recipe result, excluding that row from later missing-result runs.
- Marks `sync_state.job = "recipes"` as `running`, then `done`.

---

## POST /api/cron/sync-prices

Refreshes market prices for the next batch of local items.

### Data Source

Uses the first admin user row with a non-null `idlemmo_token`, then selects up to 80 rows from `items` ordered by `price_checked_at ASC`. For each item it calls:

```text
GET https://api.idle-mmo.com/v1/item/{hashedId}/market-history?tier=0&type=listings
```

The IdleMMO response includes latest sold records for all tiers, so the route does not make one request per tier.

### 200 OK

```json
{
  "synced": 60,
  "skipped": 20,
  "total": 80
}
```

When there are no local items:

```json
{
  "synced": 0,
  "skipped": 0,
  "total": 0
}
```

### Errors

| Status | Body | Cause |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid cron secret. |
| 500 | `{ "error": "No admin IdleMMO token configured" }` | No admin account has an IdleMMO token. |

### Side Effects

- Updates tier 1 values on D1 `items.last_sold_price`, `items.last_sold_at`, and `items.price_checked_at`.
- Marks rows with no tier 1 sale as checked by updating D1 `items.price_checked_at`.
- Inserts tier 1 and higher-tier sales into D1 `market_price_history` with duplicate-sale protection.
- Marks `sync_state.job = "prices"` as `done` for observability.

---

## Admin Sync Observability

Manual admin sync routes write append-only lifecycle events to `sync_job_logs`. The admin Sync Status page reads these through `GET /api/admin/sync-logs`.

| Route | Job | Logged statuses |
|---|---|---|
| `POST /api/admin/sync-items` | `items` | `started`, `success`, `failed`, `skipped` |
| `POST /api/admin/sync-inspect` | `inspect` | `started`, `success`, `progress`, `skipped` |
| `POST /api/admin/sync-prices` | `prices` | `started`, `success`, `progress`, `skipped` |
| `POST /api/admin/sync-recipes` | `recipes` | `started`, `success`, `progress`, `skipped` |
| `POST /api/admin/sync-dungeons` | `dungeons` | `started`, `success`, `failed` |

`progress` means the route completed but skipped or errored on part of the batch. Logging failures are caught by the logging service and do not fail the sync request.
