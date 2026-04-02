# Admin Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the admin page into a multi-section panel with Economy (Items), World (Dungeons, Zones + placeholders), and Users sections, each with paginated tables, filters, inline sync controls, and edit capabilities.

**Architecture:** Separate Next.js pages per section share a generic `AdminTable` component and a `SyncLog` component extracted from the current admin page. A new `AdminNav` sidebar component replaces the current single "Admin" link. All business logic lives in `lib/services/admin/`. API routes under `app/api/admin/` handle data access; existing sync routes are unchanged.

**Tech Stack:** Next.js App Router, Drizzle ORM (Neon/postgres), better-auth v1.5.5, shadcn/ui (Button, Card, Dialog, Input), TypeScript, Tailwind CSS.

**Spec:** `docs/specs/2026-04-01-admin-panel-redesign.md`

---

## File Map

**New files:**
- `lib/db/schema.ts` — add `zones`, `enemies`, `worldBosses`, `zoneResources` tables; add `zoneId` FK to `dungeons`
- `lib/db/migrations/0011_add_zones_enemies_world_bosses.sql` — generated migration
- `lib/auth.ts` — add `admin()` plugin for `setUserPassword`
- `lib/services/admin/items.service.ts` — paginated items query
- `lib/services/admin/dungeons.service.ts` — paginated dungeons query
- `lib/services/admin/zones.service.ts` — full CRUD + associations
- `lib/services/admin/users.service.ts` — users+chars query, delete, dissociate
- `components/admin/AdminTable.tsx` — generic paginated table with filters
- `components/admin/SyncLog.tsx` — log display (extracted from current admin page)
- `components/admin-nav.tsx` — sidebar nav with Economy/World/Users groups
- `app/(dashboard)/dashboard/admin/page.tsx` — replace with redirect
- `app/(dashboard)/dashboard/admin/economy/items/page.tsx` — Items section
- `app/(dashboard)/dashboard/admin/world/dungeons/page.tsx` — Dungeons section
- `app/(dashboard)/dashboard/admin/world/zones/page.tsx` — Zones section
- `app/(dashboard)/dashboard/admin/world/world-bosses/page.tsx` — placeholder
- `app/(dashboard)/dashboard/admin/world/enemies/page.tsx` — placeholder
- `app/(dashboard)/dashboard/admin/users/page.tsx` — Users section
- `app/api/admin/items/route.ts`
- `app/api/admin/dungeons/route.ts`
- `app/api/admin/zones/route.ts`
- `app/api/admin/zones/[id]/route.ts`
- `app/api/admin/zones/[id]/enemies/route.ts`
- `app/api/admin/zones/[id]/world-bosses/route.ts`
- `app/api/admin/zones/[id]/dungeons/route.ts`
- `app/api/admin/zones/[id]/resources/route.ts`
- `app/api/admin/enemies/route.ts`
- `app/api/admin/world-bosses/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/users/[id]/route.ts`
- `app/api/admin/users/[id]/characters/[charId]/route.ts`

**Modified files:**
- `app/(dashboard)/layout.tsx` — swap Admin link for `<AdminNav />`

---

## Task 1: Add new tables to schema.ts

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add `primaryKey` to the drizzle import**

Open `lib/db/schema.ts`. Change line 2:

```typescript
import { pgTable, text, boolean, timestamp, jsonb, integer, uniqueIndex, serial, numeric, primaryKey } from "drizzle-orm/pg-core";
```

- [ ] **Step 2: Append the four new table exports at the end of the file**

```typescript
// ─── Zones ────────────────────────────────────────────────────────────────────

export const zones = pgTable("zones", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull(),
  levelMin:  integer("level_min").notNull(),
  levelMax:  integer("level_max").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const enemies = pgTable("enemies", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull(),
  level:     integer("level").notNull(),
  zoneId:    integer("zone_id").references(() => zones.id, { onDelete: "set null" }),
  imageUrl:  text("image_url"),
  loot:      jsonb("loot").$type<Array<{ item_hashed_id: string; chance: number }>>(),
  syncedAt:  timestamp("synced_at"),
});

export const worldBosses = pgTable("world_bosses", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull(),
  level:     integer("level").notNull(),
  zoneId:    integer("zone_id").references(() => zones.id, { onDelete: "set null" }),
  imageUrl:  text("image_url"),
  loot:      jsonb("loot").$type<Array<{ item_hashed_id: string; chance: number }>>(),
  syncedAt:  timestamp("synced_at"),
});

export const zoneResources = pgTable(
  "zone_resources",
  {
    zoneId:        integer("zone_id").notNull().references(() => zones.id, { onDelete: "cascade" }),
    itemHashedId:  text("item_hashed_id").notNull().references(() => items.hashedId, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.zoneId, t.itemHashedId] })]
);
```

- [ ] **Step 3: Add `zoneId` FK to the `dungeons` table**

In the `dungeons` pgTable definition (around line 350), add after `syncedAt`:

```typescript
  zoneId:   integer("zone_id").references(() => zones.id, { onDelete: "set null" }),
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors related to the new tables.

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add zones, enemies, world_bosses, zone_resources schema tables"
```

---

## Task 2: Generate the database migration

**Files:**
- Create: `lib/db/migrations/0011_add_zones_enemies_world_bosses.sql`

- [ ] **Step 1: Create a worktree if one doesn't already exist**

```bash
git worktree add ../immo_web_suite-admin-panel -b feat/admin-panel
cd ../immo_web_suite-admin-panel
```

All subsequent steps run from inside `../immo_web_suite-admin-panel/`.

- [ ] **Step 2: Symlink node_modules and copy env**

```bash
ln -s ../immo_web_suite/node_modules ./node_modules
cp ../immo_web_suite/.env.local .env.local
```

- [ ] **Step 3: Generate the migration**

```bash
node_modules/.bin/drizzle-kit generate --name="add_zones_enemies_world_bosses"
```

Expected: creates `lib/db/migrations/0011_add_zones_enemies_world_bosses.sql`.

- [ ] **Step 4: Review the generated SQL**

Open the file and verify it contains:
- `CREATE TABLE "zones"` with id, name, level_min, level_max, created_at, updated_at
- `CREATE TABLE "enemies"` with zone_id FK
- `CREATE TABLE "world_bosses"` with zone_id FK
- `CREATE TABLE "zone_resources"` with composite PK
- `ALTER TABLE "dungeons" ADD COLUMN "zone_id"` FK

- [ ] **Step 5: Clean up symlinks**

```bash
rm node_modules .env.local
```

- [ ] **Step 6: Commit**

```bash
git add lib/db/migrations/
git commit -m "feat: add migration for zones, enemies, world_bosses tables"
```

---

## Task 3: Add better-auth admin plugin

**Files:**
- Modify: `lib/auth.ts`

- [ ] **Step 1: Add the admin plugin import**

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username, admin } from "better-auth/plugins";
```

- [ ] **Step 2: Add `admin()` to the plugins array**

```typescript
  plugins: [username(), admin()],
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: enable better-auth admin plugin for setUserPassword"
```

---

## Task 4: Create the SyncLog component

**Files:**
- Create: `components/admin/SyncLog.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type LogEntry = {
  id: number;
  msg: string;
  kind: "info" | "success" | "error" | "cancel";
};

