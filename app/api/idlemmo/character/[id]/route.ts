import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCharacterInfo, getCharacterPets } from "@/lib/idlemmo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No API token" }, { status: 400 });

  const { id } = await params;

  try {
    const [char, pets] = await Promise.all([
      getCharacterInfo(id, token),
      getCharacterPets(id, token),
    ]);

    const equippedPet = pets.find((p) => p.equipped) ?? null;

    return NextResponse.json({
      hashed_id: char.hashed_id,
      name: char.name,
      class: char.class,
      skills: char.skills,
      stats: char.stats,
      equipped_pet: equippedPet
        ? {
            id: equippedPet.id,
            name: equippedPet.custom_name ?? equippedPet.name,
            level: equippedPet.level,
            quality: equippedPet.quality,
            image_url: equippedPet.image_url,
            stats: equippedPet.stats,
            evolution: equippedPet.evolution,
          }
        : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
