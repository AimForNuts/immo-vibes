# Internal API - Sync Logs

Admin-only endpoint for recent manual sync job events.

Source:
- `app/api/admin/sync-logs/route.ts`
- `lib/services/admin/sync-logs.service.ts`

## GET /api/admin/sync-logs

Returns recent append-only sync job events from D1 `sync_job_logs`, newest first.

### Query Params

| Param | Type | Default | Notes |
|---|---|---:|---|
| `limit` | integer | `50` | Clamped to `1..200`. |
| `job` | string | - | Optional exact job filter, e.g. `items`, `prices`, `recipes`, `inspect`, `dungeons`. |

### 200 OK

```json
{
  "logs": [
    {
      "id": "fbd5b8a0-3aa1-4d87-a8fc-b3e7f07afc88",
      "job": "prices",
      "status": "progress",
      "message": "Price sync SWORD page 2/9: 48 synced, 2 skipped",
      "details": {
        "type": "SWORD",
        "page": 2,
        "pageSize": 50,
        "synced": 48,
        "skipped": 2,
        "total": 421,
        "totalPages": 9
      },
      "userId": "user_123",
      "createdAt": "2026-08-15T12:00:00.000Z"
    }
  ]
}
```

### Errors

| Status | Body | Cause |
|---|---|---|
| 403 | `{ "error": "Forbidden" }` | User is not signed in as an admin. |

## Logged Events

Manual admin sync routes write lifecycle events:

| Job | Route | Statuses |
|---|---|---|
| `items` | `POST /api/admin/sync-items` | `started`, `success`, `failed`, `skipped` |
| `inspect` | `POST /api/admin/sync-inspect` | `started`, `success`, `progress`, `skipped` |
| `prices` | `POST /api/admin/sync-prices` | `started`, `success`, `progress`, `skipped` |
| `recipes` | `POST /api/admin/sync-recipes` | `started`, `success`, `progress`, `skipped` |
| `dungeons` | `POST /api/admin/sync-dungeons` | `started`, `success`, `failed` |

`sync_job_logs` is stored in Cloudflare D1 through `lib/services/admin/sync-logs.service.ts`. The service falls back to Neon when the D1 binding is unavailable in local Node-based development.

The logging helper catches insert failures and logs them server-side so a logging outage does not block the sync job itself.
