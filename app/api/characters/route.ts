import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCharacterInfo, getAltCharacters } from "@/lib/idlemmo";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json([], { status: 401 });

  const token  = session.user.idlemmoToken;
  const charId = session.user.idlemmoCharacterId;
  if (!token || !charId) return NextResponse.json([]);

  try {
    const [primary, alts] = await Promise.all([
      getCharacterInfo(charId, token),
      getAltCharacters(charId, token),
    ]);

    const chars = [
      { hashed_id: primary.hashed_id, name: primary.name, image_url: primary.image_url },
      ...alts.map((a) => ({ hashed_id: a.hashed_id, name: a.name, image_url: a.image_url })),
    ].slice(0, 5);

    return NextResponse.json(chars);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
