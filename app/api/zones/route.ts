import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { zones } from "@/lib/db/schema";

/**
 * GET /api/zones
 *
 * Returns all zones ordered by level_required asc.
 * Admin-only — used by the ZonePickerModal in the market detail panel.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({ id: zones.id, name: zones.name })
    .from(zones)
    .orderBy(asc(zones.levelRequired));

  return NextResponse.json({ zones: rows });
}
