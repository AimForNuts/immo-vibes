# GET /api/characters

Returns a flat list of characters available to the authenticated user (primary + alts, capped at 5). Used by the sidebar character switcher and any UI that needs the character roster.

> Source: `app/api/characters/route.ts`

---

## Authentication

Requires a valid session. Returns `401` if unauthenticated, `[]` (empty array) if the user has no IdleMMO token or no primary character configured.

---

## Request

No parameters.

```bash
GET /api/characters
```

---

## Response — 200 OK

An array of character summaries, ordered primary-first. Maximum 5 entries.

```json
[
  {
    "hashed_id": "abc123def456",
    "name": "Arathiel",
    "image_url": "https://cdn.idle-mmo.com/images/characters/arathiel.png"
  },
  {
    "hashed_id": "xyz789ghi012",
    "name": "Shadowblade",
    "image_url": null
  }
]
```

**Fields**

| Field | Type | Description |
|---|---|---|
| `hashed_id` | string | Hashed character ID — use this to call `/api/idlemmo/character/[id]` |
| `name` | string | Character name |
| `image_url` | string\|null | Character avatar URL from IdleMMO CDN, or null |

---

## Response — 401 Unauthorized

```json
[]
```

(Empty array with HTTP 401, not an error object — intentional; simplifies client-side handling.)

---

## Response — 500 Internal Server Error

```json
[]
```

(Empty array with HTTP 500 — upstream IdleMMO API failure.)

---

## Data Source

Combines two IdleMMO API calls made in parallel:
- `GET /v1/character/{id}/information` → primary character
- `GET /v1/character/{id}/characters` → alt characters

Only `hashed_id`, `name`, and `image_url` are forwarded — no stat data.
