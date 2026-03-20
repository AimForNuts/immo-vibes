import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCharacterInfo, getAltCharacters, getEnemies } from "@/lib/idlemmo";
import { ENEMY_COMBAT_STATS } from "@/data/enemy-combat-stats";
import { CombatPlanner } from "./CombatPlanner";

export default async function CombatPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { idlemmoToken: token, idlemmoCharacterId: charId } = session.user;

  type CharOption = { hashed_id: string; name: string };
  let characters: CharOption[] = [];
  let enemies: Awaited<ReturnType<typeof getEnemies>> = [];

  if (token && charId) {
    const [charResult, enemyResult] = await Promise.allSettled([
      Promise.all([getCharacterInfo(charId, token), getAltCharacters(charId, token)]),
      getEnemies(token),
    ]);

    if (charResult.status === "fulfilled") {
      const [primary, alts] = charResult.value;
      characters = [
        { hashed_id: primary.hashed_id, name: primary.name },
        ...alts.map((a) => ({ hashed_id: a.hashed_id, name: a.name })),
      ];
    }

    if (enemyResult.status === "fulfilled") {
      enemies = enemyResult.value;
    }
  }

  return (
    <CombatPlanner
      characters={characters}
      enemies={enemies}
      combatStats={ENEMY_COMBAT_STATS}
    />
  );
}
