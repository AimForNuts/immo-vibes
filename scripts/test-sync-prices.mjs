/**
 * E2E test: sync-prices paginated rate-limiting logic
 *
 * Validates that every item type in the DB can have market prices fetched
 * page-by-page (80 items per page) without hanging or infinite-looping.
 * Each page must complete within PER_PAGE_TIMEOUT_MS (Vercel's 300s limit).
 *
 * Run:
 *   node scripts/test-sync-prices.mjs              # all types, all pages
 *   node scripts/test-sync-prices.mjs DAGGER        # single type debug
 *   node scripts/test-sync-prices.mjs RECIPE 2      # specific page
 *
 * TDD lifecycle:
 *   RED   — fails if any page times out or hits MAX_RETRIES
 *   GREEN — all types/pages complete: synced + skipped = total for that page
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

const PAGE_SIZE          = 80;
const PER_PAGE_TIMEOUT_MS = 14 * 60 * 1000; // 14 min — generous for worst-case 80 items
const MAX_RETRIES        = 10;


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

async function testPage(type, page, state) {
  const offset = (page - 1) * PAGE_SIZE;
  const rows   = await sql`
    SELECT hashed_id FROM items
    WHERE type = ${type}
    ORDER BY hashed_id
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `;

  if (rows.length === 0) return { synced: 0, skipped: 0, count: 0 };

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), PER_PAGE_TIMEOUT_MS);

  let synced = 0, skipped = 0;
  const errors = [];

  try {
    for (let i = 0; i < rows.length; i++) {
      const { hashed_id } = rows[i];
      const url = `${BASE}/v1/item/${hashed_id}/market-history?tier=0&type=listings`;
      console.log(`  ${ts()} [${offset + i + 1}] ${hashed_id}`);

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

  return { synced, skipped, count: rows.length, errors };
}

// ── Per-type test ──────────────────────────────────────────────────────────────

async function testType(type, onlyPage = null) {
  const [{ n }] = await sql`SELECT COUNT(*) as n FROM items WHERE type = ${type}`;
  const total      = parseInt(n, 10);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pages = onlyPage ? [onlyPage] : Array.from({ length: totalPages }, (_, i) => i + 1);
  console.log(`\n[${type}] ${total} items — ${totalPages} page(s) — testing page(s): ${pages.join(", ")} — started ${ts()}`);

  if (total === 0) return { type, status: "skip", reason: "no items in DB" };

  const state  = { rlRemaining: null, rlResetAt: 0 }; // shared across pages
  let totalSynced = 0, totalSkipped = 0, allErrors = [];

  for (const page of pages) {
    console.log(`\n  -- Page ${page}/${totalPages} --`);
    const result = await testPage(type, page, state);
    totalSynced  += result.synced;
    totalSkipped += result.skipped;
    if (result.errors) allErrors.push(...result.errors);

    const covered = result.synced + result.skipped;
    console.log(`  Page ${page} result: synced=${result.synced} skipped=${result.skipped} count=${result.count} — ${covered === result.count ? "OK" : "MISMATCH"}`);
  }

  const ok = allErrors.length === 0;
  console.log(`\n  RESULT [${type}]: synced=${totalSynced} skipped=${totalSkipped} errors=${allErrors.length} — ${ok ? "PASS" : "FAIL"}`);
  if (allErrors.length > 0) {
    for (const e of allErrors.slice(0, 5)) console.log(`    ✗ ${e.hashed_id}: ${e.error}`);
  }

  return { type, status: ok ? "pass" : "fail", synced: totalSynced, skipped: totalSkipped, total, errors: allErrors };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const [typeArg, pageArg] = process.argv.slice(2);
const targetType = typeArg?.toUpperCase() ?? null;
const targetPage = pageArg ? parseInt(pageArg, 10) : null;

let ALL_TYPES;
if (targetType) {
  ALL_TYPES = [targetType];
  console.log(`Running single-type debug: ${targetType}${targetPage ? ` page ${targetPage}` : " (all pages)"}`);
} else {
  const typeRows = await sql`SELECT DISTINCT type FROM items ORDER BY type`;
  ALL_TYPES = typeRows.map((r) => r.type);
  console.log(`Testing ${ALL_TYPES.length} types (all pages, ${PAGE_SIZE} items/page)`);
}

const results = [];
for (const type of ALL_TYPES) {
  results.push(await testType(type, targetPage));
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
    console.log(`  ✗ ${r.type}: ${r.errors?.length ?? 0} errors`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${skippedCount} skipped`);

if (failed > 0) {
  console.log("\nRED — fix before merging.");
  process.exit(1);
} else {
  console.log("\nGREEN — all pages sync correctly.");
}
