import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inspectItem } from "@/lib/idlemmo";

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
    const item = await inspectItem(id, token);
    return NextResponse.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("404") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
