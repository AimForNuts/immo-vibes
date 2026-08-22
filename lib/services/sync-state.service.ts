import { getD1 } from "@/lib/db/d1";

export type SyncStateJob = {
  job: string;
  status: string;
  currentTypeIndex: number;
  currentPage: number;
  startedAt: Date | null;
  completedAt: Date | null;
};

type SyncStateInput = {
  job: string;
  status: string;
  currentTypeIndex?: number;
  currentPage?: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
};

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function parseDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

export async function getSyncStateJob(job: string): Promise<SyncStateJob | null> {
  const row = await getD1()
    .prepare(
      `SELECT job, status, current_type_index, current_page, started_at, completed_at
       FROM sync_state
       WHERE job = ?`
    )
    .bind(job)
    .first<{
      job: string;
      status: string;
      current_type_index: number;
      current_page: number;
      started_at: string | null;
      completed_at: string | null;
    }>();

  if (!row) return null;

  return {
    job: row.job,
    status: row.status,
    currentTypeIndex: row.current_type_index,
    currentPage: row.current_page,
    startedAt: parseDate(row.started_at),
    completedAt: parseDate(row.completed_at),
  };
}

export async function upsertSyncStateJob(input: SyncStateInput): Promise<void> {
  await getD1()
    .prepare(
      `INSERT INTO sync_state (
         job, status, current_type_index, current_page, started_at, completed_at
       )
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(job) DO UPDATE SET
         status = excluded.status,
         current_type_index = excluded.current_type_index,
         current_page = excluded.current_page,
         started_at = excluded.started_at,
         completed_at = excluded.completed_at`
    )
    .bind(
      input.job,
      input.status,
      input.currentTypeIndex ?? 0,
      input.currentPage ?? 1,
      serializeDate(input.startedAt),
      serializeDate(input.completedAt)
    )
    .run();
}
