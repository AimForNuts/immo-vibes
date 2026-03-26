# GET /api/market

DB-backed item browser used by the Market Browser. Queries the local `items` table — no IdleMMO API call, no rate-limit risk. Items must be synced via the admin sync before they appear here.

> Source: `app/api/market/route.ts`

---

## Authentication

Requires a valid session. No IdleMMO API token needed (reads local DB only).

---

## Modes

Three mutually exclusive modes, selected by query params:

| Mode | Params | Description |
|---|---|---|
| Category browse | `?tab=gear&page=1` | All items whose type is in the tab's type list |
| Name search | `?query=iron&page=1` | Items whose name contains the substring (case-insensitive) |
| Recently added | `?tab=recently_added&dateRange=latest\|30d\|1y` | Items filtered by `first_seen_at` |

`?query=` can be combined with `?tab=recently_added` to name-filter within that result set.

---

## Request

```bash
# Category browse
GET /api/market?tab=gear&page=1
GET /api/market?tab=resources&page=2

# Name search (All tab)
GET /api/market?query=iron&page=1

# Recently added — latest sync batch
GET /api/market?tab=recently_added

# Recently added — last 30 days
GET /api/market?tab=recently_added&dateRange=30d

# Recently added — last year, filtered by name
GET /api/market?tab=recently_added&dateRange=1y&query=sword
```

**Query Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tab` | string | Conditional | Tab ID from `MARKET_TABS` (e.g. `gear`, `resources`, `recently_added`). Required unless `query` is provided. |
| `query` | string | Conditional | Name search substring. Required if `tab` is omitted or `"all"`. |
| `page` | integer | No | Page number (default: `1`). |
| `dateRange` | string | No | Only used with `tab=recently_added`. One of `latest` (default), `30d`, `1y`. |

At least one of `tab` (non-`"all"`) or `query` must be provided.

**`dateRange` values**

| Value | Behaviour |
|---|---|
| `latest` (default) | Items whose `first_seen_at` falls on the same calendar day as the most recent `first_seen_at` in the DB |
| `30d` | Items where `first_seen_at >= NOW() - INTERVAL '30 days'` |
| `1y` | Items where `first_seen_at >= NOW() - INTERVAL '1 year'` |

---

## Response — 200 OK

```json
{
  "items": [
    {
      "hashed_id": "abc123def456",
      "name": "Iron Ore",
      "type": "ORE",
      "quality": "STANDARD",
      "image_url": "https://cdn.idle-mmo.com/images/items/iron-ore.png",
      "vendor_price": 25,
      "last_sold_price": 18,
      "last_sold_at": "2026-03-25T10:00:00.000Z",
      "is_tradeable": true
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 3,
    "total": 142
  }
}
```

**Item fields**

| Field | Type | Description |
|---|---|---|
| `hashed_id` | string | Item identifier — use with `/api/market/item/[id]` for full stats |
| `name` | string | Item name |
| `type` | string | Item type (uppercase, e.g. `ORE`, `SWORD`) |
| `quality` | string | Quality tier (`STANDARD`, `REFINED`, `PREMIUM`, `EPIC`, `LEGENDARY`, `MYTHIC`, `UNIQUE`) |
| `image_url` | string\|null | Item image URL |
| `vendor_price` | integer\|null | NPC vendor sell price in gold |
| `last_sold_price` | integer\|null | Most recent market sale price (from price sync) |
| `last_sold_at` | string\|null | ISO 8601 timestamp of most recent sale |
| `is_tradeable` | boolean\|null | Whether the item can be traded on the market |

**Pagination fields**

| Field | Type | Description |
|---|---|---|
| `current_page` | integer | Current page number |
| `last_page` | integer | Last available page |
| `total` | integer | Total matching items |

Page size is 50 items. Category and recently-added tabs paginate all pages client-side on load.

**Sort order**

- Category tabs: alphabetical by name
- Name search: alphabetical by name
- Recently added: `first_seen_at DESC`, then `name ASC`

---

## Response — 400 Bad Request

```json
{ "error": "query or a category tab is required" }
```

Returned when neither a valid category `tab` nor a `query` param is provided.

---

## Response — 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

---

## Quality tiers

Items have a `quality` field. The canonical display order (lowest → highest):

| Quality | Colour |
|---|---|
| `STANDARD` | zinc/white |
| `REFINED` | blue |
| `PREMIUM` | green |
| `EPIC` | purple |
| `LEGENDARY` | orange |
| `MYTHIC` | fuchsia |
| `UNIQUE` | violet |

Colours are defined in `lib/game-constants.ts` (`QUALITY_COLORS`, `QUALITY_BORDER_COLORS`). Category tabs in the Market Browser group items by quality using `QUALITY_ORDER` from the same file.
