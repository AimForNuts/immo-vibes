import { db } from "@/lib/db";
import { zones, itemZones } from "@/lib/db/schema";
import type { ZoneEnemy, ZoneDungeon, ZoneWorldBoss } from "@/lib/db/schema";
import { eq, count, ilike } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type { ZoneEnemy, ZoneDungeon, ZoneWorldBoss };

type D1Value = string | number | boolean | null;

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ meta?: { last_row_id?: number } }>;
};

type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
};

type ZonesCloudflareEnv = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

type ZoneD1Row = {
  id: number;
  name: string;
  level_required: number;
  enemies: string | null;
  dungeons: string | null;
  world_bosses: string | null;
};

export type ZoneListRow = {
  id: number;
  name: string;
  levelRequired: number;
  enemyCount: number;
  dungeonCount: number;
  worldBossCount: number;
};

export type ZoneDetail = {
  id: number;
  name: string;
  levelRequired: number;
  enemies: ZoneEnemy[];
  dungeons: ZoneDungeon[];
  worldBosses: ZoneWorldBoss[];
};

function getZonesD1(): D1DatabaseBinding | null {
  try {
    return (getCloudflareContext().env as ZonesCloudflareEnv).IMMO_SYNC_DB ?? null;
  } catch {
    return null;
  }
}

