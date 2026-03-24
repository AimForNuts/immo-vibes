# Internal API — POST /api/admin/sync-dungeons

Admin-only route that fetches the full dungeon list from the IdleMMO API and upserts it into the `dungeons` DB table.

## Request

```
POST /api/admin/sync-dungeons
Authorization: session cookie
```

No query parameters. No request body.

**Requires**: `session.user.role === "admin"` and `session.user.idlemmoToken` set.

## Response

### 200 OK

```json
{ "synced": 18 }
```

`synced` — number of dungeon rows inserted or updated.

### 400 Bad Request

```json
{ "error": "No IdleMMO API token configured" }
```

### 403 Forbidden

```json
{ "error": "Forbidden" }
```

### 502 Bad Gateway

```json
{ "error": "<IdleMMO API error message>" }
```

## Behaviour

1. Calls `getDungeons(token)` from `lib/idlemmo.ts`
2. Maps each `DungeonInfo` to a `dungeons` row:
   - `id`, `name`, `imageUrl`, `location` (from `location.name`), `levelRequired`, `difficulty`, `durationMs` (`length` field from API), `goldCost`, `shards`, `loot` (null if empty array)
3. `INSERT ... ON CONFLICT (id) DO UPDATE` — safe to re-run
4. Returns `{ synced: N }`

## DB table

`dungeons` — see `docs/database.md`

## Source

`app/api/admin/sync-dungeons/route.ts`
