import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { refreshCharacters } from "@/lib/services/character-cache";

/**
 * GET /api/characters
 *
 * Fetches fresh character data from the IdleMMO API, updates the DB cache,
 * and returns the full roster. Called in the background from the Overview
 * client component when the cached data is stale.
 *
 * Response: CachedCharacter[] (full roster fields)
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json([], { status: 401 });

  const token  = session.user.idlemmoToken;
  const charId = session.user.idlemmoCharacterId;
  if (!token || !charId) return NextResponse.json([]);

  const chars = await refreshCharacters(session.user.id, charId, token);

  return NextResponse.json(chars ?? []);
}
