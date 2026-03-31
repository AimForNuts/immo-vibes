# Market Browser Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Read `AGENTS.md` before starting. Follow all MANDATORY sections, including the pre-coding checklist under "Separation of Concerns".**

**Goal:** Enhance the market browser with a tradable filter, resource category grouping, zone-based gathering/drop locations, alchemy effect duration, Merchants rework, Recipes brewing/forging sub-tabs, and Legacy routing for past event items.

**Architecture:** A new `zones` DB table replaces the per-item `where_to_find` JSON column as the single source of truth for location data. All UI changes are layered on top of the existing tab/filter/detail-panel architecture — no structural rewrites. The admin store-price field starts null and is editable in-line by admin users on the Merchants tab.

**Tech Stack:** Next.js App Router, Drizzle ORM (Postgres/Neon), TypeScript, Tailwind CSS / shadcn-style components, better-auth for session/role.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/db/schema.ts` | Modify | Add `zones` table + types; add `storePrice` to items; extend `ItemEffect`; remove `whereToFind` |
| `lib/db/migrations/0011_zones_and_store_price.sql` | Create (generated) | DB migration |
| `lib/market-config.ts` | Modify | Fix tab types; add `RESOURCE_CATEGORIES`; add `MERCHANT_TYPE_LABELS` |
| `app/(dashboard)/dashboard/market/types.ts` | Modify | Add `ZoneResult`; extend `DbItem`; update `FullItem`; update `Filters` |
| `app/api/market/route.ts` | Modify | Year-regex for Resources/Legacy; `recipe_skill` in list response |
| `app/api/market/item/[id]/route.ts` | Modify | Remove `whereToFind`; add `storePrice` |
| `app/api/market/zones/route.ts` | Create | `GET /api/market/zones?itemHashedId=X` |
| `app/api/admin/items/[id]/store-price/route.ts` | Create | `PATCH /api/admin/items/[id]/store-price` |
| `app/api/admin/sync-inspect/route.ts` | Modify | Remove `whereToFind` write; add `duration_ms` to effects |
| `app/(dashboard)/dashboard/market/hooks/useItemDetail.ts` | Modify | Fetch zones; expose zones state |
| `app/(dashboard)/dashboard/market/components/DetailPanel.tsx` | Modify | Zones section; effect duration; store price + admin edit |
| `app/(dashboard)/dashboard/market/components/FilterBar.tsx` | Modify | Tradeable toggle |
| `app/(dashboard)/dashboard/market/components/ItemCard.tsx` | Modify | Store price display (Merchants only) |
| `app/(dashboard)/dashboard/market/MarketBrowser.tsx` | Modify | Tradeable filter; Resources categories; Merchants type grouping; Recipes sub-tabs; pass `isAdmin`/`activeTab` |
| `docs/game-mechanics/item-types.md` | Modify | Update tab assignments table |

---

## Task 1: DB Schema — zones table, storePrice, ItemEffect duration, remove whereToFind

**Files:**
- Modify: `lib/db/schema.ts`

**Pre-coding checklist:**
1. Files changing: `lib/db/schema.ts`
2. It's the DB schema source — all shape changes live here
3. No business logic — just type definitions and table declarations
4. `ItemWhereToFind` is removed; all consumers updated in later tasks
5. Server-only file

- [ ] **Step 1: Add zone JSONB interfaces and remove ItemWhereToFind**

In `lib/db/schema.ts`, replace the `ItemWhereToFind` interface and add zone types. Also extend `ItemEffect` with `duration_ms`. Place all new interfaces in the existing `// ─── Shared types for JSONB columns` block:

```typescript
// Remove this entire interface (it will be replaced by zones table):
// export interface ItemWhereToFind { ... }

// Add after ItemEffect (extend it):
export interface ItemEffect {
  attribute:    string;
  target:       string;
  value:        number;
  value_type:   string;
  duration_ms?: number | null;  // null or absent = permanent/passive
}

// Add new zone types:
export interface ZoneSkillItem {
  item_hashed_id: string;
  skill: "woodcutting" | "fishing" | "mining";
}

export interface ZoneEnemy {
  id:     number;
  name:   string;
  level:  number;
  drops:  string[];  // hashed item ids this enemy drops
}

export interface ZoneDungeon {
  id:     number;
  name:   string;
  drops?: string[];  // hashed item ids obtainable here
}

export interface ZoneWorldBoss {
  id:     number;
  name:   string;
  drops?: string[];  // hashed item ids obtainable here
}
```

- [ ] **Step 2: Add zones table**

After the `dungeons` table definition (end of schema.ts), add:

```typescript
/**
 * Geographic zones — manually curated.
 * Each zone groups enemies, dungeons, world bosses, and gatherable resources.
 * Replaces the per-item `where_to_find` JSONB column as the location source of truth.
 */
export const zones = pgTable("zones", {
  id:            serial("id").primaryKey(),
  name:          text("name").notNull(),
  /** Combat and pet-battle level requirement for this zone. */
  levelRequired: integer("level_required").notNull().default(0),
  /** Gatherable resources (LOG, FISH, ORE) available in this zone. */
  skillItems:    jsonb("skill_items").$type<ZoneSkillItem[]>().default(sql`'[]'::jsonb`),
  /** Enemies in this zone; each carries the items they drop. */
  enemies:       jsonb("enemies").$type<ZoneEnemy[]>().default(sql`'[]'::jsonb`),
  /** Dungeons located in this zone. */
  dungeons:      jsonb("dungeons").$type<ZoneDungeon[]>().default(sql`'[]'::jsonb`),
  /** World bosses in this zone. */
  worldBosses:   jsonb("world_bosses").$type<ZoneWorldBoss[]>().default(sql`'[]'::jsonb`),
});
```

- [ ] **Step 3: Add storePrice to items; remove whereToFind**

