/**
 * Shared test setup for integration tests.
 *
 * Exports:
 *  - TOKEN / BASE          — API credentials and base URL from .env.local
 *  - delay / RATE_DELAY    — rate-limit helpers
 *  - apiGet                — raw fetch helper (bypasses idlemmo.ts wrappers)
 *  - resolveCharId         — resolves the test character ID from the DB
 *
 * Usage: import what you need in each *.api.test.ts file. Call
 * resolveCharId() inside a beforeAll() in any test that needs CHAR_ID.
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

export const TOKEN = process.env.IDLEMMO_TEST_TOKEN ?? "";
export const BASE = "https://api.idle-mmo.com";

/** Milliseconds to wait between API calls to stay under the IdleMMO rate limit. */
export const RATE_DELAY = 1500;

/** Wait for `ms` milliseconds. */
export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Raw API GET helper — bypasses the idlemmo.ts wrappers so tests can probe
 * endpoint shapes and error responses directly.
 */
export async function apiGet(path: string) {
  await delay(400);
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, "User-Agent": "ImmoWebSuite/1.0" },
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

/**
 * Resolves the test character ID from the database.
 *
 * Matches the IDLEMMO_TEST_TOKEN env var to the stored idlemmo_character_id
 * for that user — no hardcoded character ID needed.
 *
 * Throws if TOKEN or DATABASE_URL are missing, or if no matching user is found.
 */
export async function resolveCharId(): Promise<string> {
  if (!TOKEN) throw new Error("IDLEMMO_TEST_TOKEN not set in .env.local");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set in .env.local");

  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT idlemmo_character_id FROM "user"
    WHERE idlemmo_token = ${TOKEN} AND idlemmo_character_id IS NOT NULL
    LIMIT 1
  `;
  if (rows.length === 0) throw new Error("No user found in DB with this token + character ID");
  return rows[0].idlemmo_character_id as string;
}