export function SyncLog({ logs }: { logs: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div
      ref={ref}
      className="mt-4 h-48 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs space-y-1"
    >
      {logs.map((e) => (
        <div
          key={e.id}
          className={cn(
            e.kind === "success" && "text-green-400",
            e.kind === "error"   && "text-red-400",
            e.kind === "cancel"  && "text-yellow-400",
            e.kind === "info"    && "text-muted-foreground"
          )}
        >
          {e.kind === "success" ? "✓" : e.kind === "error" ? "✗" : e.kind === "cancel" ? "⊘" : "→"} {e.msg}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/SyncLog.tsx
git commit -m "feat: add SyncLog display component"
```

---

## Task 5: Create the AdminTable component

**Files:**
- Create: `components/admin/AdminTable.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ColumnDef<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
};

export type FilterDef = {
  key: string;
  label: string;
  type: "search" | "select";
  options?: { value: string; label: string }[];
};

type AdminTableProps<T> = {
  columns: ColumnDef<T>[];
  endpoint: string;
  filters?: FilterDef[];
  renderActions?: (row: T) => React.ReactNode;
  renderExpanded?: (row: T, collapse: () => void) => React.ReactNode;
  expandedKey?: keyof T;          // which field is the unique row key for expand/collapse
  pageSize?: number;
  headerContent?: React.ReactNode;
  refreshKey?: number;            // increment to trigger a refetch
  emptyMessage?: string;
};

type ApiResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function AdminTable<T extends Record<string, unknown>>({
  columns,
  endpoint,
  filters = [],
  renderActions,
  renderExpanded,
  expandedKey,
  pageSize = 25,
  headerContent,
  refreshKey = 0,
  emptyMessage = "No results.",
}: AdminTableProps<T>) {
  const [page, setPage]               = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [data, setData]               = useState<T[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(total / pageSize);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...Object.fromEntries(Object.entries(filterValues).filter(([, v]) => v !== "")),
      });
      const res = await fetch(`${endpoint}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: ApiResponse<T> = await res.json();
      setData(json.data);
      setTotal(json.total);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize, filterValues, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [filterValues]);

  function toggleExpand(rowKey: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  }

  function setFilter(key: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-4">
      {/* Header: filters + headerContent */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) =>
          f.type === "search" ? (
            <Input
              key={f.key}
              placeholder={f.label}
              value={filterValues[f.key] ?? ""}
              onChange={(e) => setFilter(f.key, e.target.value)}
              className="h-8 w-48 text-sm"
            />
          ) : (
            <select
              key={f.key}
              value={filterValues[f.key] ?? ""}
              onChange={(e) => setFilter(f.key, e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            >
              <option value="">{f.label}</option>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )
        )}
        {headerContent && <div className="ml-auto flex items-center gap-2">{headerContent}</div>}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {expandedKey && <th className="w-8 px-3 py-2" />}
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {col.label}
                </th>
              ))}
              {renderActions && <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 2} className="px-3 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length + 2} className="px-3 py-8 text-center text-muted-foreground text-sm">{emptyMessage}</td></tr>
            ) : (
              data.map((row, i) => {
                const rowKey = expandedKey ? String(row[expandedKey]) : String(i);
                const isExpanded = expandedRows.has(rowKey);
                return (
                  <>
                    <tr
                      key={rowKey}
                      className={cn(
                        "border-t border-border/50 transition-colors",
                        expandedKey && "cursor-pointer hover:bg-muted/30",
                        isExpanded && "bg-muted/20"
                      )}
                      onClick={expandedKey ? () => toggleExpand(rowKey) : undefined}
                    >
                      {expandedKey && (
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">
                          {isExpanded ? "▼" : "▶"}
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} className="px-3 py-2.5">{col.render(row)}</td>
                      ))}
                      {renderActions && (
                        <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          {renderActions(row)}
                        </td>
                      )}
                    </tr>
                    {isExpanded && renderExpanded && (
                      <tr key={`${rowKey}-expanded`} className="border-t border-border/30 bg-muted/10">
                        <td colSpan={columns.length + 2} className="px-6 py-3">
                          {renderExpanded(row, () => toggleExpand(rowKey))}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="h-7 px-2 text-xs">
              ← Prev
            </Button>
            <span className="px-2">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="h-7 px-2 text-xs">
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminTable.tsx
git commit -m "feat: add generic AdminTable component with pagination and filters"
```

---

## Task 6: Create AdminNav sidebar component

**Files:**
- Create: `components/admin-nav.tsx`
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create `components/admin-nav.tsx`**

This follows the exact same pattern as `components/economy-nav.tsx`.

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, ChevronDown, ChevronRight, Package, Sword, Globe, Users, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

type SubGroup = {
  label: string;
  items: { href: string; label: string; icon: React.ElementType; disabled?: boolean }[];
};

const GROUPS: SubGroup[] = [
  {
    label: "Economy",
    items: [
      { href: "/dashboard/admin/economy/items", label: "Items", icon: Package },
    ],
  },
  {
    label: "World",
    items: [
      { href: "/dashboard/admin/world/dungeons",    label: "Dungeons",     icon: Sword },
      { href: "/dashboard/admin/world/zones",       label: "Zones",        icon: Globe },
      { href: "/dashboard/admin/world/world-bosses", label: "World Bosses", icon: Sword, disabled: true },
      { href: "/dashboard/admin/world/enemies",     label: "Enemies",      icon: Sword, disabled: true },
    ],
  },
  {
    label: "Users",
    items: [
      { href: "/dashboard/admin/users", label: "Users", icon: Users },
    ],
  },
];

const ALL_HREFS = GROUPS.flatMap((g) => g.items.map((i) => i.href));

export function AdminNav() {
  const pathname = usePathname();
  const isAdminPath = ALL_HREFS.some((h) => pathname.startsWith(h));
  const [open, setOpen] = useState(isAdminPath);

  useEffect(() => {
    if (isAdminPath) setOpen(true);
  }, [isAdminPath]);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer select-none mt-2",
          isAdminPath
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <ShieldCheck className="size-4 shrink-0" />
        <span className="flex-1">Admin</span>
        {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
      </div>

      {open && (
        <div className="ml-4 mt-0.5 flex flex-col gap-0 border-l border-border/50 pl-2">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <div className="px-2 pt-2 pb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/50 select-none">
                {group.label}
              </div>
              {group.items.map(({ href, label, icon: Icon, disabled }) =>
                disabled ? (
                  <div
                    key={href}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground/30 cursor-not-allowed select-none"
                    title="Coming soon"
                  >
                    <Lock className="size-3 shrink-0" />
                    {label}
                  </div>
                ) : (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                      pathname.startsWith(href)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {label}
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `app/(dashboard)/layout.tsx`**

Add the import at the top:
```typescript
import { AdminNav } from "@/components/admin-nav";
```

Replace the existing admin block (lines 81–94):
```typescript
          {isAdmin && <AdminNav />}
```

Remove the `ShieldCheck` import since it moved to `AdminNav`.

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Start the dev server and confirm the sidebar shows Economy / World / Users groups when logged in as admin**

```bash
npm run dev
```

Open http://localhost:3000/dashboard. Admin sidebar should show the new collapsible groups.

- [ ] **Step 5: Commit**

```bash
git add components/admin-nav.tsx app/(dashboard)/layout.tsx
git commit -m "feat: add AdminNav sidebar component with Economy/World/Users groups"
```

---

## Task 7: Admin root redirect + placeholder pages

**Files:**
- Modify: `app/(dashboard)/dashboard/admin/page.tsx` — redirect
- Create: `app/(dashboard)/dashboard/admin/world/world-bosses/page.tsx`
- Create: `app/(dashboard)/dashboard/admin/world/enemies/page.tsx`

- [ ] **Step 1: Replace `app/(dashboard)/dashboard/admin/page.tsx` with a redirect**

The current file is 500+ lines. Replace it entirely:

```typescript
import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/dashboard/admin/economy/items");
}
```

- [ ] **Step 2: Create world-bosses placeholder**

Create `app/(dashboard)/dashboard/admin/world/world-bosses/page.tsx`:

```typescript
export default function WorldBossesPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">World Bosses</h1>
      <p className="text-muted-foreground">Coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 3: Create enemies placeholder**

Create `app/(dashboard)/dashboard/admin/world/enemies/page.tsx`:

```typescript
export default function EnemiesPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">Enemies</h1>
      <p className="text-muted-foreground">Coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/dashboard/admin/page.tsx \
        app/(dashboard)/dashboard/admin/world/world-bosses/page.tsx \
        app/(dashboard)/dashboard/admin/world/enemies/page.tsx
git commit -m "feat: replace admin root with redirect; add placeholder pages"
```

---

## Task 8: Items service + API route

**Files:**
- Create: `lib/services/admin/items.service.ts`
- Create: `app/api/admin/items/route.ts`

- [ ] **Step 1: Create `lib/services/admin/items.service.ts`**

```typescript
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { ilike, eq, and, count, SQL } from "drizzle-orm";

export type AdminItemRow = {
  hashedId: string;
  name: string;
  type: string;
  quality: string | null;
  syncedAt: Date | null;
};

export async function getAdminItems(params: {
  page: number;
  pageSize: number;
  name?: string;
  type?: string;
  quality?: string;
}): Promise<{ data: AdminItemRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, name, type, quality } = params;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [];
  if (name)    conditions.push(ilike(items.name,    `%${name}%`));
  if (type)    conditions.push(eq(items.type,        type));
  if (quality) conditions.push(eq(items.quality,     quality));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totals] = await Promise.all([
    db
      .select({
        hashedId: items.hashedId,
        name:     items.name,
        type:     items.type,
        quality:  items.quality,
        syncedAt: items.syncedAt,
      })
      .from(items)
      .where(where)
      .orderBy(items.name)
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(items).where(where),
  ]);

  return { data, total: Number(totals[0].value), page, pageSize };
}
```

- [ ] **Step 2: Create `app/api/admin/items/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminItems } from "@/lib/services/admin/items.service";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 50)));
  const name     = searchParams.get("name")    ?? undefined;
  const type     = searchParams.get("type")    ?? undefined;
  const quality  = searchParams.get("quality") ?? undefined;

  const result = await getAdminItems({ page, pageSize, name, type, quality });
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Test the route**

With the dev server running, open:
`http://localhost:3000/api/admin/items?page=1&pageSize=5`

Expected: JSON `{ data: [...], total: N, page: 1, pageSize: 5 }` (requires admin session).

- [ ] **Step 5: Commit**

```bash
git add lib/services/admin/items.service.ts app/api/admin/items/route.ts
git commit -m "feat: add admin items service and GET /api/admin/items route"
```

---

## Task 9: Items page

**Files:**
- Create: `app/(dashboard)/dashboard/admin/economy/items/page.tsx`

The sync orchestration (items/prices/inspect/recipes) is moved here wholesale from the old `admin/page.tsx`. The live log uses `SyncLog`.

- [ ] **Step 1: Create the Items page**

The sync state, log state, and sync functions come from the existing `app/(dashboard)/dashboard/admin/page.tsx` (now replaced with a redirect). Copy the relevant logic from git history or recreate from the existing route implementations.

```typescript
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, TrendingUp, BookOpen } from "lucide-react";
import { AdminTable, type ColumnDef, type FilterDef } from "@/components/admin/AdminTable";
import { SyncLog, type LogEntry } from "@/components/admin/SyncLog";
import { MARKET_TABS } from "@/lib/market-config";
import { cn } from "@/lib/utils";

const ALL_TYPES = MARKET_TABS.flatMap((t) => t.types);

type ItemRow = {
  hashedId: string;
  name: string;
  type: string;
  quality: string | null;
  syncedAt: string | null;
};

const COLUMNS: ColumnDef<ItemRow>[] = [
  { key: "name",    label: "Name",    render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "type",    label: "Type",    render: (r) => <span className="text-muted-foreground text-xs">{r.type}</span> },
  { key: "quality", label: "Quality", render: (r) => <span className="text-xs">{r.quality ?? "—"}</span> },
  {
    key: "syncedAt",
    label: "Last Synced",
    render: (r) => (
      <span className="text-muted-foreground text-xs">
        {r.syncedAt ? new Date(r.syncedAt).toLocaleDateString() : "—"}
      </span>
    ),
  },
];

const FILTERS: FilterDef[] = [
  { key: "name",    label: "Search name…", type: "search" },
  {
    key: "type",
    label: "All types",
    type: "select",
    options: ALL_TYPES.map((t) => ({ value: t, label: t })),
  },
  {
    key: "quality",
    label: "All qualities",
    type: "select",
    options: ["Common", "Uncommon", "Rare", "Epic", "Legendary"].map((q) => ({ value: q, label: q })),
  },
];

let _logId = 0;

export default function ItemsPage() {
  const [busy, setBusy]         = useState(false);
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const cancelRef = useRef(false);

  function addLog(msg: string, kind: LogEntry["kind"] = "info") {
    setLogs((prev) => [...prev, { id: _logId++, msg, kind }]);
  }

  async function runPaginatedSync(
    label: string,
    buildUrl: (page: number) => string
  ) {
    let page = 1, totalPages = 1;
    while (page <= totalPages && !cancelRef.current) {
      const res = await fetch(buildUrl(page), { method: "POST" });
      if (res.status === 429) {
        const data = await res.json();
        const waitMs = data.retryAfterMs ?? 60_000;
        addLog(`Rate limit — waiting ${Math.ceil(waitMs / 1000)}s…`, "info");
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      if (!res.ok) { addLog(`${label} page ${page} failed`, "error"); break; }
      const data = await res.json();
      totalPages = data.totalPages ?? 1;
      addLog(`${label} page ${page}/${totalPages} — ${data.synced ?? data.populated ?? 0} synced`, "success");
      page++;
    }
  }

  async function syncAllItems() {
    setBusy(true); cancelRef.current = false; setLogs([]);
    addLog("Starting item sync…");
    try {
      for (const type of ALL_TYPES) {
        if (cancelRef.current) break;
        await runPaginatedSync(`Items:${type}`, (p) => `/api/admin/sync-items?type=${type}&page=${p}`);
      }
      addLog("Item sync complete", "success");
    } finally {
      setBusy(false);
      setRefreshKey((k) => k + 1);
    }
  }

  async function syncPrices() {
    setBusy(true); cancelRef.current = false; setLogs([]);
    addLog("Starting price sync…");
    try {
      for (const type of ALL_TYPES) {
        if (cancelRef.current) break;
        await runPaginatedSync(`Prices:${type}`, (p) => `/api/admin/sync-prices?type=${type}&page=${p}&pageSize=80`);
      }
      addLog("Price sync complete", "success");
    } finally {
      setBusy(false);
    }
  }

  async function syncStats() {
    setBusy(true); cancelRef.current = false; setLogs([]);
    addLog("Starting stats sync…");
    try {
      for (const type of ALL_TYPES) {
        if (cancelRef.current) break;
        await runPaginatedSync(`Stats:${type}`, (p) => `/api/admin/sync-inspect?type=${type}&page=${p}&pageSize=40`);
      }
      addLog("Stats sync complete", "success");
    } finally {
      setBusy(false);
    }
  }

  async function syncRecipes() {
    setBusy(true); cancelRef.current = false; setLogs([]);
    addLog("Starting recipe sync…");
    try {
      await runPaginatedSync("Recipes", (p) => `/api/admin/sync-recipes?page=${p}&pageSize=80`);
      addLog("Recipe sync complete", "success");
    } finally {
      setBusy(false);
    }
  }

  const headerContent = (
    <div className="flex items-center gap-2">
      {busy && (
        <Button variant="outline" size="sm" className="h-8" onClick={() => { cancelRef.current = true; }}>
          Cancel
        </Button>
      )}
      <Button variant="outline" size="sm" disabled={busy} className="h-8 gap-1.5" onClick={syncStats}>
        <Sparkles className="size-3.5" /> Sync Stats
      </Button>
      <Button variant="outline" size="sm" disabled={busy} className="h-8 gap-1.5" onClick={syncPrices}>
        <TrendingUp className="size-3.5" /> Sync Prices
      </Button>
      <Button variant="outline" size="sm" disabled={busy} className="h-8 gap-1.5" onClick={syncRecipes}>
        <BookOpen className="size-3.5" /> Sync Recipes
      </Button>
      <Button size="sm" disabled={busy} className="h-8 gap-1.5" onClick={syncAllItems}>
        <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
        Sync All Items
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Items</h1>
        <p className="text-muted-foreground text-sm">Item catalog and sync management.</p>
      </div>
      <AdminTable<ItemRow>
        columns={COLUMNS}
        endpoint="/api/admin/items"
        filters={FILTERS}
        pageSize={50}
        refreshKey={refreshKey}
        headerContent={headerContent}
        emptyMessage="No items found."
      />
      <SyncLog logs={logs} />
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Open in browser and confirm the table loads items, filters work, and sync buttons trigger the live log**

Navigate to `http://localhost:3000/dashboard/admin/economy/items`.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/admin/economy/items/page.tsx
git commit -m "feat: add Items admin page with paginated table and sync controls"
```

---

## Task 10: Dungeons service + API route

**Files:**
- Create: `lib/services/admin/dungeons.service.ts`
- Create: `app/api/admin/dungeons/route.ts`

- [ ] **Step 1: Create `lib/services/admin/dungeons.service.ts`**

```typescript
import { db } from "@/lib/db";
import { dungeons, zones } from "@/lib/db/schema";
import { ilike, gte, and, count, SQL } from "drizzle-orm";

export type AdminDungeonRow = {
  id: number;
  name: string;
  location: string | null;
  levelRequired: number;
  difficulty: number;
  zoneName: string | null;
  syncedAt: Date;
};

export async function getAdminDungeons(params: {
  page: number;
  pageSize: number;
  name?: string;
  minLevel?: number;
}): Promise<{ data: AdminDungeonRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, name, minLevel } = params;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [];
  if (name)     conditions.push(ilike(dungeons.name, `%${name}%`));
  if (minLevel) conditions.push(gte(dungeons.levelRequired, minLevel));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totals] = await Promise.all([
    db
      .select({
        id:            dungeons.id,
        name:          dungeons.name,
        location:      dungeons.location,
        levelRequired: dungeons.levelRequired,
        difficulty:    dungeons.difficulty,
        zoneName:      zones.name,
        syncedAt:      dungeons.syncedAt,
      })
      .from(dungeons)
      .leftJoin(zones, (t) => t.dungeons.zoneId === t.zones.id)
      .where(where)
      .orderBy(dungeons.levelRequired)
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(dungeons).where(where),
  ]);

  return { data, total: Number(totals[0].value), page, pageSize };
}
```

> **Note:** Drizzle left join syntax: `.leftJoin(zones, eq(dungeons.zoneId, zones.id))` — import `eq` from `drizzle-orm`.

- [ ] **Step 2: Fix the leftJoin syntax**

Replace the leftJoin line with:
```typescript
      .leftJoin(zones, eq(dungeons.zoneId, zones.id))
```
And add `eq` to the drizzle-orm import.

- [ ] **Step 3: Create `app/api/admin/dungeons/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminDungeons } from "@/lib/services/admin/dungeons.service";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 25)));
  const name     = searchParams.get("name")     ?? undefined;
  const minLevel = searchParams.get("minLevel") ? Number(searchParams.get("minLevel")) : undefined;

  const result = await getAdminDungeons({ page, pageSize, name, minLevel });
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/services/admin/dungeons.service.ts app/api/admin/dungeons/route.ts
git commit -m "feat: add admin dungeons service and GET /api/admin/dungeons route"
```

---

## Task 11: Dungeons page

**Files:**
- Create: `app/(dashboard)/dashboard/admin/world/dungeons/page.tsx`

- [ ] **Step 1: Create the Dungeons page**

```typescript
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skull } from "lucide-react";
import { AdminTable, type ColumnDef, type FilterDef } from "@/components/admin/AdminTable";
import { SyncLog, type LogEntry } from "@/components/admin/SyncLog";
import { cn } from "@/lib/utils";

