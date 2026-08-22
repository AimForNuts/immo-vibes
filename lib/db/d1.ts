import { getCloudflareContext } from "@opennextjs/cloudflare";

export type D1Value = string | number | boolean | null;

export type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ meta?: { last_row_id?: number } }>;
};

export type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
};

type CloudflareD1Env = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

export function getD1(): D1DatabaseBinding {
  const d1 = (getCloudflareContext().env as CloudflareD1Env).IMMO_SYNC_DB;
  if (!d1) {
    throw new Error("Cloudflare D1 binding IMMO_SYNC_DB is not configured.");
  }
  return d1;
}
