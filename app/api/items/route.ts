import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchCatalogItems } from "@/lib/services/items.service";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.toUpperCase();
  const q = searchParams.get("q")?.trim();
  const quality = searchParams.get("quality")?.toUpperCase();

  if (!type) return NextResponse.json({ error: "type is required" }, { status: 400 });

  const rows = await searchCatalogItems({ type, q, quality, limit: 30 });

  return NextResponse.json({ items: rows });
}
