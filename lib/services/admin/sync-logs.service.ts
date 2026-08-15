import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { syncJobLogs } from "@/lib/db/schema";
import type { SyncJobLogDetails } from "@/lib/db/schema";

export type SyncJobStatus = "started" | "progress" | "success" | "failed" | "skipped";

export type SyncJobLogRow = {
  id: string;
  job: string;
  status: string;
  message: string;
  details: SyncJobLogDetails | null;
  userId: string | null;
  createdAt: Date;
};

export async function recordSyncLog(input: {
  job: string;
  status: SyncJobStatus;
  message: string;
  details?: SyncJobLogDetails;
  userId?: string | null;
}) {
  try {
    await db.insert(syncJobLogs).values({
      id: randomUUID(),
      job: input.job,
      status: input.status,
      message: input.message,
      details: input.details,
      userId: input.userId ?? null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[sync-logs] failed to record sync log", error);
  }
}

export async function getRecentSyncLogs(params: {
  limit: number;
  job?: string;
}): Promise<SyncJobLogRow[]> {
  if (params.job) {
    return db
      .select()
      .from(syncJobLogs)
      .where(eq(syncJobLogs.job, params.job))
      .orderBy(desc(syncJobLogs.createdAt))
      .limit(params.limit);
  }

  return db
    .select()
    .from(syncJobLogs)
    .orderBy(desc(syncJobLogs.createdAt))
    .limit(params.limit);
}
