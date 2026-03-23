import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { characterPets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCharacterInfo, getCharacterPets } from "@/lib/idlemmo";
import { randomUUID } from "crypto";

// ─── GET — return saved pet combat stats for this character ───────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: characterHashedId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      attackPower: characterPets.attackPower,
      protection:  characterPets.protection,
      agility:     characterPets.agility,
      accuracy:    characterPets.accuracy,
      name:        characterPets.name,
      level:       characterPets.level,
      quality:     characterPets.quality,
      imageUrl:    characterPets.imageUrl,
    })
    .from(characterPets)
    .where(
      and(
        eq(characterPets.userId, session.user.id),
        eq(characterPets.characterHashedId, characterHashedId)
      )
    )
    .limit(1);

  return NextResponse.json({ pet: rows[0] ?? null });
}

// ─── POST — save pet combat stats (upserts the row) ──────────────────────────

interface PostBody {
  attackPower: number;
  protection:  number;
  agility:     number;
  accuracy:    number;
  /** Basic pet identity — passed from the client to avoid an extra API call if we need to create the row. */
  pet: {
    id:       number;
    name:     string;
    level:    number;
    quality:  string;
    imageUrl: string | null;
  } | null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: characterHashedId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No IdleMMO token configured" }, { status: 400 });

  const body = (await req.json()) as PostBody;
  const { attackPower, protection, agility, accuracy, pet: clientPet } = body;

  // Check if a row already exists
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

  if (existing.length > 0) {
    // Update only combat stat columns
    await db
      .update(characterPets)
      .set({ attackPower, protection, agility, accuracy, syncedAt: new Date() })
      .where(eq(characterPets.id, existing[0].id));
  } else {
    // No row yet — resolve pet identity
    let petInfo = clientPet;

    if (!petInfo) {
      // Fallback: fetch from API
      try {
        const [char, pets] = await Promise.all([
          getCharacterInfo(characterHashedId, token),
          getCharacterPets(characterHashedId, token),
        ]);
        const equipped = pets.find((p) => p.equipped);
        if (equipped) {
          petInfo = { id: equipped.id, name: equipped.name, level: equipped.level, quality: equipped.quality, imageUrl: equipped.image_url ?? null };
        } else if (char.equipped_pet) {
          petInfo = { id: char.equipped_pet.id, name: char.equipped_pet.name, level: char.equipped_pet.level, quality: "STANDARD", imageUrl: char.equipped_pet.image_url ?? null };
        }
      } catch { /* leave petInfo null */ }
    }

    if (!petInfo) {
      return NextResponse.json({ error: "No equipped pet found — sync the pet first" }, { status: 404 });
    }

    await db.insert(characterPets).values({
      id:               randomUUID(),
      userId:           session.user.id,
      characterHashedId,
      petId:            petInfo.id,
      name:             petInfo.name,
      customName:       null,
      imageUrl:         petInfo.imageUrl,
      level:            petInfo.level,
      quality:          petInfo.quality,
      strength:         0,
      defence:          0,
      speed:            0,
      evolutionState:   0,
      evolutionMax:     5,
      evolutionBonusPerStage: 5,
      syncedAt:         new Date(),
      attackPower,
      protection,
      agility,
      accuracy,
    });
  }

  return NextResponse.json({ ok: true });
}
