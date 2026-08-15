# Admin Zone Routes

Admin-only endpoints for zone CRUD and zone picker data.

Sources:
- `app/api/admin/zones/route.ts`
- `app/api/admin/zones/[id]/route.ts`
- `lib/services/admin/zones.service.ts`

All routes require an authenticated session with `session.user.role === "admin"`.

---

## GET /api/admin/zones

Returns paginated zones for the admin world screen.

### Query Parameters

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `page` | number | `1` | Values below 1 become 1. Invalid numbers become 1. |
| `pageSize` | number | `25` | Clamped to 1-100. Invalid numbers become 25. |
| `name` | string | none | Case-insensitive partial match on `zones.name`. |
| `slim` | string | none | When exactly `true`, returns all zones as picker options and ignores pagination. |

### 200 OK

Default response:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Bluebell Hollow",
      "levelRequired": 1,
      "enemyCount": 3,
      "dungeonCount": 1,
      "worldBossCount": 0
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 25
}
```

Slim response:

```json
{
  "zones": [
    { "id": 1, "name": "Bluebell Hollow" }
  ]
}
```

### Errors

| Status | Body | Cause |
|---|---|---|
| 403 | `{ "error": "Forbidden" }` | Missing session or non-admin user. |

---

## POST /api/admin/zones

Creates a zone.

### Request Body

```json
{
  "name": "Bluebell Hollow",
  "levelRequired": 1
}
```

`name` must be a non-empty string. `levelRequired` must be a non-negative integer.

### 201 Created

Returns the inserted `zones` row.

```json
{
  "id": 1,
  "name": "Bluebell Hollow",
  "levelRequired": 1,
  "enemies": [],
  "dungeons": [],
  "worldBosses": []
}
```

### Errors

| Status | Body | Cause |
|---|---|---|
| 400 | `{ "error": "Invalid JSON body" }` | Request body could not be parsed as JSON. |
| 400 | `{ "error": "JSON body must be an object" }` | Request JSON was not an object. |
| 400 | `{ "error": "name is required" }` | Missing or blank `name`. |
| 400 | `{ "error": "levelRequired is required" }` | Missing `levelRequired`. |
| 400 | `{ "error": "levelRequired must be a non-negative integer" }` | `levelRequired` was not a non-negative integer. |
| 403 | `{ "error": "Forbidden" }` | Missing session or non-admin user. |

---

## GET /api/admin/zones/[id]

Returns one zone detail record.

`id` is the numeric `zones.id`.

### 200 OK

```json
{
  "id": 1,
  "name": "Bluebell Hollow",
  "levelRequired": 1,
  "enemies": [],
  "dungeons": [],
  "worldBosses": []
}
```

### Errors

| Status | Body | Cause |
|---|---|---|
| 400 | `{ "error": "id must be a positive integer" }` | `id` path parameter was not a positive integer. |
| 403 | `{ "error": "Forbidden" }` | Missing session or non-admin user. |
| 404 | `{ "error": "Not found" }` | No zone exists for the path `id`. |

---

## PATCH /api/admin/zones/[id]

Updates a zone.

`id` is the numeric `zones.id`.

### Request Body

```json
{
  "name": "Bluebell Hollow",
  "levelRequired": 1,
  "enemies": [],
  "dungeons": [],
  "worldBosses": []
}
```

All fields are optional. `name` must be a string when present, `levelRequired` must be a non-negative integer when present, and `enemies`, `dungeons`, and `worldBosses` must be arrays when present. JSON arrays are stored directly in `zones.enemies`, `zones.dungeons`, and `zones.world_bosses`.

### 200 OK

Returns the updated `zones` row.

### Errors

| Status | Body | Cause |
|---|---|---|
| 400 | `{ "error": "Invalid JSON body" }` | Request body could not be parsed as JSON. |
| 400 | `{ "error": "JSON body must be an object" }` | Request JSON was not an object. |
| 400 | `{ "error": "id must be a positive integer" }` | `id` path parameter was not a positive integer. |
| 400 | `{ "error": "levelRequired must be a non-negative integer" }` | `levelRequired` was not a non-negative integer. |
| 400 | `{ "error": "<field> must be an array" }` | A zone association list was present but not an array. |
| 403 | `{ "error": "Forbidden" }` | Missing session or non-admin user. |

---

## DELETE /api/admin/zones/[id]

Deletes a zone.

`id` is the numeric `zones.id`.

### 204 No Content

Empty response body.

### Errors

| Status | Body | Cause |
|---|---|---|
| 400 | `{ "error": "id must be a positive integer" }` | `id` path parameter was not a positive integer. |
| 403 | `{ "error": "Forbidden" }` | Missing session or non-admin user. |

### Side Effects

Deletes the `zones` row. Related `item_zones` rows cascade through the database foreign key.