In the `items` table definition, inside the `// ── Inspect fields` block, remove the `whereToFind` line entirely:
```typescript
// DELETE this line:
whereToFind: jsonb("where_to_find").$type<ItemWhereToFind>(),
```

In the `// ── Price fields` block, add after `vendorPrice`:
```typescript
/**
 * NPC merchant sell price — what a player pays to buy this item from an NPC shop.
 * Distinct from vendorPrice (which is what the NPC pays the player).
 * Null until populated via admin script or inline edit.
 */
storePrice: integer("store_price"),
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to this task). Fix any type errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add zones table, storePrice, extend ItemEffect with duration_ms, remove whereToFind"
```

---

## Task 2: Generate and review DB migration

**Files:**
- Create: `lib/db/migrations/0011_zones_and_store_price.sql` (generated)

- [ ] **Step 1: Set up migration prerequisites in the worktree**

```bash
ln -s ../immo_web_suite/node_modules ./node_modules
cp ../immo_web_suite/.env.local .env.local
```

- [ ] **Step 2: Generate migration**

```bash
node_modules/.bin/drizzle-kit generate --name="zones_and_store_price"
```

Expected: creates `lib/db/migrations/0011_zones_and_store_price.sql`.

- [ ] **Step 3: Review the generated SQL**

Open `lib/db/migrations/0011_zones_and_store_price.sql`. It must contain:
- `DROP COLUMN "where_to_find"` on the `items` table
- `ADD COLUMN "store_price" integer` on the `items` table
- `CREATE TABLE "zones" (...)` with all 6 columns

If drizzle generates a `CREATE TABLE zones` without `IF NOT EXISTS`, that is correct — zones is a brand new table.

- [ ] **Step 4: Clean up worktree symlinks**

```bash
rm node_modules .env.local
```

- [ ] **Step 5: Commit**

```bash
git add lib/db/migrations/
git commit -m "feat: generate migration for zones table and store_price column"
```

---

## Task 3: Update market-config.ts — tab types, resource categories, merchant labels

**Files:**
- Modify: `lib/market-config.ts`

- [ ] **Step 1: Fix ESSENCE_CRYSTAL tab placement**

In `MARKET_TABS`, update the `alchemy` and `merchants` entries:

```typescript
{
  id:    "alchemy",
  label: "Alchemy",
  types: ["POTION", "ESSENCE_CRYSTAL"],  // ESSENCE_CRYSTAL moves here from merchants
},
// ...
{
  id:    "merchants",
  label: "Merchants",
  types: ["BAIT", "BLANK_SCROLL", "EMPTY_CRYSTAL", "METAMORPHITE", "NAMESTONE", "SKIN", "VIAL"],
  // ESSENCE_CRYSTAL removed
},
```

- [ ] **Step 2: Add RESOURCE_CATEGORIES constant**

At the bottom of `lib/market-config.ts`, add:

```typescript
/**
 * Category grouping for the Resources tab.
 * Each category maps to a set of IdleMMO item types.
 * Order determines display order.
 */
export const RESOURCE_CATEGORIES: Array<{ label: string; types: string[] }> = [
  { label: "Gathering",   types: ["LOG", "FISH", "ORE", "METAL_BAR"] },
  { label: "Food",        types: ["FOOD"] },
  { label: "Consumables", types: ["CAKE", "GUIDANCE_SCROLL", "TELEPORTATION_STONE", "UPGRADE_STONE", "MEMBERSHIP"] },
  { label: "Crafting",    types: ["CRAFTING_MATERIAL", "CONSTRUCTION_MATERIAL"] },
  { label: "Pet Eggs",    types: ["PET_EGG"] },
  { label: "Other",       types: ["RELIC", "CHEST", "TOKEN"] },
];
```

- [ ] **Step 3: Add MERCHANT_TYPE_LABELS constant**

```typescript
/**
 * Display label for each item type on the Merchants tab.
 * Used to group Merchants items by type instead of quality.
 */
export const MERCHANT_TYPE_LABELS: Record<string, string> = {
  BAIT:         "Bait",
  BLANK_SCROLL: "Scrolls",
  EMPTY_CRYSTAL: "Crystals",
  METAMORPHITE: "Upgrade Materials",
  NAMESTONE:    "Name Stones",
  SKIN:         "Skins",
  VIAL:         "Vials",
};
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/market-config.ts
git commit -m "feat: fix ESSENCE_CRYSTAL tab, add RESOURCE_CATEGORIES and MERCHANT_TYPE_LABELS"
```

---

## Task 4: Update types.ts — ZoneResult, DbItem recipe_skill, FullItem, Filters

**Files:**
- Modify: `app/(dashboard)/dashboard/market/types.ts`

- [ ] **Step 1: Replace the file contents with the updated types**

