import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { gearPresets, items } from "@/lib/db/schema";
import { getCharacterInfo, getAltCharacters, getDungeons } from "@/lib/idlemmo";
import { STATIC_DUNGEONS, type StaticDungeon } from "./difficulty";
import { DungeonExplorer } from "./DungeonExplorer";

export default async function DungeonsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { idlemmoToken: token, idlemmoCharacterId: charId } = session.user;

  // Load characters and dungeons in parallel (both best-effort)
  type CharOption = { hashed_id: string; name: string };
  let characters: CharOption[] = [];
  let dungeons: StaticDungeon[] = STATIC_DUNGEONS;

  if (token && charId) {
    const [charResult, dungeonResult] = await Promise.allSettled([
      Promise.all([getCharacterInfo(charId, token), getAltCharacters(charId, token)]),
      getDungeons(token),
    ]);

    if (charResult.status === "fulfilled") {
      const [primary, alts] = charResult.value;
      characters = [
        { hashed_id: primary.hashed_id, name: primary.name },
        ...alts.map((a) => ({ hashed_id: a.hashed_id, name: a.name })),
      ];
    }

    if (dungeonResult.status === "fulfilled") {
      const apiDungeons = dungeonResult.value;
      // Merge API data into the static list (matched by name, case-insensitive)
      const apiMap = new Map(apiDungeons.map((d) => [d.name?.toLowerCase(), d]));
      dungeons = STATIC_DUNGEONS.map((d) => {
        const apiEntry = apiMap.get(d.name.toLowerCase());
        if (!apiEntry) return d;
        return {
          ...d,
          difficulty: apiEntry.difficulty,
          // API returns duration in ms; convert to seconds
          durationSec: Math.round(apiEntry.length / 1000),
          minLevel: apiEntry.level_required,
          goldCost: apiEntry.cost,
        };
      });
    } else {
      console.error("[DungeonsPage] getDungeons failed:", dungeonResult.reason);
    }
  }

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

  const hasDifficultyData = dungeons.some((d) => d.difficulty > 0);

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
