# Market Browser Enhancements — Design Spec
_Date: 2026-03-31_

## Overview

A set of improvements across the market browser tabs: a global tradable filter, richer Resources grouping with gathering locations, alchemy effect duration, better Collectibles location display, Merchants rework (type grouping + store price + admin edit), Recipes split into Brewing/Forging, and Legacy receiving past event items. Backed by a new `zones` DB table that replaces the existing `where_to_find` column on items.

---

## 1. Data Layer

### 1a. New `zones` table

New JSONB types in `lib/db/schema.ts`:

```typescript
interface ZoneSkillItem { item_hashed_id: string; skill: "woodcutting" | "fishing" | "mining"; }
interface ZoneEnemy     { id: number; name: string; level: number; drops: string[]; }    // drops = hashed item ids
interface ZoneDungeon   { id: number; name: string; drops?: string[]; }                  // drops = hashed item ids obtainable here
interface ZoneWorldBoss { id: number; name: string; drops?: string[]; }                  // drops = hashed item ids obtainable here
```

Table columns:

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text NOT NULL | Zone display name |
| `level_required` | integer | Used for pet battle and combat context |
| `skill_items` | jsonb `ZoneSkillItem[]` | Gatherable resources available in this zone |
| `enemies` | jsonb `ZoneEnemy[]` | Enemies present; each carries `drops[]` (hashed item ids they drop) |
| `dungeons` | jsonb `ZoneDungeon[]` | Dungeons located in this zone |
| `world_bosses` | jsonb `ZoneWorldBoss[]` | World bosses in this zone |

Populated manually (admin-provided data). The `enemies[].drops` array is what replaces the old per-item `where_to_find` — querying `zones WHERE enemies @> drop contains itemX` answers "where is this item dropped?".

### 1b. Remove `whereToFind` from items table

Drop the `where_to_find` column. Remove `ItemWhereToFind` interface. Zones become the sole source of truth for location data. The sync-inspect process no longer writes `where_to_find` to items.

### 1c. Add `storePrice` to items table

```typescript
storePrice: integer("store_price")  // NPC buy-from-merchant price; null until populated
```

Null by default. Data populated via admin script (to be provided separately).

### 1d. Extend `ItemEffect` with duration

```typescript
interface ItemEffect {
  attribute:    string;
  target:       string;
  value:        number;
  value_type:   string;
  duration_ms?: number | null;  // null or absent = permanent/passive
}
```

Sync-inspect reads duration from the IdleMMO API response and stores it. Missing/null = passive.

### 1e. New API endpoint

`GET /api/market/zones?itemHashedId=X`

Returns all zones where the item appears — either as a `skill_item` (gatherable) or within any `enemy.drops` array. Response shape:

```typescript
Array<{
  id:             number;
  name:           string;
  level_required: number;
  source:         "skill" | "enemy_drop" | "dungeon" | "world_boss";
  enemies?:       Array<{ name: string; level: number }>;  // enemies that drop this item in this zone
  skill?:         "woodcutting" | "fishing" | "mining";
}>
```

### 1f. New admin API endpoint

`PATCH /api/admin/items/[id]/store-price`

Body: `{ store_price: number | null }`. Admin role required. Updates `items.store_price`.

---

## 2. All-Tabs Tradable Filter

**Files:** `FilterBar.tsx`, `types.ts`, `MarketBrowser.tsx`

- Extend `Filters`: `tradeable: "all" | "tradable"`, default `"tradable"`
- Two-state toggle in FilterBar: `[ All ]  [ Tradable ✓ ]`
- Applied client-side: when `"tradable"`, exclude items where `is_tradeable === false`
- Applies on every tab including All and Recently Added

---

## 3. Resources Tab

**Files:** `lib/market-config.ts`, `/api/market/route.ts`, `MarketBrowser.tsx` (or a dedicated ResourcesTab component), `docs/game-mechanics/item-types.md`

### 3a. Event items → Legacy

`CAMPAIGN_ITEM` entries whose name matches `/\d{4}/` (contains a 4-digit year) are treated as legacy. Applied at the API query level:

- Resources query: `type IN (...) AND NOT (type = 'CAMPAIGN_ITEM' AND name ~ '\d{4}')`
- Legacy query: `type IN ('GEMSTONE') OR (type = 'CAMPAIGN_ITEM' AND name ~ '\d{4}')`

No new DB column needed. Future years are handled automatically by the regex.

### 3b. Category grouping

Items within Resources are grouped client-side into six buckets:

| Category | Types |
|---|---|
| Gathering | `LOG`, `FISH`, `ORE`, `METAL_BAR` |
| Food | `FOOD` |
| Consumables | `CAKE`, `GUIDANCE_SCROLL`, `TELEPORTATION_STONE`, `UPGRADE_STONE`, `MEMBERSHIP` |
| Crafting | `CRAFTING_MATERIAL`, `CONSTRUCTION_MATERIAL` |
| Pet Eggs | `PET_EGG` |
| Other | `RELIC`, `CHEST`, `TOKEN` |

Category mapping defined as a constant in `lib/market-config.ts` (or a new `lib/resources-categories.ts`).

### 3c. Where to gather

For items of type `LOG`, `FISH`, or `ORE` only: the DetailPanel queries `/api/market/zones?itemHashedId=X` and renders a "Where to Gather" section showing zone name, level required, and skill type. Metal bars and crafting materials are excluded (crafted, not gathered).

---

## 4. Alchemy Tab

