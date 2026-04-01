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
