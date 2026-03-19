/**
 * Integration tests for the IdleMMO API.
 *
 * Requires in .env.local:
 *   IDLEMMO_TEST_TOKEN=<your API token>
 *   IDLEMMO_TEST_CHARACTER_ID=<hashed character ID>  (optional — skip character tests if absent)
 *
 * Run with: npm test
 */

import { config } from "dotenv";
import { describe, it, expect, beforeAll } from "vitest";
import {
  getCharacterInfo,
  getAltCharacters,
  getDungeons,
  searchItemsByType,
  inspectItem,
} from "@/lib/idlemmo";

config({ path: ".env.local" });

const TOKEN = process.env.IDLEMMO_TEST_TOKEN ?? "";
const CHAR_ID = process.env.IDLEMMO_TEST_CHARACTER_ID ?? "";

beforeAll(() => {
  if (!TOKEN) throw new Error("IDLEMMO_TEST_TOKEN not set in .env.local");
});

// ─── Character ────────────────────────────────────────────────────────────────

describe.skipIf(!CHAR_ID)("getCharacterInfo", () => {
  it("returns character data with all skills and stats keys", async () => {
    const char = await getCharacterInfo(CHAR_ID, TOKEN);

    console.log("\n--- Character top-level keys ---");
    console.log(Object.keys(char));

    console.log("\n--- skills (key → level) ---");
    console.log(Object.fromEntries(Object.entries(char.skills).map(([k, v]) => [k, v.level])));

    console.log("\n--- stats (key → level) ---");
    console.log(Object.fromEntries(Object.entries(char.stats).map(([k, v]) => [k, v.level])));

    expect(char.hashed_id).toBeTruthy();
    expect(char.name).toBeTruthy();
    expect(typeof char.skills).toBe("object");
    expect(typeof char.stats).toBe("object");
  });
});

describe.skipIf(!CHAR_ID)("getAltCharacters", () => {
  it("returns an array of alt characters", async () => {
    const alts = await getAltCharacters(CHAR_ID, TOKEN);
    console.log("\n--- Alt characters ---");
    console.log(alts.map((a) => ({ name: a.name, hashed_id: a.hashed_id })));
    expect(Array.isArray(alts)).toBe(true);
  });
});

// ─── Dungeons ─────────────────────────────────────────────────────────────────

describe("getDungeons", () => {
  it("returns dungeons with difficulty values", async () => {
    const dungeons = await getDungeons(TOKEN);

    console.log(`\n--- Dungeons: ${dungeons.length} total ---`);
    console.log("Keys:", dungeons[0] ? Object.keys(dungeons[0]) : "empty");
    console.log("First 3:", dungeons.slice(0, 3).map((d) => ({
      name: d.name,
      difficulty: d.difficulty,
      length_ms: d.length,
      duration_sec: Math.round(d.length / 1000),
      level_required: d.level_required,
    })));

    expect(dungeons.length).toBeGreaterThan(0);
    expect(dungeons[0]).toHaveProperty("difficulty");
    expect(dungeons.some((d) => d.difficulty > 0)).toBe(true);
  });
});

// ─── Items ────────────────────────────────────────────────────────────────────

describe("inspectItem", () => {
  it("returns item details with stats and tier_modifiers", async () => {
    const items = await searchItemsByType("helmet", TOKEN);
    expect(items.length).toBeGreaterThan(0);
    console.log(`\n--- Helmet search: ${items.length} items, first: ${items[0].name} ---`);

    const item = await inspectItem(items[0].hashed_id, TOKEN);
    console.log("\n--- Item inspect (full) ---");
    console.log(JSON.stringify(item, null, 2));

    console.log("\n--- Tier modifier formula check ---");
    if (item.stats && item.tier_modifiers) {
      for (const [stat, base] of Object.entries(item.stats)) {
        const addend = item.tier_modifiers[stat] ?? 0;
        console.log(`  ${stat}: base=${base}, addend/tier=${addend}, T5=${base + 4 * addend}, T10=${base + 9 * addend}, T${item.max_tier}=${base + (item.max_tier - 1) * addend}`);
      }
    }

    expect(item.hashed_id).toBeTruthy();
    expect(item.name).toBeTruthy();
  });
});