type DungeonRow = {
  id: number;
  name: string;
  location: string | null;
  levelRequired: number;
  difficulty: number;
  zoneName: string | null;
  syncedAt: string;
};

const COLUMNS: ColumnDef<DungeonRow>[] = [
  { key: "name",          label: "Name",          render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "location",      label: "Location",      render: (r) => <span className="text-muted-foreground text-xs">{r.location ?? "—"}</span> },
  { key: "levelRequired", label: "Level req.",     render: (r) => <span className="text-xs">{r.levelRequired}</span> },
  { key: "difficulty",    label: "Difficulty",     render: (r) => <span className="text-xs">{r.difficulty}</span> },
  { key: "zoneName",      label: "Zone",           render: (r) => <span className="text-muted-foreground text-xs">{r.zoneName ?? "—"}</span> },
];

const FILTERS: FilterDef[] = [
  { key: "name",     label: "Search name…", type: "search" },
  { key: "minLevel", label: "Min level",    type: "search" },
];

let _logId = 0;

export default function DungeonsPage() {
  const [busy, setBusy]     = useState(false);
  const [logs, setLogs]     = useState<LogEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  function addLog(msg: string, kind: LogEntry["kind"] = "info") {
    setLogs((prev) => [...prev, { id: _logId++, msg, kind }]);
  }

  async function syncDungeons() {
    setBusy(true); setLogs([]);
    addLog("Syncing dungeons…");
    try {
      const res = await fetch("/api/admin/sync-dungeons", { method: "POST" });
      if (!res.ok) { addLog("Sync failed", "error"); return; }
      const data = await res.json();
      addLog(`Synced ${data.synced} dungeons`, "success");
      setRefreshKey((k) => k + 1);
    } catch {
      addLog("Sync error", "error");
    } finally {
      setBusy(false);
    }
  }

  const headerContent = (
    <Button size="sm" disabled={busy} className="h-8 gap-1.5" onClick={syncDungeons}>
      <Skull className={cn("size-3.5", busy && "animate-pulse")} />
      Sync Dungeons
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dungeons</h1>
        <p className="text-muted-foreground text-sm">Dungeon catalog synced from IdleMMO.</p>
      </div>
      <AdminTable<DungeonRow>
        columns={COLUMNS}
        endpoint="/api/admin/dungeons"
        filters={FILTERS}
        pageSize={25}
        refreshKey={refreshKey}
        headerContent={headerContent}
        emptyMessage="No dungeons found. Run Sync Dungeons to populate."
      />
      <SyncLog logs={logs} />
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Open and confirm dungeons table loads**

Navigate to `http://localhost:3000/dashboard/admin/world/dungeons`.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/admin/world/dungeons/page.tsx
git commit -m "feat: add Dungeons admin page"
```

---

## Task 12: Zones service

**Files:**
- Create: `lib/services/admin/zones.service.ts`

- [ ] **Step 1: Create `lib/services/admin/zones.service.ts`**

```typescript
import { db } from "@/lib/db";
import { zones, enemies, worldBosses, dungeons, zoneResources, items } from "@/lib/db/schema";
import { eq, count, ilike } from "drizzle-orm";

export type ZoneListRow = {
  id: number;
  name: string;
  levelMin: number;
  levelMax: number;
  enemyCount: number;
  worldBossCount: number;
  dungeonCount: number;
  resourceCount: number;
};

export type ZoneDetail = {
  id: number;
  name: string;
  levelMin: number;
  levelMax: number;
  enemies:     { id: number; name: string; level: number }[];
  worldBosses: { id: number; name: string; level: number }[];
  dungeons:    { id: number; name: string }[];
  resources:   { hashedId: string; name: string }[];
};

// ── List ──────────────────────────────────────────────────────────────────────

export async function getAdminZones(params: {
  page: number;
  pageSize: number;
  name?: string;
}): Promise<{ data: ZoneListRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, name } = params;
  const offset = (page - 1) * pageSize;
  const where  = name ? ilike(zones.name, `%${name}%`) : undefined;

  const [zoneList, totals, enemyCounts, bossCounts, dungeonCounts, resourceCounts] = await Promise.all([
    db.select({ id: zones.id, name: zones.name, levelMin: zones.levelMin, levelMax: zones.levelMax })
      .from(zones).where(where).orderBy(zones.levelMin).limit(pageSize).offset(offset),
    db.select({ value: count() }).from(zones).where(where),
    db.select({ zoneId: enemies.zoneId, value: count() }).from(enemies).groupBy(enemies.zoneId),
    db.select({ zoneId: worldBosses.zoneId, value: count() }).from(worldBosses).groupBy(worldBosses.zoneId),
    db.select({ zoneId: dungeons.zoneId, value: count() }).from(dungeons).where(eq(dungeons.zoneId, dungeons.zoneId)).groupBy(dungeons.zoneId),
    db.select({ zoneId: zoneResources.zoneId, value: count() }).from(zoneResources).groupBy(zoneResources.zoneId),
  ]);

  const toMap = (rows: { zoneId: number | null; value: unknown }[]) =>
    new Map(rows.filter((r) => r.zoneId != null).map((r) => [r.zoneId!, Number(r.value)]));

  const eMap = toMap(enemyCounts);
  const bMap = toMap(bossCounts);
  const dMap = toMap(dungeonCounts);
  const rMap = toMap(resourceCounts);

  const data: ZoneListRow[] = zoneList.map((z) => ({
    ...z,
    enemyCount:     eMap.get(z.id) ?? 0,
    worldBossCount: bMap.get(z.id) ?? 0,
    dungeonCount:   dMap.get(z.id) ?? 0,
    resourceCount:  rMap.get(z.id) ?? 0,
  }));

  return { data, total: Number(totals[0].value), page, pageSize };
}

// ── Detail ────────────────────────────────────────────────────────────────────

export async function getZoneDetail(id: number): Promise<ZoneDetail | null> {
  const [zone] = await db.select().from(zones).where(eq(zones.id, id));
  if (!zone) return null;

  const [zoneEnemies, zoneBosses, zoneDungeons, zoneRes] = await Promise.all([
    db.select({ id: enemies.id, name: enemies.name, level: enemies.level })
      .from(enemies).where(eq(enemies.zoneId, id)),
    db.select({ id: worldBosses.id, name: worldBosses.name, level: worldBosses.level })
      .from(worldBosses).where(eq(worldBosses.zoneId, id)),
    db.select({ id: dungeons.id, name: dungeons.name })
      .from(dungeons).where(eq(dungeons.zoneId, id)),
    db.select({ hashedId: items.hashedId, name: items.name })
      .from(zoneResources)
      .innerJoin(items, eq(zoneResources.itemHashedId, items.hashedId))
      .where(eq(zoneResources.zoneId, id)),
  ]);

  return {
    id: zone.id,
    name: zone.name,
    levelMin: zone.levelMin,
    levelMax: zone.levelMax,
    enemies:     zoneEnemies,
    worldBosses: zoneBosses,
    dungeons:    zoneDungeons,
    resources:   zoneRes,
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createZone(data: { name: string; levelMin: number; levelMax: number }) {
  const [zone] = await db.insert(zones).values(data).returning();
  return zone;
}

export async function updateZone(id: number, data: { name: string; levelMin: number; levelMax: number }) {
  const [zone] = await db.update(zones)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(zones.id, id))
    .returning();
  return zone;
}

export async function deleteZone(id: number) {
  await db.delete(zones).where(eq(zones.id, id));
}

// ── Association helpers ───────────────────────────────────────────────────────

export async function addEnemyToZone(zoneId: number, enemyId: number) {
  await db.update(enemies).set({ zoneId }).where(eq(enemies.id, enemyId));
}
export async function removeEnemyFromZone(enemyId: number) {
  await db.update(enemies).set({ zoneId: null }).where(eq(enemies.id, enemyId));
}

export async function addWorldBossToZone(zoneId: number, bossId: number) {
  await db.update(worldBosses).set({ zoneId }).where(eq(worldBosses.id, bossId));
}
export async function removeWorldBossFromZone(bossId: number) {
  await db.update(worldBosses).set({ zoneId: null }).where(eq(worldBosses.id, bossId));
}

export async function addDungeonToZone(zoneId: number, dungeonId: number) {
  await db.update(dungeons).set({ zoneId }).where(eq(dungeons.id, dungeonId));
}
export async function removeDungeonFromZone(dungeonId: number) {
  await db.update(dungeons).set({ zoneId: null }).where(eq(dungeons.id, dungeonId));
}

export async function addResourceToZone(zoneId: number, itemHashedId: string) {
  await db.insert(zoneResources).values({ zoneId, itemHashedId }).onConflictDoNothing();
}
export async function removeResourceFromZone(zoneId: number, itemHashedId: string) {
  await db.delete(zoneResources)
    .where(eq(zoneResources.zoneId, zoneId) && eq(zoneResources.itemHashedId, itemHashedId) as unknown as ReturnType<typeof eq>);
}
```

> **Note:** The `removeResourceFromZone` where clause needs Drizzle's `and()`. Replace with:
> ```typescript
> import { eq, and, count, ilike } from "drizzle-orm";
> // ...
> .where(and(eq(zoneResources.zoneId, zoneId), eq(zoneResources.itemHashedId, itemHashedId)));
> ```

- [ ] **Step 2: Fix removeResourceFromZone to use `and()`**

```typescript
export async function removeResourceFromZone(zoneId: number, itemHashedId: string) {
  await db.delete(zoneResources)
    .where(and(eq(zoneResources.zoneId, zoneId), eq(zoneResources.itemHashedId, itemHashedId)));
}
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/services/admin/zones.service.ts
git commit -m "feat: add zones service with CRUD and association helpers"
```

---

## Task 13: Zone API routes

**Files:**
- Create: `app/api/admin/zones/route.ts`
- Create: `app/api/admin/zones/[id]/route.ts`
- Create: `app/api/admin/zones/[id]/enemies/route.ts`
- Create: `app/api/admin/zones/[id]/world-bosses/route.ts`
- Create: `app/api/admin/zones/[id]/dungeons/route.ts`
- Create: `app/api/admin/zones/[id]/resources/route.ts`
- Create: `app/api/admin/enemies/route.ts`
- Create: `app/api/admin/world-bosses/route.ts`

- [ ] **Step 1: Create `app/api/admin/zones/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminZones, createZone } from "@/lib/services/admin/zones.service";

async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 25)));
  const name     = searchParams.get("name") ?? undefined;

  return NextResponse.json(await getAdminZones({ page, pageSize, name }));
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, levelMin, levelMax } = body;
  if (!name || levelMin == null || levelMax == null) {
    return NextResponse.json({ error: "name, levelMin, levelMax required" }, { status: 400 });
  }

  const zone = await createZone({ name, levelMin: Number(levelMin), levelMax: Number(levelMax) });
  return NextResponse.json(zone, { status: 201 });
}
```

- [ ] **Step 2: Create `app/api/admin/zones/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getZoneDetail, updateZone, deleteZone } from "@/lib/services/admin/zones.service";

