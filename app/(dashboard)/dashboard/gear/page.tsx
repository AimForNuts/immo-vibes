import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { gearPresets, items } from "@/lib/db/schema";
import { getCharacterInfo, getAltCharacters } from "@/lib/idlemmo";
import { GearCalculator } from "./GearCalculator";

export default async function GearPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const presets = await db
    .select()
    .from(gearPresets)
    .where(eq(gearPresets.userId, session.user.id))
    .orderBy(gearPresets.createdAt);

  // Collect all unique item hashedIds referenced in presets
  const allHashedIds = Array.from(
    new Set(
      presets.flatMap((p) =>
        Object.values(p.slots as Record<string, { hashedId: string; tier: number }>).map(
          (s) => s.hashedId
        )
      )
    )
  );

  // Fetch item details from local catalog for all preset slots
  const itemRows =
    allHashedIds.length > 0
      ? await db
          .select({
            hashedId: items.hashedId,
            name: items.name,
            quality: items.quality,
            imageUrl: items.imageUrl,
          })
          .from(items)
          .where(inArray(items.hashedId, allHashedIds))
      : [];

  const itemsMap: Record<string, { name: string; quality: string; imageUrl: string | null }> = {};
  for (const row of itemRows) {
    itemsMap[row.hashedId] = { name: row.name, quality: row.quality, imageUrl: row.imageUrl };
  }

  // Load character list for selector (best-effort — no token = empty list)
  type CharOption = { hashed_id: string; name: string };
  let characters: CharOption[] = [];
  const { idlemmoToken: token, idlemmoCharacterId: charId } = session.user;

  if (token && charId) {
    try {
      const [primary, alts] = await Promise.all([
        getCharacterInfo(charId, token),
        getAltCharacters(charId, token),
      ]);
      characters = [
        { hashed_id: primary.hashed_id, name: primary.name },
        ...alts.map((a) => ({ hashed_id: a.hashed_id, name: a.name })),
      ];
    } catch {
      // silently skip if API unreachable
    }
  }

  return (
    <GearCalculator
      presets={presets.map((p) => ({
        id: p.id,
        name: p.name,
        weaponStyle: p.weaponStyle,
        slots: p.slots as Record<string, { hashedId: string; tier: number }>,
        characterId: p.characterId ?? undefined,
      }))}
      itemsMap={itemsMap}
      characters={characters}
    />
  );
}
