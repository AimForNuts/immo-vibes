import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getResponseSchema,
  mergeSchemas,
  saveResponseSchema,
  updateEndpointSpecConfig,
} from "@/lib/services/admin/api-inspector.service";
import type { ApiInspectorSchema, ApiInspectorSpecConfig } from "@/lib/db/schema";

export async function PATCH(request: Request) {
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

  if (!isRecord(body) || typeof body.endpointKey !== "string" || typeof body.action !== "string") {
    return NextResponse.json({ error: "endpointKey and action are required" }, { status: 400 });
  }

  try {
    if (body.action === "save-spec") {
      if (!isSpecConfig(body.config)) {
        return NextResponse.json({ error: "Valid config is required" }, { status: 400 });
      }
      try {
        const spec = await updateEndpointSpecConfig(body.endpointKey, body.config);
        return NextResponse.json({ spec, persistenceAvailable: true });
      } catch {
        return NextResponse.json({
          spec: null,
          persistenceAvailable: false,
          message: "API inspector database tables are not available yet, so this endpoint config was not saved.",
        });
      }
    }

    if (body.action === "save" || body.action === "override") {
      if (!("schema" in body)) {
        return NextResponse.json({ error: "schema is required" }, { status: 400 });
      }
      const result = await saveResponseSchema({
        endpointKey: body.endpointKey,
        userId: session.user.id,
        activeSchema: body.schema as ApiInspectorSchema,
        manualSchema: body.action === "override" ? body.schema as ApiInspectorSchema : undefined,
        deprecatedFields: stringArray(body.deprecatedFields),
      });
      return NextResponse.json({
        ...result,
        schema: serializeSchemaRow(result.schema),
      });
    }

    if (body.action === "merge") {
      if (!("schema" in body)) {
        return NextResponse.json({ error: "schema is required" }, { status: 400 });
      }
      const current = await getResponseSchema(body.endpointKey);
      const merged = mergeSchemas(current?.activeSchema ?? null, body.schema as ApiInspectorSchema);
      const result = await saveResponseSchema({
        endpointKey: body.endpointKey,
        userId: session.user.id,
        activeSchema: merged,
        inferredSchema: body.schema as ApiInspectorSchema,
        deprecatedFields: current?.deprecatedFields ?? [],
      });
      return NextResponse.json({
        ...result,
        schema: serializeSchemaRow(result.schema),
      });
    }

    if (body.action === "deprecate") {
      const current = await getResponseSchema(body.endpointKey);
      if (!current?.activeSchema) {
        return NextResponse.json({ error: "No active schema exists for this endpoint" }, { status: 400 });
      }
      const deprecatedFields = Array.from(new Set([
        ...(current.deprecatedFields ?? []),
        ...stringArray(body.fields),
      ]));
      const result = await saveResponseSchema({
        endpointKey: body.endpointKey,
        userId: session.user.id,
        activeSchema: current.activeSchema,
        manualSchema: current.manualSchema,
        inferredSchema: current.inferredSchema,
        deprecatedFields,
      });
      return NextResponse.json({
        ...result,
        schema: serializeSchemaRow(result.schema),
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update schema" },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

function serializeSchemaRow<T extends { lastSeenAt: Date | null; updatedAt: Date }>(schema: T) {
  return {
    ...schema,
    lastSeenAt: schema.lastSeenAt?.toISOString() ?? null,
    updatedAt: schema.updatedAt.toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isSpecConfig(value: unknown): value is ApiInspectorSpecConfig {
  if (!isRecord(value)) return false;
  return (
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    value.method === "GET" &&
    typeof value.pathTemplate === "string" &&
    Array.isArray(value.params)
  );
}
