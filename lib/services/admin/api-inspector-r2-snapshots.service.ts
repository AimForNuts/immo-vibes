import { getSourcesBucket } from "@/lib/storage/r2";
import type { ApiInspectorDiff } from "@/lib/services/admin/api-inspector.service";

type ApiInspectorSnapshotInput = {
  endpointKey: string;
  path: string;
  params: Record<string, string | number | boolean>;
  statusCode: number;
  durationMs: number;
  observationId: string;
  createdAt: Date;
  createdByUserId: string | null;
  response: unknown;
  inferredSchema: unknown;
  diff: ApiInspectorDiff;
};

export type ApiInspectorSnapshotResult = {
  bucket: "immo-web-suite-sources";
  key: string;
};

export async function storeApiInspectorSnapshot(
  input: ApiInspectorSnapshotInput
): Promise<ApiInspectorSnapshotResult> {
  const key = buildApiInspectorSnapshotKey({
    endpointKey: input.endpointKey,
    observationId: input.observationId,
    createdAt: input.createdAt,
  });
  const body = JSON.stringify(
    {
      metadata: {
        endpointKey: input.endpointKey,
        path: input.path,
        params: input.params,
        statusCode: input.statusCode,
        durationMs: input.durationMs,
        observationId: input.observationId,
        createdAt: input.createdAt.toISOString(),
        createdByUserId: input.createdByUserId,
      },
      inferredSchema: input.inferredSchema,
      diff: input.diff,
      response: input.response,
    },
    null,
    2
  );

  await getSourcesBucket().put(key, body, {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
    },
    customMetadata: {
      endpointKey: input.endpointKey,
      observationId: input.observationId,
    },
  });

  return { bucket: "immo-web-suite-sources", key };
}

export function buildApiInspectorSnapshotKey(input: {
  endpointKey: string;
  observationId: string;
  createdAt: Date;
}) {
  const date = input.createdAt.toISOString();
  const day = date.slice(0, 10);
  const timestamp = date.replace(/[:.]/g, "-");
  const endpoint = input.endpointKey
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "") || "unknown-endpoint";

  return `api-inspector/${endpoint}/${day}/${timestamp}-${input.observationId}.json`;
}

