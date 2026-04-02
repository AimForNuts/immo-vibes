import { db } from "@/lib/db";
import { zones, itemZones } from "@/lib/db/schema";
import type { ZoneEnemy, ZoneDungeon, ZoneWorldBoss } from "@/lib/db/schema";
import { eq, count, ilike } from "drizzle-orm";

export type { ZoneEnemy, ZoneDungeon, ZoneWorldBoss };

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

// ── List ──────────────────────────────────────────────────────────────────────

export async function getAdminZones(params: {
  page: number;
  pageSize: number;
  name?: string;
}): Promise<{ data: ZoneListRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, name } = params;
  const offset = (page - 1) * pageSize;
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
  const [zone] = await db.update(zones).set(data).where(eq(zones.id, id)).returning();
  return zone;
}

export async function deleteZone(id: number) {
  await db.delete(zones).where(eq(zones.id, id));
}

// ── Item zone associations ────────────────────────────────────────────────────

export async function getAllZones(): Promise<{ id: number; name: string }[]> {
  return db
    .select({ id: zones.id, name: zones.name })
    .from(zones)
    .orderBy(zones.levelRequired);
}

export async function getItemZoneIds(itemHashedId: string): Promise<number[]> {
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
  await db.transaction(async (tx) => {
    await tx.delete(itemZones).where(eq(itemZones.itemHashedId, itemHashedId));
    if (zoneIds.length > 0) {
      await tx.insert(itemZones).values(
        zoneIds.map((zoneId) => ({ itemHashedId, zoneId }))
      );
    }
  });
}