async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.role === "admin" ? session : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const zone = await getZoneDetail(Number(id));
  if (!zone) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(zone);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { name, levelMin, levelMax } = await request.json();
  const zone = await updateZone(Number(id), { name, levelMin: Number(levelMin), levelMax: Number(levelMax) });
  return NextResponse.json(zone);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await deleteZone(Number(id));
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Create the four association routes**

`app/api/admin/zones/[id]/enemies/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addEnemyToZone, removeEnemyFromZone } from "@/lib/services/admin/zones.service";

async function requireAdmin(r: NextRequest) {
  const s = await auth.api.getSession({ headers: r.headers });
  return s?.user.role === "admin" ? s : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { enemyId } = await request.json();
  await addEnemyToZone(Number(id), Number(enemyId));
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { enemyId } = await request.json();
  await removeEnemyFromZone(Number(enemyId));
  return new NextResponse(null, { status: 204 });
}
```

`app/api/admin/zones/[id]/world-bosses/route.ts` — same pattern:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addWorldBossToZone, removeWorldBossFromZone } from "@/lib/services/admin/zones.service";

async function requireAdmin(r: NextRequest) {
  const s = await auth.api.getSession({ headers: r.headers });
  return s?.user.role === "admin" ? s : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { bossId } = await request.json();
  await addWorldBossToZone(Number(id), Number(bossId));
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { bossId } = await request.json();
  await removeWorldBossFromZone(Number(bossId));
  return new NextResponse(null, { status: 204 });
}
```

`app/api/admin/zones/[id]/dungeons/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addDungeonToZone, removeDungeonFromZone } from "@/lib/services/admin/zones.service";

