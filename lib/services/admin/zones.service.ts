import { getD1 } from "@/lib/db/d1";
import type { ZoneEnemy, ZoneDungeon, ZoneWorldBoss } from "@/lib/db/schema";

export type { ZoneEnemy, ZoneDungeon, ZoneWorldBoss };

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

export type ZoneItemDropResult = {
  id: number;
  name: string;
  level_required: number;
  enemies?: Array<{ name: string; level: number }>;
  dungeons?: Array<{ name: string }>;
  world_bosses?: Array<{ name: string }>;
};

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

export async function getAdminZones(params: {
  page: number;
  pageSize: number;
  name?: string;
}): Promise<{ data: ZoneListRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, name } = params;
  const offset = (page - 1) * pageSize;
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

  const d1 = getD1();
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

export async function getZoneDetail(id: number): Promise<ZoneDetail | null> {
  const zone = await getD1()
    .prepare(
      `SELECT id, name, level_required, enemies, dungeons, world_bosses
       FROM zones
       WHERE id = ?`
    )
    .bind(id)
    .first<ZoneD1Row>();

  return zone ? mapZoneDetail(zone) : null;
}

export async function createZone(data: { name: string; levelRequired: number }) {
  const result = await getD1()
    .prepare(
      `INSERT INTO zones (name, level_required, enemies, dungeons, world_bosses)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(data.name, data.levelRequired, "[]", "[]", "[]")
    .run();
  const id = result.meta?.last_row_id;
  return id ? getZoneDetail(id) : null;
}

export async function updateZone(id: number, data: {
  name?: string;
  levelRequired?: number;
  enemies?: ZoneEnemy[];
  dungeons?: ZoneDungeon[];
  worldBosses?: ZoneWorldBoss[];
}) {
  const current = await getZoneDetail(id);
  if (!current) return null;

  await getD1()
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

export async function deleteZone(id: number) {
  const d1 = getD1();
  await d1.batch([
    d1.prepare("DELETE FROM item_zones WHERE zone_id = ?").bind(id),
    d1.prepare("DELETE FROM zones WHERE id = ?").bind(id),
  ]);
}

export async function getAllZones(): Promise<{ id: number; name: string }[]> {
  const { results } = await getD1()
    .prepare("SELECT id, name FROM zones ORDER BY level_required ASC")
    .all<{ id: number; name: string }>();
  return results;
}

export async function getZonesForDroppedItem(itemHashedId: string): Promise<ZoneItemDropResult[]> {
  const { results } = await getD1()
    .prepare("SELECT id, name, level_required, enemies, dungeons, world_bosses FROM zones")
    .all<ZoneD1Row>();
  const allZones = results.map(mapZoneDetail);

  return allZones.reduce<ZoneItemDropResult[]>((acc, zone) => {
    let matched = false;
    const result: ZoneItemDropResult = {
      id: zone.id,
      name: zone.name,
      level_required: zone.levelRequired,
    };

    const matchedEnemies = zone.enemies.filter((enemy) => enemy.drops.includes(itemHashedId));
    if (matchedEnemies.length > 0) {
      matched = true;
      result.enemies = matchedEnemies.map((enemy) => ({
        name: enemy.name,
        level: enemy.level,
      }));
    }

    const matchedDungeons = zone.dungeons.filter((dungeon) =>
      dungeon.drops?.includes(itemHashedId)
    );
    if (matchedDungeons.length > 0) {
      matched = true;
      result.dungeons = matchedDungeons.map((dungeon) => ({ name: dungeon.name }));
    }

    const matchedWorldBosses = zone.worldBosses.filter((worldBoss) =>
      worldBoss.drops?.includes(itemHashedId)
    );
    if (matchedWorldBosses.length > 0) {
      matched = true;
      result.world_bosses = matchedWorldBosses.map((worldBoss) => ({ name: worldBoss.name }));
    }

    if (matched) acc.push(result);
    return acc;
  }, []);
}

export async function getItemZoneIds(itemHashedId: string): Promise<number[]> {
  const { results } = await getD1()
    .prepare("SELECT zone_id FROM item_zones WHERE item_hashed_id = ?")
    .bind(itemHashedId)
    .all<{ zone_id: number }>();
  return results.map((r) => r.zone_id);
}

export async function replaceItemZones(
  itemHashedId: string,
  zoneIds: number[]
): Promise<void> {
  const d1 = getD1();
  await d1.batch([
    d1.prepare("DELETE FROM item_zones WHERE item_hashed_id = ?").bind(itemHashedId),
    ...zoneIds.map((zoneId) =>
      d1
        .prepare("INSERT OR IGNORE INTO item_zones (item_hashed_id, zone_id) VALUES (?, ?)")
        .bind(itemHashedId, zoneId)
    ),
  ]);
}
