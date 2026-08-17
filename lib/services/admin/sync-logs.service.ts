import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
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

type D1Value = string | number | boolean | null;

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};

type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
};

type SyncLogsCloudflareEnv = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

type SyncJobLogD1Row = {
  id: string;
  job: string;
  status: string;
  message: string;
  details: string | null;
  user_id: string | null;
  created_at: string;
};

function getSyncLogsD1(): D1DatabaseBinding | null {
  try {
    return (getCloudflareContext().env as SyncLogsCloudflareEnv).IMMO_SYNC_DB ?? null;
  } catch {
    return null;
  }
}

function serializeDetails(details: SyncJobLogDetails | undefined): string | null {
  return details === undefined ? null : JSON.stringify(details);
}

function parseDetails(details: string | null): SyncJobLogDetails | null {
  if (!details) return null;

  try {
    const parsed = JSON.parse(details);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as SyncJobLogDetails)
      : { value: parsed };
  } catch {
    return { raw: details };
  }
}

function mapD1Row(row: SyncJobLogD1Row): SyncJobLogRow {
  return {
    id: row.id,
    job: row.job,
    status: row.status,
    message: row.message,
    details: parseDetails(row.details),
    userId: row.user_id,
    createdAt: new Date(row.created_at),
  };
}

export async function recordSyncLog(input: {
  job: string;
  status: SyncJobStatus;
  message: string;
  details?: SyncJobLogDetails;
  userId?: string | null;
}) {
  try {
    const d1 = getSyncLogsD1();
    if (d1) {
      await d1
        .prepare(
          `INSERT INTO sync_job_logs (
             id, job, status, message, details, user_id, created_at
           )
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          randomUUID(),
          input.job,
          input.status,
          input.message,
          serializeDetails(input.details),
          input.userId ?? null,
          new Date().toISOString()
        )
        .run();
      return;
    }

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
  const d1 = getSyncLogsD1();
  if (d1) {
    if (params.job) {
      const rows = await d1
        .prepare(
          `SELECT id, job, status, message, details, user_id, created_at
           FROM sync_job_logs
           WHERE job = ?
           ORDER BY created_at DESC
           LIMIT ?`
        )
        .bind(params.job, params.limit)
        .all<SyncJobLogD1Row>();

      return rows.results.map(mapD1Row);
    }

    const rows = await d1
      .prepare(
        `SELECT id, job, status, message, details, user_id, created_at
         FROM sync_job_logs
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(params.limit)
      .all<SyncJobLogD1Row>();

    return rows.results.map(mapD1Row);
  }

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
