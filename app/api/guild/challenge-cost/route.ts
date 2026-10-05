import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseGuildChallengeCostInput } from "@/lib/domain/guild-challenge-cost";
import { calculateGuildChallengeCost } from "@/lib/services/guild-challenge-cost.service";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text : "";
  const parsed = parseGuildChallengeCostInput(text);

  if (parsed.lines.length === 0) {
    return NextResponse.json(
      { error: "Paste at least one item line.", parseErrors: parsed.errors },
      { status: 400 }
    );
  }

  const result = await calculateGuildChallengeCost(parsed.lines);
  return NextResponse.json({ ...result, parseErrors: parsed.errors });
}
