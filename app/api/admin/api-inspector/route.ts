import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApiInspectorState } from "@/lib/services/admin/api-inspector.service";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const state = await getApiInspectorState();

  return NextResponse.json({
    specs: state.specs.map((spec) => ({
      ...spec,
      createdAt: spec.createdAt.toISOString(),
      updatedAt: spec.updatedAt.toISOString(),
    })),
    schemas: state.schemas.map((schema) => ({
      ...schema,
      lastSeenAt: schema.lastSeenAt?.toISOString() ?? null,
      updatedAt: schema.updatedAt.toISOString(),
    })),
    observations: state.observations.map((observation) => ({
      ...observation,
      createdAt: observation.createdAt.toISOString(),
    })),
  });
}
