import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminZones, createZone, getAllZones } from "@/lib/services/admin/zones.service";
import {
  invalidRequest,
  parseNonNegativeIntegerField,
  parseStringField,
  readJsonObject,
} from "@/lib/validation/api";

async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Slim mode: returns all zones as [{id, name}] for dropdowns (e.g. ZonePickerModal)
  if (request.nextUrl.searchParams.get("slim") === "true") {
    const allZones = await getAllZones();
    return NextResponse.json({ zones: allZones });
  }

  const { searchParams } = request.nextUrl;
  const rawPage     = Number(searchParams.get("page") ?? 1);
  const rawPageSize = Number(searchParams.get("pageSize") ?? 25);
  const page     = isNaN(rawPage)     ? 1  : Math.max(1, rawPage);
  const pageSize = isNaN(rawPageSize) ? 25 : Math.min(100, Math.max(1, rawPageSize));
  const name     = searchParams.get("name") ?? undefined;

  return NextResponse.json(await getAdminZones({ page, pageSize, name }));
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await readJsonObject(request);
  if (!body.ok) return invalidRequest(body.message);

  const name = parseStringField(body.data, "name", { required: true });
  if (!name.ok) return invalidRequest(name.message);

  const levelRequired = parseNonNegativeIntegerField(body.data, "levelRequired", { required: true });
  if (!levelRequired.ok) return invalidRequest(levelRequired.message);
  if (name.data === undefined || levelRequired.data === undefined || levelRequired.data === null) {
    return invalidRequest("name and levelRequired are required");
  }

  const zone = await createZone({ name: name.data, levelRequired: levelRequired.data });
  return NextResponse.json(zone, { status: 201 });
}
