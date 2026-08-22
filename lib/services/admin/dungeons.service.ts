import { getD1, type D1Value } from "@/lib/db/d1";
import type { DungeonLootItem } from "@/lib/db/schema";

type DungeonD1Row = {
  id: number;
  name: string;
  image_url: string | null;
  zone_id: number | null;
  level_required: number;
  difficulty: number;
  duration_ms: number;
  gold_cost: number;
  shards: number;
  loot: string | null;
  synced_at: string;
};

export type AdminDungeonRow = {
  id: number;
  name: string;
  zoneId: number | null;
  levelRequired: number;
  difficulty: number;
  syncedAt: Date;
};

export type StoredDungeon = {
  id: number;
  name: string;
  imageUrl: string | null;
  zoneId: number | null;
  levelRequired: number;
  difficulty: number;
  durationMs: number;
  goldCost: number;
  shards: number;
  loot: DungeonLootItem[] | null;
  syncedAt: Date;
};

export type DungeonSyncRow = {
  id: number;
  name: string;
  imageUrl: string | null;
  levelRequired: number;
  difficulty: number;
  durationMs: number;
  goldCost: number;
  shards: number;
  loot: DungeonLootItem[] | null;
  syncedAt: Date;
};

function parseLoot(value: string | null): DungeonLootItem[] | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as DungeonLootItem[]) : null;
  } catch {
    return null;
  }
}

function mapD1Dungeon(row: DungeonD1Row): StoredDungeon {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    zoneId: row.zone_id,
    levelRequired: row.level_required,
    difficulty: row.difficulty,
    durationMs: row.duration_ms,
    goldCost: row.gold_cost,
    shards: row.shards,
    loot: parseLoot(row.loot),
    syncedAt: new Date(row.synced_at),
  };
}

function mapD1AdminDungeon(row: DungeonD1Row): AdminDungeonRow {
  return {
    id: row.id,
    name: row.name,
    zoneId: row.zone_id,
    levelRequired: row.level_required,
    difficulty: row.difficulty,
    syncedAt: new Date(row.synced_at),
  };
}

export async function getAdminDungeons(params: {
  page: number;
  pageSize: number;
  name?: string;
  minLevel?: number;
}): Promise<{ data: AdminDungeonRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, name, minLevel } = params;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const values: D1Value[] = [];

  if (name) {
    conditions.push("lower(name) LIKE ?");
    values.push(`%${name.toLowerCase()}%`);
  }
  if (minLevel) {
    conditions.push("level_required >= ?");
    values.push(minLevel);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const d1 = getD1();
  const { results } = await d1
    .prepare(
      `SELECT id, name, image_url, zone_id, level_required, difficulty, duration_ms,
              gold_cost, shards, loot, synced_at
       FROM dungeons
       ${where}
       ORDER BY level_required ASC
       LIMIT ? OFFSET ?`
    )
    .bind(...values, pageSize, offset)
    .all<DungeonD1Row>();

  const total = await d1
    .prepare(`SELECT COUNT(*) AS value FROM dungeons ${where}`)
    .bind(...values)
    .all<{ value: number }>();

  return {
    data: results.map(mapD1AdminDungeon),
    total: total.results[0]?.value ?? 0,
    page,
    pageSize,
  };
}

export async function getStoredDungeons(): Promise<StoredDungeon[]> {
  const { results } = await getD1()
    .prepare(
      `SELECT id, name, image_url, zone_id, level_required, difficulty, duration_ms,
              gold_cost, shards, loot, synced_at
       FROM dungeons
       ORDER BY level_required ASC`
    )
    .all<DungeonD1Row>();

  return results.map(mapD1Dungeon);
}

export async function upsertSyncedDungeons(rows: DungeonSyncRow[]): Promise<void> {
  if (rows.length === 0) return;

  const d1 = getD1();
  for (const row of rows) {
    await d1
      .prepare(
        `INSERT INTO dungeons (
           id, name, image_url, level_required, difficulty, duration_ms,
           gold_cost, shards, loot, synced_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           image_url = excluded.image_url,
           level_required = excluded.level_required,
           difficulty = excluded.difficulty,
           duration_ms = excluded.duration_ms,
           gold_cost = excluded.gold_cost,
           shards = excluded.shards,
           loot = excluded.loot,
           synced_at = excluded.synced_at`
      )
      .bind(
        row.id,
        row.name,
        row.imageUrl,
        row.levelRequired,
        row.difficulty,
        row.durationMs,
        row.goldCost,
        row.shards,
        row.loot ? JSON.stringify(row.loot) : null,
        row.syncedAt.toISOString()
      )
      .run();
  }
}
