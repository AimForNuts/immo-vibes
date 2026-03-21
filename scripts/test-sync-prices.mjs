/**
 * E2E test: sync-prices rate-limiting logic
 *
 * Validates that every item type with DB entries can have market prices
 * fetched from the IdleMMO API without hanging or infinite-looping.
 *
 * Run: node scripts/test-sync-prices.mjs [TYPE]
 *
 * Examples:
 *   node scripts/test-sync-prices.mjs           # all types
 *   node scripts/test-sync-prices.mjs DAGGER    # single type (fast debug)
 *   node scripts/test-sync-prices.mjs CHEST     # just the problematic one
 *
 * TDD lifecycle:
 *   RED   — fails if any type times out (> PER_TYPE_TIMEOUT_MS) or hits MAX_RETRIES
 *   GREEN — all types complete: synced + skipped = total
 */

import { neon } from "@neondatabase/serverless";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env.local") });

const BASE    = "https://api.idle-mmo.com";
const TOKEN   = process.env.IDLEMMO_TEST_TOKEN;
const DB_URL  = process.env.DATABASE_URL;

if (!TOKEN) { console.error("Missing IDLEMMO_TEST_TOKEN"); process.exit(1); }
if (!DB_URL) { console.error("Missing DATABASE_URL");       process.exit(1); }

const sql        = neon(DB_URL);
const reqHeaders = { Authorization: `Bearer ${TOKEN}`, "User-Agent": "ImmoWebSuite/1.0" };

/** Maximum time allowed per item type (ms). Exceeding = RED. */
const PER_TYPE_TIMEOUT_MS = 15 * 60 * 1000; // 15 min
/** Maximum 429 retries per URL before giving up (prevents infinite loops). */
const MAX_RETRIES = 10;
/**
 * Max items to test per type when running the full suite.
 * Verifies logic is correct without exhausting large types (e.g. RECIPE ~380 items).
 * Pass a specific TYPE argument to test all items for that type.
 */
const SAMPLE_LIMIT = 50;

function ts() {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

/**
 * Sleep for waitMs, printing a countdown tick every TICK_INTERVAL_MS.
 * Prevents silent gaps that look like hangs.
 */
const TICK_INTERVAL_MS = 5000;
async function tickingSleep(waitMs, label) {
  const deadline = Date.now() + waitMs;
  console.log(`  ${ts()} [wait] ${label} — ${(waitMs / 1000).toFixed(1)}s`);
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const tick = Math.min(TICK_INTERVAL_MS, remaining);
    await new Promise((r) => setTimeout(r, tick));
    const left = deadline - Date.now();
    if (left > 500) console.log(`  ${ts()} [wait] ...${(left / 1000).toFixed(0)}s remaining`);
  }
  console.log(`  ${ts()} [wait] resuming`);
}

// ── Rate-limited fetch (iterative, not recursive) ─────────────────────────────

async function rateLimitedFetch(url, state, signal) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (state.rlRemaining !== null && state.rlRemaining <= 0) {
      const waitMs = Math.max(1000, state.rlResetAt * 1000 - Date.now() + 500);
      await tickingSleep(waitMs, `rate-limit window reset (remaining=${state.rlRemaining})`);
    }

    if (signal?.aborted) throw new Error("Timeout abort");

    const t0  = Date.now();
    const res = await fetch(url, { headers: reqHeaders, signal });
    const elapsed = Date.now() - t0;

    const rem = res.headers.get("x-ratelimit-remaining");
    const rst = res.headers.get("x-ratelimit-reset");
    if (rem !== null) state.rlRemaining = parseInt(rem, 10);
    if (rst !== null) state.rlResetAt   = parseInt(rst, 10);

    if (res.status !== 429) {
      console.log(`  ${ts()} HTTP ${res.status} (${elapsed}ms) | rl-remaining=${rem ?? "?"} rl-reset=${rst ?? "?"}`);
      return res;
    }

    // 429 — wait and retry
    state.rlRemaining = 0;
    const waitMs = Math.max(1000, state.rlResetAt * 1000 - Date.now() + 500);
    await tickingSleep(waitMs, `429 retry ${attempt + 1}/${MAX_RETRIES}`);
  }

  throw new Error(`Max retries (${MAX_RETRIES}) exceeded — API returning persistent 429`);
}

// ── Per-type test ─────────────────────────────────────────────────────────────