```typescript
import type { ItemEffect, ItemRecipe } from "@/lib/db/schema";

/** Item shape returned by the DB-backed GET /api/market route. */
export interface DbItem {
  hashed_id:       string;
  name:            string;
  type:            string;
  quality:         string;
  image_url:       string | null;
  vendor_price:    number | null;
  last_sold_price: number | null;
  last_sold_at:    string | null;
  is_tradeable:    boolean | null;
  recipe_skill:    string | null;  // populated for RECIPE-type items; null otherwise
}

/** Full item from GET /api/market/item/[id] — includes inspect fields. */
export interface FullItem extends DbItem {
  description:    string | null;
  is_tradeable:   boolean | null;
  max_tier:       number | null;
  requirements:   Record<string, number> | null;
  base_stats:     Record<string, number> | null;
  tier_modifiers: Record<string, number> | null;
  effects:        ItemEffect[] | null;
  recipe:         ItemRecipe | null;
  store_price:    number | null;
  // where_to_find removed — location data lives in the zones table
}

/** Single zone entry returned by GET /api/market/zones. */
export interface ZoneResult {
  id:             number;
  name:           string;
  level_required: number;
  /** Enemies in this zone that drop the queried item. Present when source includes "enemy_drop". */
  enemies?:       Array<{ name: string; level: number }>;
  /** The gathering skill type. Present when source is "skill". */
  skill?:         "woodcutting" | "fishing" | "mining";
  /** Dungeons in this zone that yield the queried item. Present when source includes "dungeon". */
  dungeons?:      Array<{ name: string }>;
  /** World bosses in this zone that yield the queried item. Present when source includes "world_boss". */
  world_bosses?:  Array<{ name: string }>;
}

export interface MarketPrice {
  price:    number | null;
  sold_at:  string | null;
  quantity: number | null;
}

export interface Filters {
  tradeable: "all" | "tradable";
  rarities:  Set<string>;
  types:     Set<string>;
  vendorMin: string;
  vendorMax: string;
  marketMin: string;
  marketMax: string;
}

export const DEFAULT_FILTERS: Filters = {
  tradeable: "tradable",  // default: show tradable items only
  rarities:  new Set(),
  types:     new Set(),
  vendorMin: "",
  vendorMax: "",
  marketMin: "",
  marketMax: "",
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Fix any errors — downstream files reference `ItemWhereToFind` via `FullItem.where_to_find`; those will be fixed in their own tasks.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/dashboard/market/types.ts
git commit -m "feat: update market types — ZoneResult, recipe_skill on DbItem, remove where_to_find, add tradeable filter"
```

---

## Task 5: Update /api/market/route.ts — recipe_skill, year-regex for Resources/Legacy

**Files:**
- Modify: `app/api/market/route.ts`

- [ ] **Step 1: Add recipe_skill to both response mappers**

In both the `recently_added` branch and the standard branch, update the row mapping to include `recipe_skill`. In the select, add:

```typescript
const rows = await db
  .select({
    hashedId:      items.hashedId,
    name:          items.name,
    type:          items.type,
    quality:       items.quality,
    imageUrl:      items.imageUrl,
    vendorPrice:   items.vendorPrice,
    lastSoldPrice: items.lastSoldPrice,
    lastSoldAt:    items.lastSoldAt,
    isTradeable:   items.isTradeable,
    recipeSkill:   sql<string | null>`${items.recipe}->>'skill'`,
  })
  // ... rest unchanged
```

And in the response mapper (both branches):
```typescript
items: rows.map((r) => ({
  hashed_id:       r.hashedId,
  name:            r.name,
  type:            r.type,
  quality:         r.quality,
  image_url:       r.imageUrl,
  vendor_price:    r.vendorPrice   ?? null,
  last_sold_price: r.lastSoldPrice ?? null,
  last_sold_at:    r.lastSoldAt    ? r.lastSoldAt.toISOString() : null,
  is_tradeable:    r.isTradeable   ?? null,
  recipe_skill:    r.recipeSkill   ?? null,
})),
```

- [ ] **Step 2: Add year-regex handling for Resources and Legacy tabs**

In the standard tab/search mode section, after the `typeList` check, add special-case logic for `resources` and `legacy` tabs:

```typescript
// ── Standard tab / search mode ────────────────────────────────────────────
const tab      = MARKET_TABS.find((t) => t.id === tabId);
const typeList = tab && tab.types.length > 0 ? tab.types : null;

if (!query && !typeList) {
  return NextResponse.json({ error: "query or a category tab is required" }, { status: 400 });
}

// Build WHERE conditions
const conditions = [];
if (query) conditions.push(ilike(items.name, `%${query}%`));

if (tabId === "legacy") {
  // Legacy: GEMSTONE items OR year-named CAMPAIGN_ITEMs
  conditions.push(
    sql`(${items.type} = 'GEMSTONE' OR (${items.type} = 'CAMPAIGN_ITEM' AND ${items.name} ~ '\\d{4}'))`
  );
} else if (tabId === "resources") {
  // Resources: the tab's type list, excluding year-named CAMPAIGN_ITEMs
  if (typeList) conditions.push(inArray(items.type, typeList));
  conditions.push(
    sql`NOT (${items.type} = 'CAMPAIGN_ITEM' AND ${items.name} ~ '\\d{4}')`
  );
} else {
  if (typeList) conditions.push(inArray(items.type, typeList));
}

const where = conditions.length > 1 ? and(...conditions) : conditions[0];
```

- [ ] **Step 3: Verify TypeScript and check SQL import**

Make sure `sql` is imported from `drizzle-orm` (it already is in the existing file).

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/market/route.ts
git commit -m "feat: add recipe_skill to market list response, year-regex routing for resources/legacy tabs"
```

---

## Task 6: Update /api/market/item/[id]/route.ts — remove whereToFind, add storePrice

**Files:**
- Modify: `app/api/market/item/[id]/route.ts`

- [ ] **Step 1: Update select and response**

Replace the select object and response:

```typescript
const rows = await db
  .select({
    hashedId:      items.hashedId,
    name:          items.name,
    type:          items.type,
    quality:       items.quality,
    imageUrl:      items.imageUrl,
    vendorPrice:   items.vendorPrice,
    lastSoldPrice: items.lastSoldPrice,
    lastSoldAt:    items.lastSoldAt,
    description:   items.description,
    isTradeable:   items.isTradeable,
    maxTier:       items.maxTier,
    requirements:  items.requirements,
    baseStats:     items.baseStats,
    tierModifiers: items.tierModifiers,
    effects:       items.effects,
    recipe:        items.recipe,
    storePrice:    items.storePrice,
    recipeSkill:   sql<string | null>`${items.recipe}->>'skill'`,
  })
  .from(items)
  .where(eq(items.hashedId, id))
  .limit(1);
