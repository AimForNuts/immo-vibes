# GET /api/market

Single-page item search proxy to the IdleMMO API. Used by the Market Browser for both category browsing (by type) and name-based search (All tab).

## Quality tiers

Items have a `quality` field with one of 7 tiers, displayed in this order (lowest → highest):

| Quality | Colour |
|---|---|
| `STANDARD` | zinc/white |
| `REFINED` | blue |
| `PREMIUM` | green |
| `EPIC` | purple |
| `LEGENDARY` | orange |
| `MYTHIC` | fuchsia |
| `UNIQUE` | violet |

Colours are defined in `lib/game-constants.ts` (`QUALITY_COLORS`, `QUALITY_BORDER_COLORS`). Canonical display order is `QUALITY_ORDER` (same file). Category tabs in the Market Browser group items by quality using this order, with a coloured section header per tier.

> Source: `app/api/market/route.ts`

---

## Authentication

Requires a valid session **and** an IdleMMO API token configured in Settings.

---

## Request

Exactly one of `type` or `query` must be provided.

```bash
# Browse by type (category tabs)
GET /api/market?type=ORE&page=1
GET /api/market?type=SWORD&page=2

# Search by name (All tab)
GET /api/market?query=iron&page=1
```

**Query Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `type` | string | Conditional | Single item type (case-insensitive). Returns all items of this type for the given page. |
| `query` | string | Conditional | Name search substring. Returns items whose names contain this string. |
| `page` | integer | No | Page number (default: `1`). |

One of `type` or `query` is required. If both are provided, `type` takes precedence.

**Valid `type` values:** All 42 IdleMMO item types. See `docs/game-mechanics/item-types.md` for the full list with descriptions.

---

## Response — 200 OK

```json
{
  "items": [
    {
      "hashed_id": "abc123def456",
      "name": "Iron Ore",
      "description": "Raw iron ore extracted from rock.",
      "image_url": "https://cdn.idle-mmo.com/images/items/iron-ore.png",
      "type": "ORE",
      "quality": "STANDARD",
      "vendor_price": 25
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 20,
    "total": 45,
    "from": 1,
    "to": 20
  }
}
```

**Fields**

| Field | Type | Description |
|---|---|---|
| `items` | array | Items for this page |
| `items[].hashed_id` | string | Item hashed ID — use with `/api/idlemmo/item/[id]` for full stats |
| `items[].name` | string | Item name |
| `items[].description` | string\|null | Flavour text |
| `items[].image_url` | string\|null | Item image URL from IdleMMO CDN |
| `items[].type` | string | Item type (uppercase) |
| `items[].quality` | string | Quality tier (`STANDARD`, `REFINED`, `PREMIUM`, `EPIC`, `LEGENDARY`, `MYTHIC`) |
| `items[].vendor_price` | integer\|null | Gold vendor sell price |
| `pagination` | object\|null | Pagination metadata |
| `pagination.current_page` | integer | Current page number |
| `pagination.last_page` | integer | Last available page |
| `pagination.per_page` | integer | Items per page (typically 20) |
| `pagination.total` | integer | Total matching items |

---

## Response — 400 Bad Request

```json
{ "error": "type or query is required" }
```

```json
{ "error": "No API token" }
```

---

## Response — 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

---

## Response — 429 Too Many Requests (from upstream)

```json
{ "error": "IdleMMO API returned 429" }
```

The Market Browser fetches one type at a time with a 250ms pause between calls. Avoid making rapid sequential requests.

---

## Data Source

Proxies directly to `GET /v1/item/search` on the IdleMMO API. Results are cached for 60 seconds per request (Next.js ISR revalidation).

Unlike `GET /api/items`, this route hits the **live IdleMMO API** — not the local database. Use this for market browsing; use `/api/items` for the gear calculator's item picker (which needs pre-synced equipment data).

---

## Difference from /api/items

| | `/api/market` | `/api/items` |
|---|---|---|
| **Source** | Live IdleMMO API | Local Postgres DB |
| **Types** | All 42 item types | Equipment types only (9 types) |
| **Pagination** | Single page per call | Capped at 30, no pagination |
| **Use case** | Market browsing | Gear calculator item picker |
| **Freshness** | 60s cache | Admin sync required |
