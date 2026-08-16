import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import { syncState } from "@/lib/db/schema";

type D1Value = string | number | boolean | null;

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
};

type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
};

type SyncStateCloudflareEnv = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

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

function getSyncStateD1(): D1DatabaseBinding | null {
  try {
    return (getCloudflareContext().env as SyncStateCloudflareEnv).IMMO_SYNC_DB ?? null;
  } catch {
    return null;
  }
}

export async function getSyncStateJob(job: string): Promise<SyncStateJob | null> {
  const d1 = getSyncStateD1();
  if (d1) {
    const row = await d1
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

  const rows = await db
    .select()
    .from(syncState)
    .where(eq(syncState.job, job))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertSyncStateJob(input: SyncStateInput): Promise<void> {
  const d1 = getSyncStateD1();
  if (d1) {
    await d1
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
    return;
  }

  await db
    .insert(syncState)
    .values({
      job: input.job,
      status: input.status,
      currentTypeIndex: input.currentTypeIndex ?? 0,
      currentPage: input.currentPage ?? 1,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
    })
    .onConflictDoUpdate({
      target: syncState.job,
      set: {
        status: input.status,
        currentTypeIndex: input.currentTypeIndex ?? 0,
        currentPage: input.currentPage ?? 1,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
      },
    });
}