async function requireAdmin(r: NextRequest) {
  const s = await auth.api.getSession({ headers: r.headers });
  return s?.user.role === "admin" ? s : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { dungeonId } = await request.json();
  await addDungeonToZone(Number(id), Number(dungeonId));
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { dungeonId } = await request.json();
  await removeDungeonFromZone(Number(dungeonId));
  return new NextResponse(null, { status: 204 });
}
```

`app/api/admin/zones/[id]/resources/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addResourceToZone, removeResourceFromZone } from "@/lib/services/admin/zones.service";

async function requireAdmin(r: NextRequest) {
  const s = await auth.api.getSession({ headers: r.headers });
  return s?.user.role === "admin" ? s : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { itemHashedId } = await request.json();
  await addResourceToZone(Number(id), itemHashedId);
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { itemHashedId } = await request.json();
  await removeResourceFromZone(Number(id), itemHashedId);
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 4: Create picker routes**

`app/api/admin/enemies/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enemies } from "@/lib/db/schema";
import { ilike, isNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const name = request.nextUrl.searchParams.get("name");
  const where = name ? ilike(enemies.name, `%${name}%`) : undefined;

  const data = await db
    .select({ id: enemies.id, name: enemies.name, level: enemies.level, zoneId: enemies.zoneId })
    .from(enemies)
    .where(where)
    .orderBy(enemies.name)
    .limit(50);

  return NextResponse.json({ data });
}
```

`app/api/admin/world-bosses/route.ts` — same pattern with `worldBosses` table:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { worldBosses } from "@/lib/db/schema";
import { ilike } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const name = request.nextUrl.searchParams.get("name");
  const where = name ? ilike(worldBosses.name, `%${name}%`) : undefined;

  const data = await db
    .select({ id: worldBosses.id, name: worldBosses.name, level: worldBosses.level, zoneId: worldBosses.zoneId })
    .from(worldBosses)
    .where(where)
    .orderBy(worldBosses.name)
    .limit(50);

  return NextResponse.json({ data });
}
```

- [ ] **Step 5: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/zones/ app/api/admin/enemies/ app/api/admin/world-bosses/
git commit -m "feat: add zone CRUD, association, and picker API routes"
```

