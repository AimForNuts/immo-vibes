import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCharacterInfo } from "@/lib/idlemmo";

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
    const char = await getCharacterInfo(id, token);
    // Return only what the gear calculator needs
    return NextResponse.json({
      hashed_id: char.hashed_id,
      name: char.name,
      stats: char.stats,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
