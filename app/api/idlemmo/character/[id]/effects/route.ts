import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCharacterEffects } from "@/lib/idlemmo";
import { forwardIdleMmoRateLimitSnapshot, getIdleMmoRateLimitSnapshot } from "@/lib/idlemmo-rate-limit";

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
    const effects = await getCharacterEffects(id, token);
    const response = NextResponse.json({ effects });
    forwardIdleMmoRateLimitSnapshot(await getIdleMmoRateLimitSnapshot(token), response);
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
