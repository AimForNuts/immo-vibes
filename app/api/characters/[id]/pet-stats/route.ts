import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getStoredCharacterPet,
  updateStoredCharacterPetStats,
} from "@/lib/services/character-pets.service";
import {
  invalidRequest,
  parseNonNegativeIntegerField,
  parseNonNegativeNumberField,
  readJsonObject,
} from "@/lib/validation/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: characterHashedId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pet = await getStoredCharacterPet({ userId: session.user.id, characterHashedId });
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    attackPower: pet.attackPower,
    protection: pet.protection,
    agility: pet.agility,
    accuracy: pet.accuracy,
    maxStamina: pet.maxStamina,
    movementSpeed: pet.movementSpeed !== null ? Number(pet.movementSpeed) : null,
    criticalChance: pet.criticalChance,
    criticalDamage: pet.criticalDamage,
    imageUrl: pet.imageUrl,
    quality: pet.quality,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: characterHashedId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await getStoredCharacterPet({ userId: session.user.id, characterHashedId });
  if (!existing) {
    return NextResponse.json(
      { error: "No pet synced for this character. Use Sync Current Pet first." },
      { status: 404 }
    );
  }

  const body = await readJsonObject(req);
  if (!body.ok) return invalidRequest(body.message);

  const attackPower = parseNonNegativeIntegerField(body.data, "attackPower", { nullable: true });
  if (!attackPower.ok) return invalidRequest(attackPower.message);

  const protection = parseNonNegativeIntegerField(body.data, "protection", { nullable: true });
  if (!protection.ok) return invalidRequest(protection.message);

  const agility = parseNonNegativeIntegerField(body.data, "agility", { nullable: true });
  if (!agility.ok) return invalidRequest(agility.message);

  const accuracy = parseNonNegativeIntegerField(body.data, "accuracy", { nullable: true });
  if (!accuracy.ok) return invalidRequest(accuracy.message);

  const maxStamina = parseNonNegativeIntegerField(body.data, "maxStamina", { nullable: true });
  if (!maxStamina.ok) return invalidRequest(maxStamina.message);

  const movementSpeed = parseNonNegativeNumberField(body.data, "movementSpeed", { nullable: true });
  if (!movementSpeed.ok) return invalidRequest(movementSpeed.message);

  const criticalChance = parseNonNegativeIntegerField(body.data, "criticalChance", { nullable: true });
  if (!criticalChance.ok) return invalidRequest(criticalChance.message);

  const criticalDamage = parseNonNegativeIntegerField(body.data, "criticalDamage", { nullable: true });
  if (!criticalDamage.ok) return invalidRequest(criticalDamage.message);

  await updateStoredCharacterPetStats({
    userId: session.user.id,
    characterHashedId,
    attackPower: attackPower.data,
    protection: protection.data,
    agility: agility.data,
    accuracy: accuracy.data,
    maxStamina: maxStamina.data,
    movementSpeed: movementSpeed.data,
    criticalChance: criticalChance.data,
    criticalDamage: criticalDamage.data,
  });

  return NextResponse.json({ ok: true });
}
