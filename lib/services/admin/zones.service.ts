import { db } from "@/lib/db";
import { zones, enemies, worldBosses, dungeons, zoneResources, items } from "@/lib/db/schema";
import { eq, count, ilike, and } from "drizzle-orm";

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
    db.select({ zoneId: dungeons.zoneId, value: count() }).from(dungeons).groupBy(dungeons.zoneId),
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
    .where(and(eq(zoneResources.zoneId, zoneId), eq(zoneResources.itemHashedId, itemHashedId)));
}
