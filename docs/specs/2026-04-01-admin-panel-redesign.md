# Admin Panel Redesign

**Date:** 2026-04-01  
**Status:** Approved — ready for implementation

---

## Overview

Restructure the existing admin page from a single sync-oriented UI into a multi-section data management panel. Each section provides a paginated, filterable table with edit capabilities and inline sync controls where relevant.

---

## Navigation Structure

The admin sidebar expands into three collapsible groups, following the existing `Characters ›` pattern:

```
Economy
  └── Items

World
  └── Dungeons
  └── Zones
  └── World Bosses  (placeholder — "Coming soon")
  └── Enemies       (placeholder — "Coming soon")

Users
  └── Users + Characters
```

Routes live under the existing admin path:
- `/dashboard/admin/economy/items`
- `/dashboard/admin/world/dungeons`
- `/dashboard/admin/world/zones`
- `/dashboard/admin/users`

The current `/dashboard/admin` root page becomes a redirect to `/dashboard/admin/economy/items`.

---

## Architecture

**Approach:** Separate Next.js pages per section + shared `AdminTable` component.

- Each section is its own page file under `app/(dashboard)/dashboard/admin/`
- A shared `AdminTable` component handles pagination, filters, and row actions
- API routes per section under `app/api/admin/`
- Business logic lives in `lib/services/admin/`
- All routes require `session.user.role === 'admin'`

### Shared `AdminTable` component

Accepts: column definitions, API endpoint, filter config, row action renderers. Handles client-side pagination state, debounced search, and filter params sent as query strings to the API.

---

## Database Changes

### New table: `zones`

```
id          serial PK
name        text NOT NULL
level_min   integer NOT NULL
level_max   integer NOT NULL
created_at  timestamp NOT NULL DEFAULT now()
updated_at  timestamp NOT NULL DEFAULT now()
```

### New table: `enemies`

```
id          serial PK
name        text NOT NULL
level       integer NOT NULL
zone_id     integer FK → zones.id (nullable — enemy may be unassigned)
image_url   text
loot        jsonb           -- array of { item_hashed_id, chance }
synced_at   timestamp
```

### New table: `world_bosses`

```
id          serial PK
name        text NOT NULL
level       integer NOT NULL
zone_id     integer FK → zones.id (nullable)
image_url   text
loot        jsonb
synced_at   timestamp
```

### New table: `zone_resources`  (junction)

```
zone_id         integer FK → zones.id  \
item_hashed_id  text FK → items.hashed_id  / composite PK
```

Dungeons are linked to zones via a new nullable `zone_id` FK added to the existing `dungeons` table.

### Migration required

Generate with `drizzle-kit generate --name="add_zones_enemies_world_bosses"`.

---

## Section Specs

### Economy → Items

**Purpose:** Browse and manage the item catalog. Move all sync controls here.

**Table columns:** Name, Type, Quality, Zones (derived), Last synced  
**Filters:** Name search, Type (dropdown of 42 types), Quality (dropdown)  
**Pagination:** 50 rows/page, offset-based  
**Sync controls (top-right):** Sync All Items · Sync Stats · Sync Prices · Sync Recipes — each triggers the existing API routes with the live log drawer (preserved from current page)

**Edit action:**  
Opens a slide-over/modal with read-only fields: hashed_id, type, quality, vendor_price, base_stats, effects, and a derived "Found in zones" display (see below). No item fields are directly editable from this panel — zone associations are managed from the Zones section.

**Zone cross-reference logic:**  
`where_to_find` contains enemy names, dungeon names, and world boss names. The display joins these against the `enemies`, `world_bosses`, and `dungeons` tables (which carry `zone_id`) to show "found in: Bluebell Hollow, Whispering Woods". This is a read-only derived query — no write path.

---

### World → Dungeons

**Purpose:** View synced dungeon catalog. Sync trigger lives here.

**Table columns:** Name, Location, Level required, Difficulty, Duration, Zone  
**Filters:** Name search, Min level  
**Pagination:** 25 rows/page  
**Sync control:** Sync Dungeons button (top-right) with live log drawer

**View action:** Opens a read-only detail panel showing full dungeon data (loot table, gold, shards). No editing — data is authoritative from IdleMMO API.

