# Gear Comparison Calculator

## Overview

A side-by-side gear set comparator. Users build two full gear sets, optionally tie them to a character (to factor in base stats), and save them as named presets. An admin-only sync endpoint keeps the local item catalog up to date from the IdleMMO API.

---

## Equipment Slots

### Armor (always 5 slots)
| Slot | Item Type |
|---|---|
| Helmet | `HELMET` |
| Chestplate | `CHESTPLATE` |
| Greaves | `GREAVES` |
| Gauntlets | `GAUNTLETS` |
| Boots | `BOOTS` |

### Weapon Loadout (mutually exclusive — pick one style per set)
| Style | Slots |
|---|---|
| Dual Dagger | DAGGER (main hand) + DAGGER (off hand) — can be different items |
| Sword & Shield | SWORD + SHIELD |
| Bow | BOW |

A "full set" = 5 armor slots + 1 weapon loadout (6 or 7 item slots depending on style).

---

## Database Schema

### `items` table — local item catalog (admin-synced)
| Column | Type | Notes |
|---|---|---|
| `hashed_id` | text PK | IdleMMO hashed item ID |
| `name` | text | Item name |
| `type` | text | `SWORD`, `DAGGER`, `BOW`, `SHIELD`, `HELMET`, `CHESTPLATE`, `GREAVES`, `GAUNTLETS`, `BOOTS` |
| `quality` | text | `COMMON`, `RARE`, `EPIC`, … |
| `max_tier` | integer | Maximum upgrade tier |
| `image_url` | text \| null | CDN image URL |
| `synced_at` | timestamp | Last sync time |

### `gear_presets` table — saved sets per user
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID |
| `user_id` | text FK → user.id | Owner |
| `name` | text | Preset name (e.g. "PvP build") |
| `character_id` | text \| null | Hashed character ID to apply base stats |
| `weapon_style` | text | `DUAL_DAGGER`, `SWORD_SHIELD`, `BOW` |
| `slots` | jsonb | Map of slot key → `{ hashed_id, tier }` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**`slots` shape:**
```json
{
  "helmet":       { "hashed_id": "abc123", "tier": 2 },
  "chestplate":   { "hashed_id": "def456", "tier": 1 },
  "greaves":      { "hashed_id": "ghi789", "tier": 0 },
  "gauntlets":    { "hashed_id": "jkl012", "tier": 3 },
  "boots":        { "hashed_id": "mno345", "tier": 0 },
  "main_hand":    { "hashed_id": "pqr678", "tier": 2 },
  "off_hand":     { "hashed_id": "stu901", "tier": 1 }
}
```
`off_hand` is used for dual-dagger (second dagger) and sword+shield (shield). `main_hand` covers sword, bow, or first dagger.

### `user` table — add `role` column
| Column | Type | Default |
|---|---|---|
| `role` | text | `'user'` |

Admin role is set manually in the DB. Only the site owner needs it.

---

## Admin: Item Catalog Sync

**Endpoint:** `POST /api/admin/sync-items`
- Requires `session.user.role === 'admin'`
- Fetches items from IdleMMO API using the admin's stored API token
- Filters to equipment types only: `SWORD`, `DAGGER`, `BOW`, `SHIELD`, `HELMET`, `CHESTPLATE`, `GREAVES`, `GAUNTLETS`, `BOOTS`
- Paginates through all pages of `/v1/item/search?type=<TYPE>`
- Upserts rows into local `items` table
- Returns `{ synced: number, types: Record<string, number> }`

**Admin page:** `/dashboard/admin` — visible only to admin role
- Shows last sync time per item type
- "Sync All" button triggers the endpoint for all 9 types in sequence

---

## Gear Comparison Calculator

**Route:** `/dashboard/gear`

### Layout
```
[ Character: (dropdown) ]

[ Set A                    ] [ Set B                    ]
[ Weapon style: (toggle)   ] [ Weapon style: (toggle)   ]
[ Main Hand   (item picker)] [ Main Hand   (item picker)]
[ Off Hand    (item picker)] [ Off Hand    (item picker)]
[ Helmet      (item picker)] [ Helmet      (item picker)]
[ Chestplate  (item picker)] [ Chestplate  (item picker)]
[ Greaves     (item picker)] [ Greaves     (item picker)]
[ Gauntlets   (item picker)] [ Gauntlets   (item picker)]
[ Boots       (item picker)] [ Boots       (item picker)]

[ ← Copy A to B ]  [ Copy B to A → ]

[ Stats: Set A vs Set B (with character base)            ]
[ stat       | A value | B value | Δ (highlighted)       ]

[ Save Set A as preset… ]  [ Save Set B as preset… ]
[ Load preset… ]
```

### Item Picker
- Search box filters local DB items by name (client-side or lightweight server query)
- Filtered by slot type automatically (e.g., helmet slot only shows HELMETs)
- Selecting an item triggers a fetch to `/api/idlemmo/item/{hashed_id}` which proxies to IdleMMO `/v1/item/{hashed_id}/inspect`
- User selects tier (0 → max_tier); stats are scaled by `tier_modifiers`
- Shows item image, name, quality badge, and stat preview

### Stat Computation
1. Fetch full item details via inspect endpoint for each selected item
2. Apply tier modifier: `stat_value × tier_modifiers[tier]` (tier 0 = base, no modifier)
3. Sum all stats across all slots in the set
4. Optionally add character base stats (from `/v1/character/{id}/information`) to both sets
5. Display side-by-side; highlight cells where one set wins (green) or loses (red)

### Presets
- Saved sets are stored in `gear_presets` table
- Users can name, load, overwrite, and delete their presets
- Each preset stores the weapon style, all slot selections (hashed_id + tier), and optionally a linked character

---

## IdleMMO API Calls Used

| Endpoint | When |
|---|---|
| `GET /v1/item/search?type={TYPE}&page={N}` | Admin sync — catalog population |
| `GET /v1/item/{hashed_id}/inspect` | On item selection in picker (proxied, cached 60s) |
| `GET /v1/character/{id}/information` | When character is selected for base stat application |
