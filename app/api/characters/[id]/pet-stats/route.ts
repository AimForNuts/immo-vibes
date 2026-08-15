import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { characterPets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

  const rows = await db
    .select()
    .from(characterPets)
    .where(
      and(
        eq(characterPets.userId, session.user.id),
        eq(characterPets.characterHashedId, characterHashedId)
      )
    )
    .limit(1);

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = rows[0];
  return NextResponse.json({
    attackPower:    r.attackPower,
    protection:     r.protection,
    agility:        r.agility,
    accuracy:       r.accuracy,
    maxStamina:     r.maxStamina,
    movementSpeed:  r.movementSpeed !== null ? Number(r.movementSpeed) : null,
    criticalChance: r.criticalChance,
    criticalDamage: r.criticalDamage,
    imageUrl:       r.imageUrl,
    quality:        r.quality,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: characterHashedId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Row must exist (user must sync first)
  const existing = await db
    .select({ id: characterPets.id })
    .from(characterPets)
    .where(
      and(
        eq(characterPets.userId, session.user.id),
        eq(characterPets.characterHashedId, characterHashedId)
      )
    )
    .limit(1);

  if (!existing[0]) {
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

  await db
    .update(characterPets)
    .set({
      ...(attackPower.data    !== undefined && attackPower.data    !== null && { attackPower:    attackPower.data    }),
      ...(protection.data     !== undefined && protection.data     !== null && { protection:     protection.data     }),
      ...(agility.data        !== undefined && agility.data        !== null && { agility:        agility.data        }),
      ...(accuracy.data       !== undefined && { accuracy:       accuracy.data       }),
      ...(maxStamina.data     !== undefined && { maxStamina:     maxStamina.data     }),
      ...(movementSpeed.data  !== undefined && { movementSpeed:  movementSpeed.data !== null ? String(movementSpeed.data) : null }),
      ...(criticalChance.data !== undefined && { criticalChance: criticalChance.data }),
      ...(criticalDamage.data !== undefined && { criticalDamage: criticalDamage.data }),
    })
    .where(
      and(
        eq(characterPets.userId, session.user.id),
        eq(characterPets.characterHashedId, characterHashedId)
      )
    );

  return NextResponse.json({ ok: true });
}
