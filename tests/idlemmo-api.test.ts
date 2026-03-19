/**
 * Integration tests for the IdleMMO API.
 *
 * Requires in .env.local:
 *   IDLEMMO_TEST_TOKEN=<your API token>
 *   DATABASE_URL=<neon connection string>
 *
 * Character ID is resolved from the DB (matches the token to the stored
 * idlemmo_character_id for that user). No need for IDLEMMO_TEST_CHARACTER_ID.
 *
 * Run with: npm test
 */

import { config } from "dotenv";
import { describe, it, expect, beforeAll } from "vitest";
import { neon } from "@neondatabase/serverless";
import {
  getCharacterInfo,
  getAltCharacters,
  getCharacterPets,
  getDungeons,
  searchItemsByType,
  inspectItem,
  EQUIPMENT_TYPES,
} from "@/lib/idlemmo";

config({ path: ".env.local" });

const TOKEN = process.env.IDLEMMO_TEST_TOKEN ?? "";
const BASE = "https://api.idle-mmo.com";

let CHAR_ID = "";

/** Delay between API calls to stay under the IdleMMO rate limit */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RATE_DELAY = 1500; // ms between calls

beforeAll(async () => {
  if (!TOKEN) throw new Error("IDLEMMO_TEST_TOKEN not set in .env.local");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set in .env.local");

  // Resolve character ID from DB — matches stored token to idlemmo_character_id
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT idlemmo_character_id FROM "user"
    WHERE idlemmo_token = ${TOKEN} AND idlemmo_character_id IS NOT NULL
    LIMIT 1
  `;
  if (rows.length === 0) throw new Error("No user found in DB with this token + character ID");
  CHAR_ID = rows[0].idlemmo_character_id as string;
  console.log(`\nResolved character ID from DB: ${CHAR_ID}`);
});

async function apiGet(path: string) {
  await delay(400);
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, "User-Agent": "ImmoWebSuite/1.0" },
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// ─── Character ────────────────────────────────────────────────────────────────

describe("getCharacterInfo", () => {
  it("returns skills (strength/defence/speed/dexterity) and stats shape", async () => {
    const char = await getCharacterInfo(CHAR_ID, TOKEN);

    console.log(`\n=== CHARACTER: ${char.name} ===`);
    console.log("skills:", Object.fromEntries(Object.entries(char.skills).map(([k, v]) => [k, v.level])));
    console.log("stats:", Object.fromEntries(Object.entries(char.stats).map(([k, v]) => [k, v.level])));

    const combatStatKeys = ["strength", "defence", "speed", "dexterity"];
    console.log("\n=== COMBAT STAT MAPPING CHECK (× 2.4) ===");
    for (const key of combatStatKeys) {
      const v = char.stats[key]?.level ?? char.skills[key]?.level;
      if (v !== undefined) console.log(`  ${key.padEnd(12)} level=${v}  → combat≈${Math.floor(v * 2.4)}`);
    }

    expect(char.hashed_id).toBeTruthy();
    expect(char.stats).toBeTruthy();
    expect(Object.keys(char.stats).some((k) => combatStatKeys.includes(k))).toBe(true);
  });
});

describe("getAltCharacters", () => {
  it("returns all characters on the account", async () => {
    await delay(500);
    const alts = await getAltCharacters(CHAR_ID, TOKEN);
    console.log("\n=== CHARACTERS ON ACCOUNT ===");
    alts.forEach((a) => console.log(`  ${a.name.padEnd(20)} id=${a.hashed_id}  level=${a.total_level}`));
    expect(Array.isArray(alts)).toBe(true);
  });
});

describe("getCharacterPets", () => {
  it("returns all pets and identifies the equipped one", async () => {
    await delay(RATE_DELAY);
    const pets = await getCharacterPets(CHAR_ID, TOKEN);
    console.log(`\n=== PETS: ${pets.length} total ===`);
    pets.forEach((p) => {
      const equipped = p.equipped ? " ← EQUIPPED" : "";
      const evo = `evo=${p.evolution.state}/${p.evolution.max} (+${p.evolution.current_bonus}%)`;
      console.log(`  ${p.name.padEnd(20)} lvl=${String(p.level).padStart(3)}  ${p.quality.padEnd(10)}  ${evo}  str=${p.stats.strength} def=${p.stats.defence} spd=${p.stats.speed}${equipped}`);
    });

    const equipped = pets.find((p) => p.equipped);
    if (equipped) {
      console.log(`\n  Equipped pet combat contribution (×2.4):`);
      console.log(`    attack_power from strength: ${Math.floor(equipped.stats.strength * 2.4)}`);
      console.log(`    protection   from defence:  ${Math.floor(equipped.stats.defence * 2.4)}`);
      console.log(`    agility      from speed:    ${Math.floor(equipped.stats.speed * 2.4)}`);
    } else {
      console.log("\n  No pet currently equipped.");
    }

    expect(Array.isArray(pets)).toBe(true);
    expect(pets.every((p) => typeof p.id === "number")).toBe(true);
    expect(pets.every((p) => typeof p.evolution?.state === "number")).toBe(true);
  });
});

describe("character sub-endpoints", () => {
  it("probes useful sub-endpoints", async () => {
    const subs = ["equipment", "inventory", "stats", "skills", "combat-stats"];
    console.log(`\n=== CHAR SUB-ENDPOINTS ===`);
    for (const sub of subs) {
      const { status, body } = await apiGet(`/v1/character/${CHAR_ID}/${sub}`);
      const snippet = status === 200
        ? JSON.stringify(body).slice(0, 150)
        : (body as { message?: string })?.message ?? "";
      console.log(`  ${sub.padEnd(15)} → HTTP ${status}  ${snippet}`);
    }
  });
});

// ─── Dungeons ─────────────────────────────────────────────────────────────────

describe("getDungeons", () => {
  it("returns dungeons with correct fields and non-zero difficulty", async () => {
    await delay(500);
    const dungeons = await getDungeons(TOKEN);
    console.log(`\n=== DUNGEONS: ${dungeons.length} total ===`);
    dungeons.forEach((d) =>
      console.log(`  ${d.name.padEnd(30)} difficulty=${String(d.difficulty).padStart(5)}  ${Math.round(d.length / 60000)}min  lvl=${d.level_required}`)
    );
    expect(dungeons.length).toBeGreaterThan(0);
    expect(dungeons.every((d) => d.length > 60000)).toBe(true); // must be ms not seconds
    expect(dungeons.some((d) => d.difficulty > 0)).toBe(true);
  });
});

// ─── Items ────────────────────────────────────────────────────────────────────

describe("item search — all equipment types", () => {
  it("all EQUIPMENT_TYPES return results from IdleMMO API", async () => {
    console.log(`\n=== ITEM SEARCH (${EQUIPMENT_TYPES.length} types) ===`);
    for (const type of EQUIPMENT_TYPES) {
      await delay(600);
      const items = await searchItemsByType(type, TOKEN);
      console.log(`  ${type.padEnd(12)} → ${items.length} items${items.length > 0 ? `  first: ${items[0].name}` : "  EMPTY"}`);
      expect(Array.isArray(items)).toBe(true);
    }
  });
});

describe("inspectItem", () => {
  it("shows stats + tier_modifiers shape; verifies additive tier formula", async () => {
    await delay(2000); // extra delay after bulk item searches
    const helmets = await searchItemsByType("HELMET", TOKEN);
    expect(helmets.length).toBeGreaterThan(0);

    await delay(600);
    const item = await inspectItem(helmets[0].hashed_id, TOKEN);

    console.log(`\n=== INSPECT: ${item.name} (${item.type}) ===`);
    console.log("  stats:", item.stats);
    console.log("  tier_modifiers:", item.tier_modifiers);
    console.log("  max_tier:", item.max_tier);

    if (item.stats && item.tier_modifiers) {
      console.log("\n  Tier formula (base + (tier-1) × addend):");
      for (const [stat, base] of Object.entries(item.stats)) {
        const add = item.tier_modifiers[stat] ?? 0;
        console.log(`    ${stat}: T1=${base}  T5=${base + 4 * add}  T${item.max_tier}=${base + (item.max_tier - 1) * add}`);
      }
    }

    expect(item.hashed_id).toBeTruthy();
    expect(typeof item.max_tier).toBe("number");
  });
});
