/**
 * E2E test: sync-recipes paginated inspect logic
 *
 * Validates that RECIPE items with NULL recipe_result_hashed_id can have
 * their recipe result fetched via /inspect, page-by-page (80 items/page).
 *
 * Run:
 *   node scripts/test-sync-recipes.mjs         # all pages
 *   node scripts/test-sync-recipes.mjs 2       # specific page
 *
 * TDD lifecycle:
 *   RED   — fails if any page times out or hits MAX_RETRIES
 *   GREEN — all pages complete: populated + skipped = total for that page
 */

import { neon } from "@neondatabase/serverless";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import { ts, tickingSleep } from "./test-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env.local") });

const BASE    = "https://api.idle-mmo.com";
const TOKEN   = process.env.IDLEMMO_TEST_TOKEN;
const DB_URL  = process.env.DATABASE_URL;

if (!TOKEN) { console.error("Missing IDLEMMO_TEST_TOKEN"); process.exit(1); }
if (!DB_URL) { console.error("Missing DATABASE_URL");       process.exit(1); }

const sql        = neon(DB_URL);
const reqHeaders = { Authorization: `Bearer ${TOKEN}`, "User-Agent": "ImmoWebSuite/1.0" };

const PAGE_SIZE           = 80;
const PER_PAGE_TIMEOUT_MS = 14 * 60 * 1000;
const MAX_RETRIES         = 10;


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

    state.rlRemaining = 0;
    const waitMs = Math.max(1000, state.rlResetAt * 1000 - Date.now() + 500);
    await tickingSleep(waitMs, `429 retry ${attempt + 1}/${MAX_RETRIES}`);
  }

  throw new Error(`Max retries (${MAX_RETRIES}) exceeded — API returning persistent 429`);
}

// ── Per-page test ──────────────────────────────────────────────────────────────

async function testPage(page, state) {
  const offset = (page - 1) * PAGE_SIZE;
  const rows   = await sql`
    SELECT hashed_id FROM items
    WHERE type = 'RECIPE' AND recipe_result_hashed_id IS NULL
    ORDER BY hashed_id
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `;

  if (rows.length === 0) return { populated: 0, skipped: 0, count: 0 };

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), PER_PAGE_TIMEOUT_MS);

  let populated = 0, skipped = 0;
  const errors = [];

  try {
    for (let i = 0; i < rows.length; i++) {
      const { hashed_id } = rows[i];
      const url = `${BASE}/v1/item/${hashed_id}/inspect`;
      console.log(`  ${ts()} [${offset + i + 1}] ${hashed_id}`);

      try {
        const res = await rateLimitedFetch(url, state, controller.signal);

        if (res.ok) {
          const data   = await res.json();
          const result = data.item?.recipe?.result?.hashed_item_id ?? null;
          if (result) {
            console.log(`    -> recipe_result=${result}`);
            populated++;
          } else {
            console.log(`    -> no recipe result in response`);
            skipped++;
          }
        } else {
          console.log(`    -> HTTP ${res.status}, skipping`);
          skipped++;
        }
      } catch (err) {
        if (controller.signal.aborted) throw err;
        console.log(`    -> ERROR: ${err.message}`);
        errors.push({ hashed_id, error: err.message });
        skipped++;
      }
    }
  } finally {
    clearTimeout(timer);
  }

  return { populated, skipped, count: rows.length, errors };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const pageArg    = process.argv[2] ? parseInt(process.argv[2], 10) : null;
const targetPage = Number.isInteger(pageArg) && pageArg > 0 ? pageArg : null;

const [{ n }]  = await sql`SELECT COUNT(*) as n FROM items WHERE type = 'RECIPE' AND recipe_result_hashed_id IS NULL`;
const total      = parseInt(n, 10);
const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

console.log(`RECIPE items needing recipe_result_hashed_id: ${total} (${totalPages} page(s) of ${PAGE_SIZE})`);

if (total === 0) {
  console.log("\nGREEN — all RECIPE items already have recipe_result_hashed_id.");
  process.exit(0);
}

const pages = targetPage ? [targetPage] : Array.from({ length: totalPages }, (_, i) => i + 1);
if (targetPage) console.log(`Running single-page debug: page ${targetPage}/${totalPages}`);

const state = { rlRemaining: null, rlResetAt: 0 };
let totalPopulated = 0, totalSkipped = 0, allErrors = [];

for (const page of pages) {
  console.log(`\n── Page ${page}/${totalPages} ── started ${ts()}`);
  const result = await testPage(page, state);
  totalPopulated += result.populated;
  totalSkipped   += result.skipped;
  if (result.errors) allErrors.push(...result.errors);

  const covered = result.populated + result.skipped;
  console.log(`  Page ${page} result: populated=${result.populated} skipped=${result.skipped} count=${result.count} — ${covered === result.count ? "OK" : "MISMATCH"}`);
}

console.log("\n── Summary ────────────────────────────────────────────────────────");
console.log(`  Tested pages: ${pages.join(", ")} of ${totalPages}`);
console.log(`  populated=${totalPopulated} skipped=${totalSkipped} errors=${allErrors.length}`);
if (allErrors.length > 0) {
  for (const e of allErrors.slice(0, 5)) console.log(`  ✗ ${e.hashed_id}: ${e.error}`);
}

if (allErrors.length > 0) {
  console.log("\nRED — fix before merging.");
  process.exit(1);
} else {
  console.log("\nGREEN — inspect calls working correctly.");
}
