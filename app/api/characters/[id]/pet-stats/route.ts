import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { characterPets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

  const body = await req.json() as {
    attackPower?: number | null;
    protection?: number | null;
    agility?: number | null;
    accuracy?: number | null;
    maxStamina?: number | null;
    movementSpeed?: number | null;
    criticalChance?: number | null;
    criticalDamage?: number | null;
  };

  const updates: Record<string, any> = {};
  if (body.attackPower !== undefined) updates.attackPower = body.attackPower;
  if (body.protection !== undefined) updates.protection = body.protection;
  if (body.agility !== undefined) updates.agility = body.agility;
  if (body.accuracy !== undefined) updates.accuracy = body.accuracy;
  if (body.maxStamina !== undefined) updates.maxStamina = body.maxStamina;
  if (body.movementSpeed !== undefined) updates.movementSpeed = body.movementSpeed !== null ? String(body.movementSpeed) : null;
  if (body.criticalChance !== undefined) updates.criticalChance = body.criticalChance;
  if (body.criticalDamage !== undefined) updates.criticalDamage = body.criticalDamage;

  await db
    .update(characterPets)
    .set(updates)
    .where(
      and(
        eq(characterPets.userId, session.user.id),
        eq(characterPets.characterHashedId, characterHashedId)
      )
    );

  return NextResponse.json({ ok: true });
}