```

Add `import { sql } from "drizzle-orm";` to the imports if not present.

Update the response mapper:
```typescript
return NextResponse.json({
  item: {
    hashed_id:       r.hashedId,
    name:            r.name,
    type:            r.type,
    quality:         r.quality,
    image_url:       r.imageUrl,
    vendor_price:    r.vendorPrice,
    last_sold_price: r.lastSoldPrice,
    last_sold_at:    r.lastSoldAt?.toISOString() ?? null,
    description:     r.description,
    is_tradeable:    r.isTradeable,
    max_tier:        r.maxTier,
    requirements:    r.requirements,
    base_stats:      r.baseStats,
    tier_modifiers:  r.tierModifiers,
    effects:         r.effects,
    recipe:          r.recipe,
    store_price:     r.storePrice ?? null,
    recipe_skill:    r.recipeSkill ?? null,
    // where_to_find removed — use GET /api/market/zones instead
  },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "app/api/market/item/[id]/route.ts"
git commit -m "feat: remove whereToFind from item detail API, add storePrice and recipe_skill"
```

---

## Task 7: Create /api/market/zones/route.ts

**Files:**
- Create: `app/api/market/zones/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { zones } from "@/lib/db/schema";
import type { ZoneResult } from "@/app/(dashboard)/dashboard/market/types";

/**
 * GET /api/market/zones?itemHashedId=X
 *
 * Returns all zones where the item appears — as a gatherable skill item,
 * an enemy drop, a dungeon drop, or a world-boss drop.
 *
 * Response: { zones: ZoneResult[] }
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const itemHashedId = new URL(request.url).searchParams.get("itemHashedId");
  if (!itemHashedId) {
    return NextResponse.json({ error: "itemHashedId is required" }, { status: 400 });
  }

  const allZones = await db.select().from(zones);

  const results: ZoneResult[] = [];

  for (const zone of allZones) {
    const matchingEnemies = (zone.enemies ?? []).filter((e) =>
      e.drops.includes(itemHashedId)
    );
    const matchingDungeons = (zone.dungeons ?? []).filter((d) =>
      d.drops?.includes(itemHashedId) ?? false
    );
    const matchingWorldBosses = (zone.worldBosses ?? []).filter((wb) =>
      wb.drops?.includes(itemHashedId) ?? false
    );
    const skillMatch = (zone.skillItems ?? []).find((s) =>
      s.item_hashed_id === itemHashedId
    );

    if (!skillMatch && matchingEnemies.length === 0 && matchingDungeons.length === 0 && matchingWorldBosses.length === 0) {
      continue;
    }

    const entry: ZoneResult = {
      id:             zone.id,
      name:           zone.name,
      level_required: zone.levelRequired,
    };

    if (skillMatch) {
      entry.skill = skillMatch.skill;
    }
    if (matchingEnemies.length > 0) {
      entry.enemies = matchingEnemies.map((e) => ({ name: e.name, level: e.level }));
    }
    if (matchingDungeons.length > 0) {
      entry.dungeons = matchingDungeons.map((d) => ({ name: d.name }));
    }
    if (matchingWorldBosses.length > 0) {
      entry.world_bosses = matchingWorldBosses.map((wb) => ({ name: wb.name }));
    }

    results.push(entry);
  }

  // Sort by level_required ascending
  results.sort((a, b) => a.level_required - b.level_required);

  return NextResponse.json({ zones: results });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/market/zones/route.ts
git commit -m "feat: add GET /api/market/zones endpoint for item location lookup"
```

---

## Task 8: Create /api/admin/items/[id]/store-price/route.ts

**Files:**
- Create: `app/api/admin/items/[id]/store-price/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";

/**
 * PATCH /api/admin/items/[id]/store-price
 *
 * Updates the NPC merchant store price for an item.
 * Body: { store_price: number | null }
 * Admin only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body || !("store_price" in body)) {
    return NextResponse.json({ error: "store_price is required" }, { status: 400 });
  }

  const storePrice = body.store_price === null ? null : Number(body.store_price);
  if (storePrice !== null && (isNaN(storePrice) || storePrice < 0)) {
    return NextResponse.json({ error: "store_price must be a non-negative number or null" }, { status: 400 });
  }

  const result = await db
    .update(items)
    .set({ storePrice })
    .where(eq(items.hashedId, id))
    .returning({ hashedId: items.hashedId });

  if (result.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, store_price: storePrice });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "app/api/admin/items/[id]/store-price/route.ts"
git commit -m "feat: add PATCH /api/admin/items/[id]/store-price endpoint"
```

---

## Task 9: Update sync-inspect — remove whereToFind, add duration_ms

**Files:**
- Modify: `app/api/admin/sync-inspect/route.ts`

- [ ] **Step 1: Update the DB update call**

In the `for` loop where items are updated, change:

```typescript
// OLD:
await db
  .update(items)
  .set({
    description:   item.description ?? null,
    isTradeable:   item.is_tradeable ?? null,
    maxTier:       item.max_tier ?? null,
    requirements:  item.requirements ?? null,
    baseStats:     item.stats ?? null,
    tierModifiers: item.tier_modifiers ?? null,
    effects:       item.effects ?? null,
    recipe:        item.recipe ?? null,
    whereToFind:   item.where_to_find ?? null,   // <-- remove this line
    inspectedAt:   now,
  })
  .where(eq(items.hashedId, hashedId));

// NEW:
await db
  .update(items)
  .set({
    description:   item.description ?? null,
    isTradeable:   item.is_tradeable ?? null,
    maxTier:       item.max_tier ?? null,
    requirements:  item.requirements ?? null,
    baseStats:     item.stats ?? null,
    tierModifiers: item.tier_modifiers ?? null,
    effects:       item.effects
      ? item.effects.map((e: { attribute: string; target: string; value: number; value_type: string; duration_ms?: number | null }) => ({
          attribute:   e.attribute,
          target:      e.target,
          value:       e.value,
          value_type:  e.value_type,
          duration_ms: e.duration_ms ?? null,
        }))
      : null,
    recipe:        item.recipe ?? null,
    inspectedAt:   now,
  })
  .where(eq(items.hashedId, hashedId));
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/sync-inspect/route.ts
git commit -m "feat: remove whereToFind from sync-inspect, read duration_ms from effects"
```

---

## Task 10: Update useItemDetail — fetch zones, expose zones state

**Files:**
- Modify: `app/(dashboard)/dashboard/market/hooks/useItemDetail.ts`

- [ ] **Step 1: Add zones state and fetch logic**

Add to the state declarations at the top of `useItemDetail`:
```typescript
const [itemZones, setItemZones] = useState<import("../types").ZoneResult[]>([]);
const [craftedByZones, setCraftedByZones] = useState<import("../types").ZoneResult[]>([]);
```

In `handleItemClick`, after `setSelectedItem(item)`, add resets:
```typescript
setItemZones([]);
setCraftedByZones([]);
```

After the `setItemDetail(detail)` call (inside the `.then` after fetching item detail), add a zones fetch:
```typescript
// Fetch zones for this item (where to find / gather)
fetch(`/api/market/zones?itemHashedId=${item.hashed_id}`)
  .then((r) => r.json())
  .then((d) => setItemZones(d.zones ?? []))
  .catch(() => setItemZones([]));
```

In the `craftedByDetail` fetch section, after `setCraftedByDetail(recipeDetail)`, add:
```typescript
// Fetch zones for the recipe scroll (where it drops from)
fetch(`/api/market/zones?itemHashedId=${recipeRef.hashed_id}`)
  .then((r) => r.json())
  .then((d) => setCraftedByZones(d.zones ?? []))
  .catch(() => setCraftedByZones([]));
```

In `clearSelection`, add:
```typescript
setItemZones([]);
setCraftedByZones([]);
```

Add `itemZones` and `craftedByZones` to the return type interface and return object:
```typescript
interface UseItemDetailReturn {
  // ... existing fields ...
  itemZones:         ZoneResult[];
  craftedByZones:    ZoneResult[];
}

// in return statement:
return {
  // ... existing ...
  itemZones,
  craftedByZones,
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/dashboard/market/hooks/useItemDetail.ts
git commit -m "feat: fetch zones in useItemDetail, expose itemZones and craftedByZones"
```

---

## Task 11: Update DetailPanel — zones, effect duration, store price + admin edit

**Files:**
- Modify: `app/(dashboard)/dashboard/market/components/DetailPanel.tsx`

- [ ] **Step 1: Update props interface**

```typescript
import type { DbItem, FullItem, MarketPrice, ZoneResult } from "../types";

interface DetailPanelProps {
  item:              DbItem;
  detail:            FullItem | null | "loading";
  selectedTier:      number;
  tierMarketPrice:   MarketPrice | null | undefined;
  materialPrices:    Record<string, MarketPrice | null | undefined>;
  craftedByDetail:   FullItem | null | "loading" | undefined;
  craftedByItemData: DbItem | null | undefined;
  resultItemData:    DbItem | null | undefined;
  itemZones:         ZoneResult[];
  craftedByZones:    ZoneResult[];
  activeTab:         string;
  isAdmin:           boolean;
  onClose:           () => void;
  onTierChange:      (tier: number) => void;
  onStorePriceSave:  (price: number | null) => void;
}
```

Update the function signature to destructure the new props:
```typescript
export function DetailPanel({
  item, detail, selectedTier, tierMarketPrice, materialPrices,
  craftedByDetail, craftedByItemData, resultItemData,
  itemZones, craftedByZones,
  activeTab, isAdmin,
  onClose, onTierChange, onStorePriceSave,
}: DetailPanelProps) {
```

- [ ] **Step 2: Add store price state for inline edit**

Inside the component, add:
```typescript
const [editingStorePrice, setEditingStorePrice] = useState(false);
const [storePriceInput, setStorePriceInput]     = useState("");

function handleStorePriceEdit() {
  setStorePriceInput(d?.store_price?.toString() ?? "");
  setEditingStorePrice(true);
}

function handleStorePriceSave() {
  const val = storePriceInput.trim() === "" ? null : Number(storePriceInput);
  if (val !== null && isNaN(val)) return;
  onStorePriceSave(val);
  setEditingStorePrice(false);
}
```

- [ ] **Step 3: Replace the "Where to Find" section with Zones**

Remove the entire existing `{/* Where to Find */}` block (lines 389–433 in the original). Replace with:

```tsx
{/* Where to Find / Gather — sourced from zones table */}
{itemZones.length > 0 && (
  <div>
    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
      {itemZones.some((z) => z.skill) ? "Where to Gather" : "Where to Find"}
    </p>
    <div className="space-y-3">
      {itemZones.map((zone) => (
        <div key={zone.id} className="bg-zinc-900 border border-zinc-800 rounded-md p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-200">{zone.name}</span>
            <span className="text-[10px] font-mono text-zinc-600">Lv.{zone.level_required}</span>
          </div>
          {zone.skill && (
            <p className="text-[10px] text-amber-400/70 capitalize">{zone.skill}</p>
          )}
          {zone.enemies && zone.enemies.length > 0 && (
            <div className="space-y-0.5">
              {zone.enemies
                .slice()
                .sort((a, b) => a.level - b.level)
                .map((e) => (
                  <div key={e.name} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{e.name}</span>
                    <span className="font-mono text-zinc-600">Lv.{e.level}</span>
                  </div>
                ))}
            </div>
          )}
          {zone.dungeons && zone.dungeons.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Dungeons</p>
              {zone.dungeons.map((dg) => (
                <div key={dg.name} className="text-xs text-zinc-400">{dg.name}</div>
              ))}
            </div>
          )}
          {zone.world_bosses && zone.world_bosses.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">World Bosses</p>
              {zone.world_bosses.map((wb) => (
                <div key={wb.name} className="text-xs text-zinc-400">{wb.name}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 4: Update "Recipe drops from" to use craftedByZones**

In the `{/* Crafted By */}` section, replace the `{craftedByDetail.where_to_find && (...)}` block with:

```tsx
{/* Recipe scroll drop locations */}
{craftedByZones.length > 0 && (
  <div className="border-t border-zinc-800 pt-2 space-y-1.5">
    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Recipe drops from</p>
    {craftedByZones.map((zone) => (
      <div key={zone.id} className="space-y-0.5">
        <p className="text-[10px] text-zinc-500">{zone.name} (Lv.{zone.level_required})</p>
        {zone.enemies?.sort((a, b) => a.level - b.level).map((e) => (
          <div key={e.name} className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">{e.name}</span>
            <span className="font-mono text-zinc-600">Lv.{e.level}</span>
          </div>
        ))}
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 5: Add duration to the Effects section**

Replace the effects render line:
```tsx
// OLD:
<span>
  {eff.value_type === "percentage" ? `+${eff.value}%` : `+${eff.value}`}{" "}
  {statLabel(eff.attribute)} ({eff.target})
</span>

// NEW:
<span>
  {eff.value_type === "percentage" ? `+${eff.value}%` : `+${eff.value}`}{" "}
  {statLabel(eff.attribute)} ({eff.target})
  {eff.duration_ms != null
    ? eff.duration_ms >= 60000
      ? ` · ${Math.round(eff.duration_ms / 60000)}m`
      : ` · ${Math.round(eff.duration_ms / 1000)}s`
    : null}
</span>
```

- [ ] **Step 6: Add Store Price section (Merchants tab only)**

After the Prices grid section (`{/* Prices */}`), add:

```tsx
{/* Store Price — Merchants tab only */}
{activeTab === "merchants" && (
  <div className="bg-zinc-900 rounded-md p-3 border border-zinc-800">
    <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1">Store Price</p>
    {isAdmin && editingStorePrice ? (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={storePriceInput}
          onChange={(e) => setStorePriceInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleStorePriceSave(); if (e.key === "Escape") setEditingStorePrice(false); }}
          onBlur={handleStorePriceSave}
          autoFocus
          className="flex-1 px-2 py-1 text-xs bg-zinc-800 border border-amber-400/40 rounded font-mono text-amber-400 focus:outline-none"
          placeholder="e.g. 5000"
        />
      </div>
    ) : (
      <div
        className={cn("flex items-center justify-between", isAdmin ? "cursor-pointer group" : "")}
        onClick={isAdmin ? handleStorePriceEdit : undefined}
      >
        {d?.store_price != null ? (
          <p className="text-sm font-mono text-zinc-300">{d.store_price.toLocaleString()}g</p>
        ) : (
          <p className="text-xs text-zinc-700">—</p>
        )}
        {isAdmin && (
          <span className="text-[10px] text-zinc-700 group-hover:text-zinc-400 transition-colors">edit</span>
        )}
      </div>
    )}
  </div>
)}
```

Make sure `useState` is imported (it likely already is, but `"use client"` must be at the top).
Add `import { useState } from "react";` if not present.

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Fix any errors. Common ones: `eff.duration_ms` may need `(eff as any).duration_ms` until types propagate — prefer fixing the import to use the updated `ItemEffect`.

- [ ] **Step 8: Commit**

```bash
git add app/(dashboard)/dashboard/market/components/DetailPanel.tsx
git commit -m "feat: DetailPanel — zones-based where-to-find, effect duration, merchant store price with admin edit"
```

---

## Task 12: Update FilterBar — tradeable toggle

**Files:**
- Modify: `app/(dashboard)/dashboard/market/components/FilterBar.tsx`

- [ ] **Step 1: Add tradeable toggle to the top of the filter panel**

After the `<div className="bg-zinc-950/80 ...">` opening tag, before `{/* Rarity */}`, add:

```tsx
{/* Tradeable */}
<div className="flex items-center gap-2">
  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Show</p>
  <div className="flex rounded-md border border-zinc-800 overflow-hidden">
    {(["tradable", "all"] as const).map((opt) => (
      <button
        key={opt}
        onClick={() => setFilters((p) => ({ ...p, tradeable: opt }))}
        className={cn(
          "px-3 py-1 text-[11px] font-mono transition-colors",
          filters.tradeable === opt
            ? "bg-amber-400/10 text-amber-400"
            : "text-zinc-600 hover:text-zinc-300"
        )}
      >
        {opt === "tradable" ? "Tradable" : "All"}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/dashboard/market/components/FilterBar.tsx
git commit -m "feat: add tradeable filter toggle to FilterBar"
```

---

## Task 13: Update ItemCard — store price display for Merchants tab

**Files:**
- Modify: `app/(dashboard)/dashboard/market/components/ItemCard.tsx`

- [ ] **Step 1: Add store_price prop and display**

Update `DbItem` is already extended with `store_price` via `FullItem`, but `DbItem` itself doesn't have it. For the card, we need `store_price` passed separately since `DbItem` list items carry it from the API response.

Actually — `store_price` is on `FullItem` (detail), not `DbItem` (list). The ItemCard receives a `DbItem`. For the Merchants tab, the card should show `store_price`, but it isn't in the list response.

**Resolution:** Add `store_price` to `DbItem` in `types.ts` and include it in the list API response. Update Task 4's `DbItem` interface to include it, and Task 5's API mapper to return it.

Go back and add `store_price: number | null` to `DbItem` in `types.ts`:
```typescript
export interface DbItem {
  // ... existing ...
  recipe_skill: string | null;
  store_price:  number | null;  // add this
}
```

And in `app/api/market/route.ts`, add `storePrice: items.storePrice` to the select and `store_price: r.storePrice ?? null` to the response mapper.

- [ ] **Step 2: Update ItemCard to accept showStorePrice prop and display it**

Add `showStorePrice?: boolean` to `ItemCardProps`:

```typescript
interface ItemCardProps {
  item:           DbItem;
  selected:       boolean;
  onClick:        () => void;
  showStorePrice?: boolean;
}
```

In the prices row, after the `last_sold_price` display, add:

```tsx
{showStorePrice && item.store_price != null && (
  <div className="flex items-center gap-1 text-[10px] text-zinc-400">
    <span className="font-mono">🏪</span>
    <span>{item.store_price.toLocaleString()}g</span>
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/market/components/ItemCard.tsx app/(dashboard)/dashboard/market/types.ts app/api/market/route.ts
git commit -m "feat: add store_price to DbItem and list API, show it on ItemCard in Merchants tab"
```

---

## Task 14: Update MarketBrowser — wire everything together

**Files:**
- Modify: `app/(dashboard)/dashboard/market/MarketBrowser.tsx`

- [ ] **Step 1: Import new dependencies**

Add to the top imports:
```typescript
import { useSession } from "@/lib/auth-client";
import { RESOURCE_CATEGORIES, MERCHANT_TYPE_LABELS } from "@/lib/market-config";
import type { ZoneResult } from "./types";
```

- [ ] **Step 2: Get isAdmin and add recipeSubTab state**

After the `useMarketItems()` call:
```typescript
const { data: session } = useSession();
const isAdmin = session?.user?.role === "admin";

const [recipeSubTab, setRecipeSubTab] = useState<"Alchemy" | "Forge">("Alchemy");
```

- [ ] **Step 3: Destructure new values from useItemDetail**

Update the `useItemDetail()` destructure to include:
```typescript
const {
  // ... existing ...
  itemZones,
  craftedByZones,
  handleStorePriceSave,
} = useItemDetail();
```

Add `handleStorePriceSave` to `useItemDetail` (returns a callback that calls the PATCH endpoint and refreshes the selected item's store price). Add this to the hook's implementation:

In `useItemDetail.ts`, add:
```typescript
const handleStorePriceSave = useCallback(async (price: number | null) => {
  if (!selectedItem) return;
  await fetch(`/api/admin/items/${selectedItem.hashed_id}/store-price`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ store_price: price }),
  });
  // Refresh the detail so the panel shows the new price
  if (itemDetail && itemDetail !== "loading") {
    setItemDetail({ ...itemDetail, store_price: price });
  }
}, [selectedItem, itemDetail]);
```

And add it to the return type and return object.

- [ ] **Step 4: Apply tradeable filter in filteredItems**

In the `filteredItems` computation, add after the existing filters:
```typescript
if (filters.tradeable === "tradable" && item.is_tradeable === false) return false;
```

- [ ] **Step 5: Update activeFilterCount to include tradeable**

```typescript
const activeFilterCount = [
  filters.tradeable !== "tradable",   // "all" is a non-default filter
  filters.rarities.size > 0,
  filters.types.size > 0,
  filters.vendorMin !== "" || filters.vendorMax !== "",
  filters.marketMin !== "" || filters.marketMax !== "",
].filter(Boolean).length;
```

- [ ] **Step 6: Filter Recipes by sub-tab**

In `filteredItems`, add:
```typescript
if (activeTab === "recipes" && item.recipe_skill && item.recipe_skill !== recipeSubTab) return false;
```

- [ ] **Step 7: Add Recipes sub-tab toggle UI**

In the JSX, after the date range pills block and before the filter panel, add:
```tsx
{/* Recipe sub-tabs — only on Recipes tab */}
{activeTab === "recipes" && (
  <div className="flex gap-2">
    {(["Alchemy", "Forge"] as const).map((skill) => (
      <button
        key={skill}
        onClick={() => setRecipeSubTab(skill)}
        className={cn(
          "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
          recipeSubTab === skill
            ? "bg-amber-400/10 border-amber-400/30 text-amber-400"
            : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
        )}
      >
        {skill === "Alchemy" ? "Brewing" : "Forging"}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 8: Replace category-tab grouping logic for Resources and Merchants**

In the existing category-tabs rendering block (the `isAllTab || isRecentlyAddedTab` ternary else branch), before the current quality-grouping code, add special handling:

```tsx
) : activeTab === "resources" ? (
  // Resources: group by category
  <div className="space-y-8">
    {RESOURCE_CATEGORIES.map(({ label, types }) => {
      const catItems = filteredItems.filter((i) => types.includes(i.type));
      if (catItems.length === 0) return null;
      const sorted = [...catItems].sort((a, b) => a.name.localeCompare(b.name));
      return (
        <div key={label}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{label}</span>
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] text-zinc-700 font-mono">{catItems.length}</span>
          </div>
          <div className={gridClass}>
            {sorted.map((item) => (
              <ItemCard
                key={item.hashed_id}
                item={item}
                selected={selectedItem?.hashed_id === item.hashed_id}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        </div>
      );
    })}
  </div>
) : activeTab === "merchants" ? (
  // Merchants: group by item type
  <div className="space-y-8">
    {Object.entries(MERCHANT_TYPE_LABELS).map(([type, label]) => {
      const typeItems = filteredItems.filter((i) => i.type === type);
      if (typeItems.length === 0) return null;
      const sorted = [...typeItems].sort((a, b) => a.name.localeCompare(b.name));
      return (
        <div key={type}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{label}</span>
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] text-zinc-700 font-mono">{typeItems.length}</span>
          </div>
          <div className={gridClass}>
            {sorted.map((item) => (
              <ItemCard
                key={item.hashed_id}
                item={item}
                selected={selectedItem?.hashed_id === item.hashed_id}
                onClick={() => handleItemClick(item)}
                showStorePrice
              />
            ))}
          </div>
        </div>
      );
    })}
  </div>
) : (
  // All other category tabs: existing quality grouping (unchanged)
  <div className="space-y-8">
    {/* ... existing QUALITY_ORDER grouping code ... */}
  </div>
```

Note: define `gridClass` before the ternary so it's available to all branches:
```typescript
const gridClass = cn(
  "grid gap-3",
  selectedItem
    ? "grid-cols-[repeat(auto-fill,minmax(110px,1fr))]"
    : "grid-cols-[repeat(auto-fill,minmax(130px,1fr))]"
);
```

Move `gridClass` out of the quality-grouping block into the outer scope (currently it's defined inside the `.map`).

- [ ] **Step 9: Pass new props to DetailPanel**

Update the `<DetailPanel>` call:
```tsx
<DetailPanel
  item={selectedItem}
  detail={itemDetail}
  selectedTier={selectedTier}
  tierMarketPrice={tierMarketPrice}
  materialPrices={materialPrices}
  craftedByDetail={craftedByDetail}
  craftedByItemData={craftedByItemData}
  resultItemData={resultItemData}
  itemZones={itemZones}
  craftedByZones={craftedByZones}
  activeTab={activeTab}
  isAdmin={isAdmin}
  onClose={clearSelection}
  onTierChange={handleTierChange}
  onStorePriceSave={handleStorePriceSave}
/>
```

- [ ] **Step 10: Verify TypeScript**

```bash
npx tsc --noEmit
```

Fix all type errors. Pay attention to:
- `gridClass` moved to outer scope
- `recipeSubTab` reset when switching tabs (add `setRecipeSubTab("Alchemy")` to the tab switch callback)
- `handleStorePriceSave` added to `useItemDetail` return

- [ ] **Step 11: Manual smoke test**

Start the dev server and verify:
1. Tradable filter toggle appears and works (hides items with `is_tradeable === false`)
2. Resources tab shows category sections instead of quality sections
3. Merchants tab shows type-grouped sections with "edit" affordance visible when admin
4. Recipes tab shows Brewing/Forging toggle, each showing only matching recipes
5. Legacy tab shows GEMSTONE items (CAMPAIGN_ITEM year items will appear after zones data is added)
6. DetailPanel shows zones (empty until zones are populated in DB) — verify no crash

- [ ] **Step 12: Commit**

```bash
git add app/(dashboard)/dashboard/market/MarketBrowser.tsx app/(dashboard)/dashboard/market/hooks/useItemDetail.ts
git commit -m "feat: MarketBrowser — tradeable filter, resource categories, merchant type grouping, recipes sub-tabs, admin store price"
```

---

## Task 15: Update docs/game-mechanics/item-types.md

**Files:**
- Modify: `docs/game-mechanics/item-types.md`

- [ ] **Step 1: Update the Market Browser Tab Assignments table**

Update the relevant rows in the table:

```markdown
| **Resources** | `CONSTRUCTION_MATERIAL`, `CRAFTING_MATERIAL`, `FISH`, `FOOD`, `CAKE`, `GUIDANCE_SCROLL`, `LOG`, `MEMBERSHIP`, `METAL_BAR`, `ORE`, `PET_EGG`, `RELIC`, `TELEPORTATION_STONE`, `TOKEN`, `UPGRADE_STONE`, `CHEST` |
```
_(Remove `CAMPAIGN_ITEM`)_

```markdown
| **Alchemy** | `POTION`, `ESSENCE_CRYSTAL` |
```
_(Add `ESSENCE_CRYSTAL`)_

```markdown
| **Merchants** | `BAIT`, `BLANK_SCROLL`, `EMPTY_CRYSTAL`, `METAMORPHITE`, `NAMESTONE`, `SKIN`, `VIAL` |
```
_(Remove `ESSENCE_CRYSTAL`)_

```markdown
| **Legacy** | `GEMSTONE` — plus any `CAMPAIGN_ITEM` whose name contains a 4-digit year (e.g. `Festival 2024`), routed via API-level regex. |
```

Add a note below the table:
```markdown
> **Event items in Resources:** `CAMPAIGN_ITEM` entries whose name contains a 4-digit year (e.g. `"Spring Festival 2024"`) are automatically excluded from Resources and included in Legacy at the API level via the regex `\d{4}`. No DB column is needed — future years are handled automatically.
```

- [ ] **Step 2: Commit**

```bash
git add docs/game-mechanics/item-types.md
git commit -m "docs: update item-types.md tab assignments — ESSENCE_CRYSTAL to Alchemy, CAMPAIGN_ITEM year routing to Legacy"
```

---

## Self-Review

**Spec coverage check:**
- §1a zones table → Task 1+2 ✓
- §1b remove whereToFind → Task 1+6+9 ✓
- §1c storePrice → Task 1+6+8+11+12+13 ✓
- §1d ItemEffect duration → Task 1+9+11 ✓
- §1e zones endpoint → Task 7 ✓
- §1f admin store-price endpoint → Task 8 ✓
- §2 tradeable filter → Task 4+12+14 ✓
- §3a event items → Legacy → Task 5+15 ✓
- §3b resource categories → Task 3+14 ✓
- §3c where to gather → Task 7+10+11 ✓
- §4 alchemy tab + ESSENCE_CRYSTAL → Task 3+11 ✓
- §5 collectibles zones → Task 7+10+11 ✓
- §6a merchants composition → Task 3 ✓
- §6b merchants type grouping → Task 3+14 ✓
- §6c store price display → Task 11+12+13 ✓
- §6d admin edit → Task 8+11+14 ✓
- §7 recipes sub-tabs → Task 4+5+14 ✓
- §8 legacy tab → Task 5 ✓
- §9 docs update → Task 15 ✓

**Gap identified:** `store_price` must be added to `DbItem` (not just `FullItem`) for ItemCard to use it. This is addressed in Task 13 Step 1 — ensure Task 4 is updated accordingly when implementing.

**Type consistency:** `ZoneResult` defined in `types.ts` (Task 4), used in `zones/route.ts` (Task 7), `useItemDetail` (Task 10), and `DetailPanel` (Task 11). All imports reference `../types` or `@/app/(dashboard)/dashboard/market/types`. ✓

`handleStorePriceSave` defined in `useItemDetail` (Task 14 Step 3) and consumed by `MarketBrowser` → `DetailPanel`. Make sure the hook returns it.
