import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCharacterPets, type CharacterPet } from "@/lib/idlemmo";
import { db } from "@/lib/db";
import { characterPets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

  // Upsert: delete existing row for this (user, character) then insert fresh.
  // Drizzle's onConflictDoUpdate requires a unique constraint target which is a composite index,
  // so we use delete + insert for clarity.
  await db
    .delete(characterPets)
    .where(
      and(
        eq(characterPets.userId, session.user.id),
        eq(characterPets.characterHashedId, characterHashedId)
      )
    );

  await db.insert(characterPets).values({
    id:                     randomUUID(),
    userId:                 session.user.id,
    characterHashedId,
    petId:                  pet.id,
    name:                   pet.name,
    customName:             pet.custom_name ?? null,
    imageUrl:               pet.image_url ?? null,
    level:                  pet.level,
    quality:                pet.quality,
    strength:               pet.stats.strength,
    defence:                pet.stats.defence,
    speed:                  pet.stats.speed,
    evolutionState:         pet.evolution.state,
    evolutionMax:           pet.evolution.max,
    evolutionBonusPerStage: pet.evolution.bonus_per_stage,
    syncedAt:               new Date(),
  });

  return NextResponse.json({ ok: true, pet: { name: pet.name, level: pet.level, quality: pet.quality } });
}
