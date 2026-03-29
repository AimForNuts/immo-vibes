import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCharacterPets, type CharacterPet } from "@/lib/idlemmo";
import { db } from "@/lib/db";
import { characterPets } from "@/lib/db/schema";
import { randomUUID } from "crypto";

async function fetchEquippedPet(
  characterHashedId: string,
  token: string
): Promise<CharacterPet | null> {
  const pets = await getCharacterPets(characterHashedId, token);
  return pets.find((p) => p.equipped) ?? null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: characterHashedId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No IdleMMO token configured" }, { status: 400 });

  let pet: CharacterPet | null;
  try {
    pet = await fetchEquippedPet(characterHashedId, token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Failed to fetch pet: ${msg}` }, { status: 502 });
  }

  if (!pet) {
    return NextResponse.json({ error: "No pet equipped on this character" }, { status: 404 });
  }

  await db
    .insert(characterPets)
    .values({
      id:                     randomUUID(),
      userId:                 session.user.id,
      characterHashedId,
      petId:                  pet.id,
      name:                   pet.name,
      customName:             pet.custom_name ?? null,
      imageUrl:               pet.image_url ?? null,
      level:                  pet.level,
      quality:                pet.quality,
      attackPower:            pet.stats.strength,
      protection:             pet.stats.defence,
      agility:                pet.stats.speed,
      evolutionState:         pet.evolution.state,
      evolutionMax:           pet.evolution.max,
      evolutionBonusPerStage: pet.evolution.bonus_per_stage,
      syncedAt:               new Date(),
    })
    .onConflictDoUpdate({
      target: [characterPets.userId, characterPets.characterHashedId],
      set: {
        petId:                  pet.id,
        name:                   pet.name,
        customName:             pet.custom_name ?? null,
        imageUrl:               pet.image_url ?? null,
        level:                  pet.level,
        quality:                pet.quality,
        attackPower:            pet.stats.strength,
        protection:             pet.stats.defence,
        agility:                pet.stats.speed,
        evolutionState:         pet.evolution.state,
        evolutionMax:           pet.evolution.max,
        evolutionBonusPerStage: pet.evolution.bonus_per_stage,
        syncedAt:               new Date(),
        // accuracy, maxStamina, movementSpeed, criticalChance, criticalDamage
        // are intentionally omitted — manual fields are never overwritten by sync
      },
    });

  return NextResponse.json({ ok: true, pet: { name: pet.name, level: pet.level, quality: pet.quality } });
}
