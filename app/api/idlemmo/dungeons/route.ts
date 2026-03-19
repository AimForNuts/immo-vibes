import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDungeons } from "@/lib/idlemmo";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No API token" }, { status: 400 });

  try {
    const dungeons = await getDungeons(token);
    return NextResponse.json({ dungeons });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