function parseJsonArray<T>(value: string | null): T[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function mapZoneDetail(row: ZoneD1Row): ZoneDetail {
  return {
    id: row.id,
    name: row.name,
    levelRequired: row.level_required,
    enemies: parseJsonArray<ZoneEnemy>(row.enemies),
    dungeons: parseJsonArray<ZoneDungeon>(row.dungeons),
    worldBosses: parseJsonArray<ZoneWorldBoss>(row.world_bosses),
  };
}

function mapZoneListRow(row: ZoneD1Row): ZoneListRow {
  const enemies = parseJsonArray<ZoneEnemy>(row.enemies);
  const dungeons = parseJsonArray<ZoneDungeon>(row.dungeons);
  const worldBosses = parseJsonArray<ZoneWorldBoss>(row.world_bosses);

  return {
    id: row.id,
    name: row.name,
    levelRequired: row.level_required,
    enemyCount: enemies.length,
    dungeonCount: dungeons.length,
    worldBossCount: worldBosses.length,
  };
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function getAdminZones(params: {
  page: number;
  pageSize: number;
  name?: string;
}): Promise<{ data: ZoneListRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, name } = params;
  const offset = (page - 1) * pageSize;
  const d1 = getZonesD1();

  if (d1) {
    const filter = name ? `%${name.toLowerCase()}%` : null;
    const listQuery = filter
      ? `SELECT id, name, level_required, enemies, dungeons, world_bosses
         FROM zones
         WHERE lower(name) LIKE ?
         ORDER BY level_required ASC
         LIMIT ? OFFSET ?`
      : `SELECT id, name, level_required, enemies, dungeons, world_bosses
         FROM zones
         ORDER BY level_required ASC
         LIMIT ? OFFSET ?`;
    const countQuery = filter
      ? "SELECT COUNT(*) AS value FROM zones WHERE lower(name) LIKE ?"
      : "SELECT COUNT(*) AS value FROM zones";

    const [{ results }, totals] = await Promise.all([
      filter
        ? d1.prepare(listQuery).bind(filter, pageSize, offset).all<ZoneD1Row>()
        : d1.prepare(listQuery).bind(pageSize, offset).all<ZoneD1Row>(),
      filter
        ? d1.prepare(countQuery).bind(filter).first<{ value: number }>()
        : d1.prepare(countQuery).first<{ value: number }>(),
    ]);

    return {
      data: results.map(mapZoneListRow),
      total: totals?.value ?? 0,
      page,
      pageSize,
    };
  }

  const where  = name ? ilike(zones.name, `%${name}%`) : undefined;

  const [zoneList, totals] = await Promise.all([
    db.select().from(zones).where(where).orderBy(zones.levelRequired).limit(pageSize).offset(offset),
    db.select({ value: count() }).from(zones).where(where),
  ]);

  const data: ZoneListRow[] = zoneList.map((z) => ({
    id:             z.id,
    name:           z.name,
    levelRequired:  z.levelRequired,
    enemyCount:     (z.enemies ?? []).length,
    dungeonCount:   (z.dungeons ?? []).length,
    worldBossCount: (z.worldBosses ?? []).length,
  }));

  return { data, total: Number(totals[0].value), page, pageSize };
}

// ── Detail ────────────────────────────────────────────────────────────────────

export async function getZoneDetail(id: number): Promise<ZoneDetail | null> {
  const d1 = getZonesD1();
  if (d1) {
    const zone = await d1
      .prepare(
        `SELECT id, name, level_required, enemies, dungeons, world_bosses
         FROM zones
         WHERE id = ?`
      )
      .bind(id)
      .first<ZoneD1Row>();
    return zone ? mapZoneDetail(zone) : null;
  }

  const [zone] = await db.select().from(zones).where(eq(zones.id, id));
  if (!zone) return null;
  return {
    id:            zone.id,
    name:          zone.name,
    levelRequired: zone.levelRequired,
    enemies:       zone.enemies ?? [],
    dungeons:      zone.dungeons ?? [],
    worldBosses:   zone.worldBosses ?? [],
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createZone(data: { name: string; levelRequired: number }) {
  const d1 = getZonesD1();
  if (d1) {
    const result = await d1
      .prepare(
        `INSERT INTO zones (name, level_required, enemies, dungeons, world_bosses)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(data.name, data.levelRequired, "[]", "[]", "[]")
      .run();
    const id = result.meta?.last_row_id;
    return id ? getZoneDetail(id) : null;
  }

  const [zone] = await db.insert(zones).values(data).returning();
  return zone;
}

export async function updateZone(id: number, data: {
  name?: string;
  levelRequired?: number;
  enemies?: ZoneEnemy[];
  dungeons?: ZoneDungeon[];
  worldBosses?: ZoneWorldBoss[];
}) {
  const d1 = getZonesD1();
  if (d1) {
    const current = await getZoneDetail(id);
    if (!current) return null;

    await d1
      .prepare(
        `UPDATE zones
         SET name = ?,
             level_required = ?,
             enemies = ?,
             dungeons = ?,
             world_bosses = ?
         WHERE id = ?`
      )
      .bind(
        data.name ?? current.name,
        data.levelRequired ?? current.levelRequired,
        JSON.stringify(data.enemies ?? current.enemies),
        JSON.stringify(data.dungeons ?? current.dungeons),
        JSON.stringify(data.worldBosses ?? current.worldBosses),
        id
      )
      .run();

    return getZoneDetail(id);
  }

  const [zone] = await db.update(zones).set(data).where(eq(zones.id, id)).returning();
  return zone;
}

export async function deleteZone(id: number) {
  const d1 = getZonesD1();
  if (d1) {
    await d1.batch([
      d1.prepare("DELETE FROM item_zones WHERE zone_id = ?").bind(id),
      d1.prepare("DELETE FROM zones WHERE id = ?").bind(id),
    ]);
    return;
  }

  await db.delete(zones).where(eq(zones.id, id));
}

// ── Item zone associations ────────────────────────────────────────────────────

export async function getAllZones(): Promise<{ id: number; name: string }[]> {
  const d1 = getZonesD1();
  if (d1) {
    const { results } = await d1
      .prepare("SELECT id, name FROM zones ORDER BY level_required ASC")
      .all<{ id: number; name: string }>();
    return results;
  }

  return db
    .select({ id: zones.id, name: zones.name })
    .from(zones)
    .orderBy(zones.levelRequired);
}

export async function getItemZoneIds(itemHashedId: string): Promise<number[]> {
  const d1 = getZonesD1();
  if (d1) {
    const { results } = await d1
      .prepare("SELECT zone_id FROM item_zones WHERE item_hashed_id = ?")
      .bind(itemHashedId)
      .all<{ zone_id: number }>();
    return results.map((r) => r.zone_id);
  }

  const rows = await db
    .select({ zoneId: itemZones.zoneId })
    .from(itemZones)
    .where(eq(itemZones.itemHashedId, itemHashedId));
  return rows.map((r) => r.zoneId);
}

export async function replaceItemZones(
  itemHashedId: string,
  zoneIds: number[]
): Promise<void> {
  const d1 = getZonesD1();
  if (d1) {
    await d1.batch([
      d1.prepare("DELETE FROM item_zones WHERE item_hashed_id = ?").bind(itemHashedId),
      ...zoneIds.map((zoneId) =>
        d1
          .prepare("INSERT OR IGNORE INTO item_zones (item_hashed_id, zone_id) VALUES (?, ?)")
          .bind(itemHashedId, zoneId)
      ),
    ]);
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(itemZones).where(eq(itemZones.itemHashedId, itemHashedId));
    if (zoneIds.length > 0) {
      await tx.insert(itemZones).values(
        zoneIds.map((zoneId) => ({ itemHashedId, zoneId }))
      );
    }
  });
}
