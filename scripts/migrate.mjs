/**
 * Custom migration runner for Neon (HTTP-based, no WebSocket needed).
 *
 * Reads all .sql files from lib/db/migrations/, tracks applied migrations in
 * a __migrations table, and applies each pending one statement-by-statement.
 * Safe to run multiple times: already-applied migrations are skipped.
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

await sql`
  CREATE TABLE IF NOT EXISTS __migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const applied = new Set(
  (await sql`SELECT name FROM __migrations`).map((r) => r.name)
);

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let ran = 0;

for (const file of files) {
  if (applied.has(file)) {
    console.log(`  skip  ${file}`);
    continue;
  }

  const content = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

  const statements = content
    .split(/-->\s*statement-breakpoint/i)
    .flatMap(splitSqlStatements)
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`  apply ${file} (${statements.length} statements)`);

  for (const stmt of statements) {
    try {
      await sql.query(stmt, []);
    } catch (err) {
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

console.log(`\nDone: ${ran} migration(s) applied, ${applied.size} already up to date.`);

function splitSqlStatements(sqlText) {
  const statements = [];
  let current = "";
  let singleQuoted = false;
  let doubleQuoted = false;
  let lineComment = false;
  let blockComment = false;
  let dollarQuote = null;

  for (let i = 0; i < sqlText.length; i++) {
    const char = sqlText[i];
    const next = sqlText[i + 1];

    current += char;

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        current += next;
        i++;
        blockComment = false;
      }
      continue;
    }

    if (singleQuoted) {
      if (char === "'" && next === "'") {
        current += next;
        i++;
      } else if (char === "'") {
        singleQuoted = false;
      }
      continue;
    }

    if (doubleQuoted) {
      if (char === '"' && next === '"') {
        current += next;
        i++;
      } else if (char === '"') {
        doubleQuoted = false;
      }
      continue;
    }

    if (dollarQuote) {
      if (sqlText.startsWith(dollarQuote, i)) {
        current += sqlText.slice(i + 1, i + dollarQuote.length);
        i += dollarQuote.length - 1;
        dollarQuote = null;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      current += next;
      i++;
      lineComment = true;
      continue;
    }

    if (char === "/" && next === "*") {
      current += next;
      i++;
      blockComment = true;
      continue;
    }

    if (char === "'") {
      singleQuoted = true;
      continue;
    }

    if (char === '"') {
      doubleQuoted = true;
      continue;
    }

    if (char === "$") {
      const match = sqlText.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        current += match[0].slice(1);
        i += match[0].length - 1;
        dollarQuote = match[0];
      }
      continue;
    }

    if (char === ";") {
      statements.push(current.slice(0, -1));
      current = "";
    }
  }

  if (current.trim()) statements.push(current);
  return statements;
}
