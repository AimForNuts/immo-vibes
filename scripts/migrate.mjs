/**
 * Custom migration runner for Neon (HTTP-based, no WebSocket needed).
 *
 * Reads all .sql files from lib/db/migrations/, tracks applied migrations in
 * a __migrations table, and applies each pending one statement-by-statement.
 * Safe to run multiple times — already-applied migrations are skipped.
 * "Already exists" errors are warned and skipped so re-runs are safe.
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config({ path: ".env.local" });

const __dir = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dir, "../lib/db/migrations");

const sql = neon(process.env.DATABASE_URL);

// ── Ensure tracking table exists ─────────────────────────────────────────────

await sql`
  CREATE TABLE IF NOT EXISTS __migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

// ── Load applied migrations ───────────────────────────────────────────────────

const applied = new Set(
  (await sql`SELECT name FROM __migrations`).map((r) => r.name)
);

// ── Collect .sql files in order ───────────────────────────────────────────────

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// ── Apply pending migrations ──────────────────────────────────────────────────

let ran = 0;

for (const file of files) {
  if (applied.has(file)) {
    console.log(`  skip  ${file}`);
    continue;
  }

  const content = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

  // Split on drizzle breakpoints, then on semicolons
  const statements = content
    .split(/-->\s*statement-breakpoint/i)
    .flatMap((chunk) => chunk.split(";"))
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`  apply ${file} (${statements.length} statements)`);

  for (const stmt of statements) {
    try {
      await sql.query(stmt, []);
    } catch (err) {
      // Skip "already exists" errors so re-running is safe
      if (
        err.message?.includes("already exists") ||
        err.message?.includes("duplicate column")
      ) {
        console.log(`    warn: ${err.message.split("\n")[0]}`);
      } else {
        console.error(`    FAILED: ${stmt.slice(0, 120)}`);
        throw err;
      }
    }
  }

  await sql`INSERT INTO __migrations (name) VALUES (${file})`;
  ran++;
}

console.log(`\nDone — ${ran} migration(s) applied, ${applied.size} already up to date.`);
