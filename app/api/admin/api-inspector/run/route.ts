import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserIdlemmoToken,
  runEndpointAndObserve,
} from "@/lib/services/admin/api-inspector.service";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.endpointKey !== "string" || !isRecord(body.params)) {
    return NextResponse.json({ error: "endpointKey and params are required" }, { status: 400 });
  }

  const token = await getUserIdlemmoToken(session.user.id);
  if (!token) {
    return NextResponse.json({ error: "Admin IdleMMO token is not configured" }, { status: 400 });
  }

  try {
    const result = await runEndpointAndObserve({
      endpointKey: body.endpointKey,
      params: body.params,
      userId: session.user.id,
      token,
    });

    return NextResponse.json({
      ...result,
      observation: {
        ...result.observation,
        createdAt: result.observation.createdAt.toISOString(),
      },
      currentSchema: result.currentSchema
        ? {
            ...result.currentSchema,
            lastSeenAt: result.currentSchema.lastSeenAt?.toISOString() ?? null,
            updatedAt: result.currentSchema.updatedAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run endpoint" },
      { status: 400 }
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