async function testType(type, sampleLimit = null) {
  const allRows = await sql`SELECT hashed_id, recipe_result_hashed_id FROM items WHERE type = ${type}`;
  const rows    = sampleLimit ? allRows.slice(0, sampleLimit) : allRows;
  const sampled = rows.length < allRows.length;
  console.log(`\n[${type}] ${rows.length}${sampled ? ` of ${allRows.length}` : ""} items — started ${ts()}`);

  if (rows.length === 0) {
    return { type, status: "skip", reason: "no items in DB" };
  }

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), PER_TYPE_TIMEOUT_MS);
  const state      = { rlRemaining: null, rlResetAt: 0 };

  let synced  = 0;
  let skipped = 0;
  const errors = [];

  try {
    for (let i = 0; i < rows.length; i++) {
      const { hashed_id, recipe_result_hashed_id } = rows[i];
      const url = `${BASE}/v1/item/${hashed_id}/market-history?tier=0&type=listings`;
      console.log(`  ${ts()} [${i + 1}/${rows.length}] ${hashed_id}`);

      try {
        const res = await rateLimitedFetch(url, state, controller.signal);

        if (res.ok) {
          const data   = await res.json();
          const latest = Array.isArray(data.latest_sold) && data.latest_sold.length > 0
            ? data.latest_sold[0] : null;

          if (latest?.price_per_item) {
            console.log(`    -> price=${latest.price_per_item} sold_at=${latest.sold_at}`);
            synced++;
          } else {
            console.log(`    -> no price data`);
            skipped++;
          }
        } else {
          console.log(`    -> non-OK status ${res.status}, skipping`);
          skipped++;
        }

        // RECIPE: inspect to verify recipe_result_hashed_id (skip if already known)
        if (type === "RECIPE" && !recipe_result_hashed_id) {
          const inspectUrl = `${BASE}/v1/item/${hashed_id}/inspect`;
          const inspectRes = await rateLimitedFetch(inspectUrl, state, controller.signal);
          const resultId   = inspectRes.ok
            ? (await inspectRes.json()).item?.recipe?.result?.hashed_item_id ?? null
            : null;
          console.log(`    -> inspect recipe_result=${resultId ?? "none"}`);
        }
      } catch (err) {
        if (controller.signal.aborted) throw err;
        console.log(`    -> ERROR: ${err.message}`);
        errors.push({ hashed_id, error: err.message });
        skipped++;
      }
    }

    clearTimeout(timer);

    const total   = rows.length;
    const covered = synced + skipped;
    const ok      = covered === total && errors.length === 0;

    console.log(`\n  RESULT: synced=${synced} skipped=${skipped} errors=${errors.length} total=${total} — ${ok ? "PASS" : "FAIL"}`);
    if (errors.length > 0) {
      for (const e of errors.slice(0, 5)) console.log(`    ✗ ${e.hashed_id}: ${e.error}`);
    }

    return { type, status: ok ? "pass" : "fail", synced, skipped, total, errors };
  } catch (err) {
    clearTimeout(timer);
    const reason = controller.signal.aborted
      ? `TIMEOUT after ${PER_TYPE_TIMEOUT_MS / 1000}s`
      : err.message;
    console.log(`\n  RESULT: FAIL — ${reason}`);
    return { type, status: "fail", error: reason };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const typeArg = process.argv[2]?.toUpperCase();

let ALL_TYPES;
if (typeArg) {
  ALL_TYPES = [typeArg];
  console.log(`Running single-type debug: ${typeArg}`);
} else {
  const typeRows = await sql`SELECT DISTINCT type FROM items ORDER BY type`;
  ALL_TYPES = typeRows.map((r) => r.type);
  console.log(`Testing ${ALL_TYPES.length} types: ${ALL_TYPES.join(", ")}`);
}

const results = [];
for (const type of ALL_TYPES) {
  // Single-type arg: test all items. Full suite: cap at SAMPLE_LIMIT to keep runtime sane.
  results.push(await testType(type, typeArg ? null : SAMPLE_LIMIT));
}

console.log("\n── Summary ────────────────────────────────────────────────────────");
let passed = 0, failed = 0, skippedCount = 0;
for (const r of results) {
  if (r.status === "pass") {
    console.log(`  ✓ ${r.type}: ${r.synced}/${r.total} synced`);
    passed++;
  } else if (r.status === "skip") {
    console.log(`  - ${r.type}: ${r.reason}`);
    skippedCount++;
  } else {
    console.log(`  ✗ ${r.type}: ${r.error ?? `${r.errors?.length} item errors`}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${skippedCount} skipped`);

if (failed > 0) {
  console.log("\nRED — fix the sync-prices route before merging.");
  process.exit(1);
} else {
  console.log("\nGREEN — all types sync correctly.");
}
