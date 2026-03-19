import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCharacterInfo } from "@/lib/idlemmo";

/**
 * Debug endpoint — returns the full character object with all skills/stats keys.
 * Visit /api/idlemmo/character/raw to inspect what the API actually returns.
 * Uses the session's configured character ID.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.user.idlemmoToken;
  const charId = session.user.idlemmoCharacterId;
  if (!token) return NextResponse.json({ error: "No API token configured" }, { status: 400 });
  if (!charId) return NextResponse.json({ error: "No character ID configured" }, { status: 400 });

  try {
    const char = await getCharacterInfo(charId, token);
    return NextResponse.json({
      _debug: {
        skillKeys: Object.keys(char.skills ?? {}),
        statKeys: Object.keys(char.stats ?? {}),
        skillValues: char.skills,
        statValues: char.stats,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
