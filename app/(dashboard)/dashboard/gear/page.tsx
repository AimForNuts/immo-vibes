import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCharacterInfo, getAltCharacters } from "@/lib/idlemmo";
import { getGearPresets } from "@/lib/services/gear-presets.service";
import { getItemsByIds } from "@/lib/services/items.service";
import { GearCalculator } from "./GearCalculator";

export default async function GearPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const presets = await getGearPresets(session.user.id);

  // Collect all unique item hashedIds referenced in presets
  const allHashedIds = Array.from(
    new Set(
      presets.flatMap((p) => Object.values(p.slots).map((s) => s.hashedId))
    )
  );

  // Fetch item details from local catalog for all preset slots
  const itemRows = await getItemsByIds(allHashedIds);

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
        slots: p.slots,
        characterId: p.characterId ?? undefined,
      }))}
      itemsMap={itemsMap}
      characters={characters}
    />
  );
}
