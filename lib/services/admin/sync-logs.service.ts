import { randomUUID } from "crypto";
import { getD1 } from "@/lib/db/d1";
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

type SyncJobLogD1Row = {
  id: string;
  job: string;
  status: string;
  message: string;
  details: string | null;
  user_id: string | null;
  created_at: string;
};

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
    await getD1()
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
  } catch (error) {
    console.error("[sync-logs] failed to record sync log", error);
  }
}

export async function getRecentSyncLogs(params: {
  limit: number;
  job?: string;
}): Promise<SyncJobLogRow[]> {
  if (params.job) {
    const rows = await getD1()
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

  const rows = await getD1()
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
