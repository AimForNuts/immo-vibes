import { db } from "@/lib/db";
import { dungeons, zones } from "@/lib/db/schema";
import { ilike, gte, and, count, eq, SQL } from "drizzle-orm";

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
      .leftJoin(zones, eq(dungeons.zoneId, zones.id))
      .where(where)
      .orderBy(dungeons.levelRequired)
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(dungeons).where(where),
  ]);

  return { data, total: Number(totals[0].value), page, pageSize };
}
