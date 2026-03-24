import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { gearPresets, items, dungeons as dungeonsTable } from "@/lib/db/schema";
import { getDbCharacters } from "@/lib/services/character-cache";
import { STATIC_DUNGEONS, type StaticDungeon } from "./difficulty";
import { DungeonExplorer } from "./DungeonExplorer";

export default async function DungeonsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Load characters from DB cache (instant — no API call)
  const dbChars = await getDbCharacters(session.user.id);
  const characters = dbChars.map((c) => ({
    hashed_id: c.hashedId,
    name:      c.name,
    isMember:  c.isMember,
    isPrimary: c.isPrimary,
  }));

  // Load dungeon data from DB, fall back to STATIC_DUNGEONS
  const dbDungeons = await db.select().from(dungeonsTable);

  let dungeons: StaticDungeon[];

  if (dbDungeons.length > 0) {
    // Merge DB rows over the static list by name (case-insensitive).
    // DB dungeons not in the static list are appended at the end.
    const dbMap = new Map(dbDungeons.map((d) => [d.name.toLowerCase(), d]));

    const merged = STATIC_DUNGEONS.map((s) => {
      const row = dbMap.get(s.name.toLowerCase());
      if (!row) return s;
      return {
        ...s,
        difficulty:  row.difficulty,
        durationSec: Math.round(row.durationMs / 1000),
        minLevel:    row.levelRequired,
        goldCost:    row.goldCost,
        loot:        row.loot ?? undefined,
      };
    });

    // Append any DB dungeon not already in the static list (e.g. newly added dungeons)
    const staticNames = new Set(STATIC_DUNGEONS.map((s) => s.name.toLowerCase()));
    for (const d of dbDungeons) {
      if (!staticNames.has(d.name.toLowerCase())) {
        merged.push({
          name:        d.name,
          minLevel:    d.levelRequired,
          location:    d.location ?? "",
          goldCost:    d.goldCost,
          durationSec: Math.round(d.durationMs / 1000),
          difficulty:  d.difficulty,
          loot:        d.loot ?? undefined,
        });
      }
    }

    dungeons = merged;
  } else {
    dungeons = STATIC_DUNGEONS;
  }

  const hasDifficultyData = dungeons.some((d) => d.difficulty > 0);

  // Load user's saved gear presets
  const presetRows = await db
    .select()
    .from(gearPresets)
    .where(eq(gearPresets.userId, session.user.id))
    .orderBy(gearPresets.createdAt);

  // Resolve item details for all preset slots
  const allHashedIds = Array.from(
    new Set(
      presetRows.flatMap((p) =>
        Object.values(p.slots as Record<string, { hashedId: string; tier: number }>).map(
          (s) => s.hashedId
        )
      )
    )
  );

  const itemRows =
    allHashedIds.length > 0
      ? await db
          .select({ hashedId: items.hashedId, name: items.name, quality: items.quality, imageUrl: items.imageUrl })
          .from(items)
          .where(inArray(items.hashedId, allHashedIds))
      : [];

  const itemsMap: Record<string, { name: string; quality: string; imageUrl: string | null }> = {};
  for (const row of itemRows) {
    itemsMap[row.hashedId] = { name: row.name, quality: row.quality, imageUrl: row.imageUrl };
  }

  const presets = presetRows.map((p) => ({
    id: p.id,
    name: p.name,
    weaponStyle: p.weaponStyle,
    slots: p.slots as Record<string, { hashedId: string; tier: number }>,
    characterId: p.characterId ?? undefined,
  }));

  return (
    <DungeonExplorer
      dungeons={dungeons}
      presets={presets}
      itemsMap={itemsMap}
      characters={characters}
      hasDifficultyData={hasDifficultyData}
    />
  );
}