**Files:** `lib/db/schema.ts` (done in §1d), `DetailPanel.tsx`, sync-inspect route, `lib/market-config.ts`

- Tab composition update: add `ESSENCE_CRYSTAL` to Alchemy types (moved from Merchants)
- DetailPanel: effect rows show duration alongside value — `"30s"`, `"5m"`, or `"Passive"` if null/absent
- Sync-inspect: read `duration_ms` from IdleMMO API effect objects and store on `effects[]`

---

## 5. Collectibles Tab

**Files:** `DetailPanel.tsx`, `useItemDetail.ts`, `/api/market/zones` endpoint

The "Where to Find" section in DetailPanel is rebuilt from zones data:

- Fetch `/api/market/zones?itemHashedId=X`
- Group results by zone
- Zones sorted by `level_required` ascending
- Enemies within each zone sorted by `level` ascending
- Dungeons and world bosses shown as separate subsections below enemies

Display format:
```
Zone: Darkwood Forest (Lv. 45)
  · Shadow Wolf   Lv. 42
  · Forest Golem  Lv. 48

Dungeons
  · Ruins of Valor
```

---

## 6. Merchants Tab

**Files:** `lib/market-config.ts`, `MarketBrowser.tsx` (Merchants grouping logic), `DetailPanel.tsx`, `ItemCard.tsx`, `/api/admin/items/[id]/store-price`

### 6a. Tab composition

- Remove `ESSENCE_CRYSTAL` from Merchants types
- Final Merchants types: `BAIT`, `BLANK_SCROLL`, `EMPTY_CRYSTAL`, `METAMORPHITE`, `NAMESTONE`, `SKIN`, `VIAL`

### 6b. Group by item type

Items grouped by `type` field (not quality):

| Group label | Type |
|---|---|
| Bait | `BAIT` |
| Scrolls | `BLANK_SCROLL` |
| Crystals | `EMPTY_CRYSTAL` |
| Upgrade Materials | `METAMORPHITE` |
| Name Stones | `NAMESTONE` |
| Skins | `SKIN` |
| Vials | `VIAL` |

Group labels defined in `lib/market-config.ts` or `lib/game-constants.ts`.

### 6c. Store price — display

`store_price` shown on item cards and in DetailPanel **only on the Merchants tab**. Displayed as a coin icon next to the existing vendor/market prices. Shows `—` when null.

### 6d. Store price — admin edit

When the authenticated user has `role = "admin"`:
- DetailPanel shows an inline editable field for store price
- Click to edit → input field → save on Enter or blur
- Calls `PATCH /api/admin/items/[id]/store-price`
- Uses existing admin inline-edit UI pattern from the project

---

## 7. Recipes Tab

**Files:** `MarketBrowser.tsx` (or a dedicated RecipesTab component), `/api/market/route.ts`

### Sub-tabs: Brewing / Forging

Toggle at the top of the Recipes tab:

```
[ Brewing ]  [ Forging ]
```

- State: local component state (not URL-persisted)
- Default: Brewing
- API filter: `recipe->>'skill' = 'Alchemy'` (Brewing) or `recipe->>'skill' = 'Forge'` (Forging)
- The existing Recipes tab loads only the active sub-tab's items

---

## 8. Legacy Tab

No layout changes. The API query update from §3a automatically routes year-named `CAMPAIGN_ITEM` entries here. Existing quality-based grouping is preserved.

---

## 9. docs/game-mechanics/item-types.md Updates

Update the Market Browser Tab Assignments table:

- **Resources**: remove `CAMPAIGN_ITEM`; add note: _"Year-named CAMPAIGN_ITEM entries (e.g. `Festival 2024`) are routed to Legacy via API-level regex — not listed here."_
- **Alchemy**: add `ESSENCE_CRYSTAL`
- **Merchants**: remove `ESSENCE_CRYSTAL`
- **Legacy**: add note: _"Also includes CAMPAIGN_ITEM where name contains a 4-digit year."_

---

## Affected Files Summary

| File | Change |
|---|---|
| `lib/db/schema.ts` | Add `zones` table + types; add `storePrice` to items; extend `ItemEffect`; remove `whereToFind` |
| `lib/db/migrations/` | Generated migration: drop `where_to_find`, add `store_price`, create `zones` |
| `lib/market-config.ts` | Update tab types; add Resources category mapping |
| `app/api/market/route.ts` | Year-regex filtering for Resources/Legacy; Recipes sub-tab skill filter |
| `app/api/market/zones/route.ts` | New endpoint |
| `app/api/admin/items/[id]/store-price/route.ts` | New endpoint |
| `app/api/admin/sync-inspect/route.ts` | Stop writing `where_to_find`; read effect `duration_ms` |
| `app/(dashboard)/dashboard/market/MarketBrowser.tsx` | Tradable filter; Resources categories; Merchants type-grouping; Recipes sub-tabs |
| `app/(dashboard)/dashboard/market/components/FilterBar.tsx` | Tradable toggle |
| `app/(dashboard)/dashboard/market/components/DetailPanel.tsx` | Zones-based where-to-find; effect duration; store price display + admin edit |
| `app/(dashboard)/dashboard/market/components/ItemCard.tsx` | Store price display (Merchants tab only) |
| `app/(dashboard)/dashboard/market/hooks/useItemDetail.ts` | Query zones endpoint instead of `where_to_find` |
| `app/(dashboard)/dashboard/market/types.ts` | `Filters.tradeable`; remove `where_to_find` from `FullItem` |
| `docs/game-mechanics/item-types.md` | Update tab assignments table |