---

### World → Zones

**Purpose:** Full CRUD for the game's combat zones.

**Table columns:** Name, Level range, Enemies (count), World Bosses (count), Dungeons (count), Resources (count)  
**Filters:** Name search  
**Pagination:** 25 rows/page  
**Actions:** New Zone button (top-right), Edit, Delete (with confirmation)

**Edit / Create form** (inline panel or modal, two-column layout):

*Left column — zone info:*
- Name (text input)
- Min level / Max level (number inputs)
- Save / Cancel

*Right column — associated entities (4 panels):*
- **Enemies** — list of linked enemies with remove (✕); searchable add dropdown pulls from `enemies` table
- **World Bosses** — same pattern, pulls from `world_bosses` table
- **Dungeons** — same pattern, pulls from `dungeons` table
- **Resources** — same pattern, pulls item names from `items` table (any type)

Associations are stored as:
- Enemies / World Bosses / Dungeons: `zone_id` FK on the respective table
- Resources: rows in `zone_resources` junction table

**Delete:** Removes the zone row. Sets `zone_id` to null on linked enemies, world bosses, dungeons. Removes rows from `zone_resources`.

---

### Users → Users + Characters

**Purpose:** User account management. Characters are read-only data; only user credentials are editable.

**Table columns:** Username (with expand toggle), Email, Role, Character count  
**Filters:** Email/username search, Role (admin / user)  
**Pagination:** 25 rows/page

**Expandable rows:**  
Clicking a user row reveals a sub-table of their characters:

| Name | Class | Hashed ID | Action |
|---|---|---|---|
| WarriorX | Knight | a1b2c3d4 | Remove |

Remove deletes the character row from the local DB (does not touch IdleMMO). This is a cleanup tool — use when a character was renamed in IdleMMO and the stale record needs clearing so the user can re-sync fresh.

**Edit action (user row):** Opens a modal with email field and new-password field (hashed server-side via better-auth). No other user fields are editable.

**Delete action (user row):** Deletes the user and all associated characters (cascade already defined in schema). Requires confirmation dialog.

---

## API Routes

All routes: `GET`/`PATCH`/`POST`/`DELETE` under `app/api/admin/`, admin session required.

| Route | Methods | Purpose |
|---|---|---|
| `/api/admin/items` | GET | Paginated items list with filters |
| `/api/admin/dungeons` | GET | Paginated dungeons list with filters |
| `/api/admin/zones` | GET, POST | List zones / create zone |
| `/api/admin/zones/[id]` | GET, PATCH, DELETE | Get / update / delete zone |
| `/api/admin/zones/[id]/enemies` | POST, DELETE | Add / remove enemy association |
| `/api/admin/zones/[id]/world-bosses` | POST, DELETE | Add / remove world boss association |
| `/api/admin/zones/[id]/dungeons` | POST, DELETE | Add / remove dungeon association |
| `/api/admin/zones/[id]/resources` | POST, DELETE | Add / remove resource association |
| `/api/admin/enemies` | GET | List enemies (for zone association picker) |
| `/api/admin/world-bosses` | GET | List world bosses (for zone association picker) |
| `/api/admin/users` | GET | Paginated users with character counts |
| `/api/admin/users/[id]` | PATCH, DELETE | Edit credentials / delete user |
| `/api/admin/users/[id]/characters/[charId]` | DELETE | Dissociate (remove) a character |

Existing sync routes (`sync-items`, `sync-prices`, `sync-inspect`, `sync-recipes`, `sync-dungeons`) are unchanged — Items and Dungeons pages call them as before.

---

## Service Layer

New modules under `lib/services/admin/`:

- `items.service.ts` — paginated query with filters
- `dungeons.service.ts` — paginated query with filters
- `zones.service.ts` — CRUD + association management
- `users.service.ts` — paginated query, credential update (delegates password hashing to better-auth), delete, character dissociation

---

## Out of Scope

- World Bosses and Enemies admin pages (nav placeholders only, "Coming soon" state)
- Syncing enemies or world bosses from the IdleMMO API (tables are created but populated manually or in a future task)
- Any character stat editing
- Market or investment management (separate existing sections)