---

## Task 14: Zones page

**Files:**
- Create: `app/(dashboard)/dashboard/admin/world/zones/page.tsx`

- [ ] **Step 1: Create the Zones page**

This page has a table listing zones and a Dialog-based edit/create form.

```typescript
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminTable, type ColumnDef, type FilterDef } from "@/components/admin/AdminTable";
import { Plus, X } from "lucide-react";

type ZoneRow = {
  id: number;
  name: string;
  levelMin: number;
  levelMax: number;
  enemyCount: number;
  worldBossCount: number;
  dungeonCount: number;
  resourceCount: number;
};

type AssocItem = { id?: number; hashedId?: string; name: string; level?: number };

type ZoneDetail = {
  id: number;
  name: string;
  levelMin: number;
  levelMax: number;
  enemies:     AssocItem[];
  worldBosses: AssocItem[];
  dungeons:    AssocItem[];
  resources:   AssocItem[];
};

const COLUMNS: ColumnDef<ZoneRow>[] = [
  { key: "name",     label: "Name",         render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "levels",   label: "Levels",       render: (r) => <span className="text-xs text-muted-foreground">{r.levelMin}–{r.levelMax}</span> },
  { key: "enemies",  label: "Enemies",      render: (r) => <span className="text-xs">{r.enemyCount}</span> },
  { key: "bosses",   label: "World Bosses", render: (r) => <span className="text-xs">{r.worldBossCount}</span> },
  { key: "dungeons", label: "Dungeons",     render: (r) => <span className="text-xs">{r.dungeonCount}</span> },
  { key: "resources",label: "Resources",    render: (r) => <span className="text-xs">{r.resourceCount}</span> },
];

const FILTERS: FilterDef[] = [
  { key: "name", label: "Search zone…", type: "search" },
];

export default function ZonesPage() {
  const [refreshKey, setRefreshKey]   = useState(0);
  const [editZone, setEditZone]       = useState<ZoneDetail | null>(null);
  const [isCreating, setIsCreating]   = useState(false);
  const [formName, setFormName]       = useState("");
  const [formLevelMin, setFormLevelMin] = useState("");
  const [formLevelMax, setFormLevelMax] = useState("");
  const [saving, setSaving]           = useState(false);

  // Picker state
  const [pickerSearch, setPickerSearch] = useState<Record<string, string>>({});
  const [pickerResults, setPickerResults] = useState<Record<string, AssocItem[]>>({});

  function openCreate() {
    setFormName(""); setFormLevelMin(""); setFormLevelMax("");
    setEditZone(null); setIsCreating(true);
  }

  async function openEdit(row: ZoneRow) {
    const res = await fetch(`/api/admin/zones/${row.id}`);
    if (!res.ok) return;
    const detail: ZoneDetail = await res.json();
    setFormName(detail.name);
    setFormLevelMin(String(detail.levelMin));
    setFormLevelMax(String(detail.levelMax));
    setEditZone(detail);
    setIsCreating(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editZone) {
        await fetch(`/api/admin/zones/${editZone.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName, levelMin: Number(formLevelMin), levelMax: Number(formLevelMax) }),
        });
      } else {
        await fetch("/api/admin/zones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName, levelMin: Number(formLevelMin), levelMax: Number(formLevelMax) }),
        });
      }
      setIsCreating(false);
      setRefreshKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this zone? Associated enemies and dungeons will be unlinked.")) return;
    await fetch(`/api/admin/zones/${id}`, { method: "DELETE" });
    setRefreshKey((k) => k + 1);
  }

  // Association helpers
  async function searchPicker(type: "enemies" | "world-bosses" | "dungeons" | "items", q: string) {
    setPickerSearch((p) => ({ ...p, [type]: q }));
    if (!q) { setPickerResults((p) => ({ ...p, [type]: [] })); return; }
    const endpoint = type === "items"
      ? `/api/admin/items?name=${encodeURIComponent(q)}&pageSize=10`
      : `/api/admin/${type}?name=${encodeURIComponent(q)}`;
    const res = await fetch(endpoint);
    if (!res.ok) return;
    const json = await res.json();
    const results: AssocItem[] = type === "items"
      ? (json.data ?? []).map((r: { hashedId: string; name: string }) => ({ hashedId: r.hashedId, name: r.name }))
      : (json.data ?? []).map((r: { id: number; name: string; level?: number }) => ({ id: r.id, name: r.name, level: r.level }));
    setPickerResults((p) => ({ ...p, [type]: results }));
  }

  async function addAssoc(type: "enemies" | "world-bosses" | "dungeons" | "resources", item: AssocItem) {
    if (!editZone) return;
    const body =
      type === "enemies"      ? { enemyId: item.id } :
      type === "world-bosses" ? { bossId: item.id } :
      type === "dungeons"     ? { dungeonId: item.id } :
      { itemHashedId: item.hashedId };
    await fetch(`/api/admin/zones/${editZone.id}/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // Refresh detail
    const res = await fetch(`/api/admin/zones/${editZone.id}`);
    setEditZone(await res.json());
    setPickerResults((p) => ({ ...p, [type]: [] }));
    setPickerSearch((p) => ({ ...p, [type]: "" }));
  }

  async function removeAssoc(type: "enemies" | "world-bosses" | "dungeons" | "resources", item: AssocItem) {
    if (!editZone) return;
    const body =
      type === "enemies"      ? { enemyId: item.id } :
      type === "world-bosses" ? { bossId: item.id } :
      type === "dungeons"     ? { dungeonId: item.id } :
      { itemHashedId: item.hashedId };
    await fetch(`/api/admin/zones/${editZone.id}/${type}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const res = await fetch(`/api/admin/zones/${editZone.id}`);
    setEditZone(await res.json());
  }

  function AssocPanel({
    label, items, pickerType, addType,
  }: {
    label: string;
    items: AssocItem[];
    pickerType: "enemies" | "world-bosses" | "dungeons" | "items";
    addType: "enemies" | "world-bosses" | "dungeons" | "resources";
  }) {
    return (
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
        <div className="rounded-md border border-border/50 bg-muted/20 divide-y divide-border/30 min-h-[40px]">
          {items.map((item) => (
            <div key={item.id ?? item.hashedId} className="flex items-center justify-between px-2.5 py-1.5 text-sm">
              <span className="text-foreground/80">{item.name}{item.level != null ? <span className="ml-1 text-xs text-muted-foreground">Lv{item.level}</span> : null}</span>
              <button onClick={() => removeAssoc(addType, item)} className="text-destructive hover:text-destructive/80 ml-2">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        {editZone && (
          <div className="relative mt-1.5">
            <Input
              placeholder={`Add ${label.toLowerCase()}…`}
              value={pickerSearch[pickerType] ?? ""}
              onChange={(e) => searchPicker(pickerType, e.target.value)}
              className="h-7 text-xs"
            />
            {(pickerResults[pickerType] ?? []).length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                {(pickerResults[pickerType] ?? []).map((r) => (
                  <button
                    key={r.id ?? r.hashedId}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => addAssoc(addType, r)}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const headerContent = (
    <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
      <Plus className="size-3.5" /> New Zone
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Zones</h1>
        <p className="text-muted-foreground text-sm">Combat zones — manage enemies, world bosses, dungeons, and resources.</p>
      </div>

      <AdminTable<ZoneRow>
        columns={COLUMNS}
        endpoint="/api/admin/zones"
        filters={FILTERS}
        pageSize={25}
        refreshKey={refreshKey}
        headerContent={headerContent}
        renderActions={(row) => (
          <div className="flex items-center gap-3">
            <button className="text-primary text-sm hover:underline" onClick={() => openEdit(row)}>Edit</button>
            <button className="text-destructive text-sm hover:underline" onClick={() => handleDelete(row.id)}>Delete</button>
          </div>
        )}
        emptyMessage="No zones yet. Create one to get started."
      />

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editZone ? `Edit: ${editZone.name}` : "New Zone"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-[200px_1fr] gap-6 mt-2">
            {/* Left: zone fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="zone-name">Name</Label>
                <Input id="zone-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Min level</Label>
                  <Input type="number" value={formLevelMin} onChange={(e) => setFormLevelMin(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max level</Label>
                  <Input type="number" value={formLevelMax} onChange={(e) => setFormLevelMax(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving || !formName} size="sm">
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
              </div>
            </div>

            {/* Right: associations (only shown when editing existing zone) */}
            {editZone ? (
              <div className="grid grid-cols-2 gap-4">
                <AssocPanel label="Enemies"      items={editZone.enemies}     pickerType="enemies"      addType="enemies" />
                <AssocPanel label="World Bosses" items={editZone.worldBosses} pickerType="world-bosses" addType="world-bosses" />
                <AssocPanel label="Dungeons"     items={editZone.dungeons}    pickerType="dungeons"     addType="dungeons" />
                <AssocPanel label="Resources"    items={editZone.resources}   pickerType="items"        addType="resources" />
              </div>
            ) : (
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                Save the zone first to add associations.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Open zones page and test create/edit/delete flow**

Navigate to `http://localhost:3000/dashboard/admin/world/zones`. Create a zone, then edit it and add associations (enemies, dungeons, resources).

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/admin/world/zones/page.tsx
git commit -m "feat: add Zones admin page with full CRUD and association management"
```

---

## Task 15: Users service + API routes

**Files:**
- Create: `lib/services/admin/users.service.ts`
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/users/[id]/route.ts`
- Create: `app/api/admin/users/[id]/characters/[charId]/route.ts`

- [ ] **Step 1: Create `lib/services/admin/users.service.ts`**

```typescript
import { db } from "@/lib/db";
import { user, characters } from "@/lib/db/schema";
import { ilike, eq, count, and, or } from "drizzle-orm";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  role: string;
  createdAt: Date;
  characters: { id: number; hashedId: string; name: string; class: string }[];
};

export async function getAdminUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
}): Promise<{ data: AdminUserRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, search, role } = params;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (search) conditions.push(or(
    ilike(user.email, `%${search}%`),
    ilike(user.username, `%${search}%`),
    ilike(user.name, `%${search}%`)
  ));
  if (role) conditions.push(eq(user.role, role));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [users, totals] = await Promise.all([
    db.select({
      id:        user.id,
      name:      user.name,
      email:     user.email,
      username:  user.username,
      role:      user.role,
      createdAt: user.createdAt,
    }).from(user).where(where).orderBy(user.createdAt).limit(pageSize).offset(offset),
    db.select({ value: count() }).from(user).where(where),
  ]);

  // Fetch characters for the current page of users
  const userIds = users.map((u) => u.id);
  const chars = userIds.length > 0
    ? await db.select({
        userId:   characters.userId,
        id:       characters.id,
        hashedId: characters.hashedId,
        name:     characters.name,
        class:    characters.class,
      }).from(characters).where(
        userIds.length === 1
          ? eq(characters.userId, userIds[0])
          : or(...userIds.map((id) => eq(characters.userId, id)))
      )
    : [];

  const charsByUser = new Map<string, typeof chars>();
  for (const c of chars) {
    const list = charsByUser.get(c.userId) ?? [];
    list.push(c);
    charsByUser.set(c.userId, list);
  }

  const data: AdminUserRow[] = users.map((u) => ({
    ...u,
    characters: (charsByUser.get(u.id) ?? []).map((c) => ({
      id: c.id, hashedId: c.hashedId, name: c.name, class: c.class,
    })),
  }));

  return { data, total: Number(totals[0].value), page, pageSize };
}

export async function updateUserEmail(userId: string, email: string) {
  await db.update(user)
    .set({ email, updatedAt: new Date() })
    .where(eq(user.id, userId));
}

export async function deleteUser(userId: string) {
  // Characters cascade via FK
  await db.delete(user).where(eq(user.id, userId));
}

export async function dissociateCharacter(userId: string, characterId: number) {
  // Delete the character row — user can re-sync from IdleMMO
  await db.delete(characters).where(
    and(eq(characters.id, characterId), eq(characters.userId, userId))
  );
}
```

- [ ] **Step 2: Create `app/api/admin/users/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminUsers } from "@/lib/services/admin/users.service";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 25)));
  const search   = searchParams.get("search") ?? undefined;
  const role     = searchParams.get("role")   ?? undefined;

  return NextResponse.json(await getAdminUsers({ page, pageSize, search, role }));
}
```

- [ ] **Step 3: Create `app/api/admin/users/[id]/route.ts`**

Password updates use the better-auth admin plugin so the hash is managed correctly.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateUserEmail, deleteUser } from "@/lib/services/admin/users.service";

async function requireAdmin(r: NextRequest) {
  const s = await auth.api.getSession({ headers: r.headers });
  return s?.user.role === "admin" ? s : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { email, newPassword } = await request.json();

  if (email) {
    await updateUserEmail(id, email);
  }

  if (newPassword) {
    // Uses better-auth admin plugin to set the hashed password correctly
    await auth.api.setUserPassword({
      body: { userId: id, newPassword },
      headers: request.headers,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await deleteUser(id);
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 4: Create `app/api/admin/users/[id]/characters/[charId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dissociateCharacter } from "@/lib/services/admin/users.service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; charId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, charId } = await params;
  await dissociateCharacter(id, Number(charId));
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 5: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add lib/services/admin/users.service.ts \
        app/api/admin/users/ 
git commit -m "feat: add users service and admin user management API routes"
```

---

## Task 16: Users page

**Files:**
- Create: `app/(dashboard)/dashboard/admin/users/page.tsx`

- [ ] **Step 1: Create the Users page**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminTable, type ColumnDef, type FilterDef } from "@/components/admin/AdminTable";
import { X } from "lucide-react";

type CharacterRow = { id: number; hashedId: string; name: string; class: string };
type UserRow = {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  role: string;
  characters: CharacterRow[];
};

const COLUMNS: ColumnDef<UserRow>[] = [
  {
    key: "name",
    label: "User",
    render: (r) => (
      <span className="font-medium">
        {r.username ?? r.name}
        <span className="ml-2 text-xs text-muted-foreground rounded-full border border-border px-1.5 py-0.5">
          {r.characters.length} char{r.characters.length !== 1 ? "s" : ""}
        </span>
      </span>
    ),
  },
  { key: "email", label: "Email",  render: (r) => <span className="text-sm text-muted-foreground">{r.email ?? "—"}</span> },
  { key: "role",  label: "Role",   render: (r) => <span className={`text-xs ${r.role === "admin" ? "text-primary" : "text-muted-foreground"}`}>{r.role}</span> },
];

const FILTERS: FilterDef[] = [
  { key: "search", label: "Search user or email…", type: "search" },
  {
    key: "role",
    label: "All roles",
    type: "select",
    options: [{ value: "admin", label: "Admin" }, { value: "user", label: "User" }],
  },
];

export default function UsersPage() {
  const [refreshKey, setRefreshKey]   = useState(0);
  const [editUser, setEditUser]       = useState<UserRow | null>(null);
  const [editEmail, setEditEmail]     = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  function openEdit(user: UserRow) {
    setEditUser(user);
    setEditEmail(user.email ?? "");
    setEditPassword("");
    setSaveMsg(null);
  }

  async function handleSave() {
    if (!editUser) return;
    setSaving(true); setSaveMsg(null);
    try {
      const body: Record<string, string> = {};
      if (editEmail !== (editUser.email ?? "")) body.email = editEmail;
      if (editPassword) body.newPassword = editPassword;
      if (Object.keys(body).length === 0) { setSaveMsg({ ok: true, text: "Nothing changed." }); return; }

      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveMsg({ ok: true, text: "Saved." });
      setRefreshKey((k) => k + 1);
    } catch {
      setSaveMsg({ ok: false, text: "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user and all their characters? This cannot be undone.")) return;
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setRefreshKey((k) => k + 1);
  }

  async function handleDissociate(userId: string, characterId: number) {
    if (!confirm("Remove this character from the user's account?")) return;
    await fetch(`/api/admin/users/${userId}/characters/${characterId}`, { method: "DELETE" });
    setRefreshKey((k) => k + 1);
    // Also refresh the edit dialog if open
    if (editUser?.id === userId) {
      const res = await fetch(`/api/admin/users?page=1&pageSize=1&search=${editUser.email ?? editUser.name}`);
      const json = await res.json();
      if (json.data?.[0]) setEditUser(json.data[0] as UserRow);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">User accounts and associated characters.</p>
      </div>

      <AdminTable<UserRow>
        columns={COLUMNS}
        endpoint="/api/admin/users"
        filters={FILTERS}
        pageSize={25}
        refreshKey={refreshKey}
        expandedKey="id"
        renderExpanded={(row) => (
          <div className="space-y-1">
            <div className="grid grid-cols-[140px_100px_1fr_80px] text-xs text-muted-foreground pb-1 border-b border-border/30">
              <span>Name</span><span>Class</span><span>Hashed ID</span><span className="text-right">Action</span>
            </div>
            {row.characters.length === 0 ? (
              <div className="text-xs text-muted-foreground py-1">No characters linked.</div>
            ) : (
              row.characters.map((c) => (
                <div key={c.id} className="grid grid-cols-[140px_100px_1fr_80px] text-sm items-center py-0.5">
                  <span className="font-medium text-sm">{c.name}</span>
                  <span className="text-muted-foreground text-xs">{c.class}</span>
                  <span className="font-mono text-xs text-muted-foreground/60">{c.hashedId}</span>
                  <button
                    className="text-right text-xs text-destructive hover:underline"
                    onClick={() => handleDissociate(row.id, c.id)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        renderActions={(row) => (
          <div className="flex items-center gap-3">
            <button className="text-primary text-sm hover:underline" onClick={() => openEdit(row)}>Edit</button>
            <button className="text-destructive text-sm hover:underline" onClick={() => handleDelete(row.id)}>Delete</button>
          </div>
        )}
        emptyMessage="No users found."
      />

      <Dialog open={editUser !== null} onOpenChange={(open) => !open && setEditUser(null)}>
        {editUser && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit User: {editUser.username ?? editUser.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  type="password"
                  placeholder="Leave blank to keep current"
                />
              </div>
              {saveMsg && (
                <p className={`text-xs ${saveMsg.ok ? "text-green-500" : "text-destructive"}`}>{saveMsg.text}</p>
              )}
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Open the Users page and verify expandable rows, edit dialog, and dissociate flow**

Navigate to `http://localhost:3000/dashboard/admin/users`. Click a user row to expand characters. Test the Edit modal with email change.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/admin/users/page.tsx
git commit -m "feat: add Users admin page with expandable character rows and edit dialog"
```

---

## Task 17: Update docs and open PR

**Files:**
- Modify: `docs/database.md`
- Modify: `docs/project-map.md`

- [ ] **Step 1: Update `docs/database.md`**

Add entries for the four new tables (`zones`, `enemies`, `world_bosses`, `zone_resources`) and the new `zone_id` column on `dungeons`. Follow the existing table format in that file.

- [ ] **Step 2: Update `docs/project-map.md`**

Add the new admin routes and service files to the relevant feature area entries.

- [ ] **Step 3: Final type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Push branch and open PR**

```bash
git push -u origin feat/admin-panel
gh pr create \
  --title "feat: admin panel redesign — Economy/World/Users sections" \
  --body "Implements the spec at docs/specs/2026-04-01-admin-panel-redesign.md.

## Changes
- New sidebar AdminNav with Economy / World / Users collapsible groups
- Items page: paginated table with filters + sync controls (moved from admin root)
- Dungeons page: paginated table + Sync Dungeons button
- Zones page: full CRUD with association management (enemies, world bosses, dungeons, resources)
- Users page: expandable user rows showing characters, edit email/password, delete user, dissociate characters
- New DB tables: zones, enemies, world_bosses, zone_resources; zone_id FK on dungeons
- Shared AdminTable and SyncLog components

## Test plan
- [ ] Migration applies cleanly against production DB
- [ ] All 4 admin sections load with correct data
- [ ] Sync buttons on Items and Dungeons pages trigger live log
- [ ] Zone create/edit/delete and association add/remove work
- [ ] User email edit and character dissociation work
- [ ] World Bosses and Enemies show Coming soon
- [ ] npx tsc --noEmit passes with 0 errors"
```

- [ ] **Step 5: Do not merge — wait for user approval**

---

## Self-Review Notes

- Task 2 (migration) must run from the worktree with symlinked node_modules per AGENTS.md convention.
- Task 3 (admin plugin) is required before Task 15 step 3 (`auth.api.setUserPassword`).
- Task 10 (dungeons service): the `leftJoin` syntax note in Step 2 is the canonical form — verify Drizzle version accepts `eq(dungeons.zoneId, zones.id)` with nullable LHS.
- Task 12 zones service: `or(...userIds.map(...))` in `getAdminUsers` works for small pages but consider `inArray` from drizzle-orm for larger sets. For pages of 25 this is fine.
- Zone associations (enemies/world_bosses/dungeons) use a `zone_id` FK on those tables, not a junction. This means one enemy can only belong to one zone at a time — consistent with IdleMMO's world model.
