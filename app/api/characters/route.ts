import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCachedCharacters } from "@/lib/services/character-cache";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json([], { status: 401 });

  const token  = session.user.idlemmoToken;
  const charId = session.user.idlemmoCharacterId;
  if (!token || !charId) return NextResponse.json([]);

  const chars = await getCachedCharacters(session.user.id, charId, token);

  return NextResponse.json(
    chars.map((c) => ({ hashed_id: c.hashedId, name: c.name, image_url: c.imageUrl }))
  );
}
