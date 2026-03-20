import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCharacterInfo, getAltCharacters } from "@/lib/idlemmo";
import { CombatPlanner } from "./CombatPlanner";
import { ZONES } from "@/data/zones";

export default async function CombatPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { idlemmoToken: token, idlemmoCharacterId: charId } = session.user;

  type CharOption = { hashed_id: string; name: string };
  let characters: CharOption[] = [];

  if (token && charId) {
    const result = await Promise.allSettled([
      Promise.all([getCharacterInfo(charId, token), getAltCharacters(charId, token)]),
    ]);
    if (result[0].status === "fulfilled") {
      const [primary, alts] = result[0].value;
      characters = [
        { hashed_id: primary.hashed_id, name: primary.name },
        ...alts.map((a) => ({ hashed_id: a.hashed_id, name: a.name })),
      ];
    }
  }

  return <CombatPlanner characters={characters} zones={ZONES} />;
}
