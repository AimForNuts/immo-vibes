import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserIdlemmoToken,
  runEndpointAndObserve,
} from "@/lib/services/admin/api-inspector.service";
import { storeApiInspectorSnapshot } from "@/lib/services/admin/api-inspector-r2-snapshots.service";

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
    let snapshot: { bucket: string; key: string } | null = null;

    try {
      snapshot = await storeApiInspectorSnapshot({
        endpointKey: body.endpointKey,
        path: result.path,
        params: result.observation.params,
        statusCode: result.observation.statusCode,
        durationMs: result.observation.durationMs,
        observationId: result.observation.id,
        createdAt: result.observation.createdAt,
        createdByUserId: result.observation.createdByUserId,
        response: result.response,
        inferredSchema: result.inferredSchema,
        diff: result.diff,
      });
    } catch (error) {
      console.error("[api-inspector] failed to persist R2 snapshot", error);
    }

    return NextResponse.json({
      ...result,
      snapshot,
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
