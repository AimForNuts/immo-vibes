import { getSourcesBucket } from "@/lib/storage/r2";

export type SyncSnapshotJob = "items" | "prices" | "recipes" | "inspect" | "dungeons";

type SyncSnapshotInput = {
  job: SyncSnapshotJob;
  source: "admin" | "cron";
  payload: unknown;
  createdAt?: Date;
  itemType?: string | null;
  page?: number | null;
  hashedId?: string | null;
  userId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export type SyncSnapshotResult = {
  bucket: "immo-web-suite-sources";
  key: string;
};

export async function storeSyncSnapshot(input: SyncSnapshotInput): Promise<SyncSnapshotResult> {
  const createdAt = input.createdAt ?? new Date();
  const key = buildSyncSnapshotKey({ ...input, createdAt });
  const body = JSON.stringify(
    {
      metadata: {
        job: input.job,
        source: input.source,
        itemType: input.itemType ?? null,
        page: input.page ?? null,
        hashedId: input.hashedId ?? null,
        userId: input.userId ?? null,
        createdAt: createdAt.toISOString(),
        ...(input.metadata ?? {}),
      },
      payload: input.payload,
    },
    null,
    2
  );

  await getSourcesBucket().put(key, body, {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
    },
    customMetadata: {
      job: input.job,
      source: input.source,
      ...(input.itemType ? { itemType: input.itemType } : {}),
      ...(input.hashedId ? { hashedId: input.hashedId } : {}),
    },
  });

  return { bucket: "immo-web-suite-sources", key };
}

export async function storeSyncSnapshotBestEffort(input: SyncSnapshotInput) {
  try {
    return await storeSyncSnapshot(input);
  } catch (error) {
    console.error(`[sync-r2-snapshots] failed to store ${input.job} snapshot`, error);
    return null;
  }
}

export function buildSyncSnapshotKey(input: Omit<SyncSnapshotInput, "payload"> & { createdAt: Date }) {
  const date = input.createdAt.toISOString();
  const day = date.slice(0, 10);
  const timestamp = date.replace(/[:.]/g, "-");
  const parts = [
    "sync",
    sanitizeSegment(input.job),
    sanitizeSegment(input.source),
    day,
    input.itemType ? sanitizeSegment(input.itemType) : null,
    input.page ? `page-${input.page}` : null,
    input.hashedId ? sanitizeSegment(input.hashedId) : null,
    `${timestamp}.json`,
  ].filter((part): part is string => Boolean(part));

  return parts.join("/");
}

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "") || "unknown";
}
