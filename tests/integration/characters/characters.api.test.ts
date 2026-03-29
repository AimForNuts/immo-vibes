/**
 * Integration tests — Character endpoints.
 *
 * Requires .env.local:
 *   IDLEMMO_TEST_TOKEN=<your API token>
 *   DATABASE_URL=<neon connection string>
 *
 * Run with: npm test -- tests/integration/characters
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getCharacterInfo, getAltCharacters, getCharacterPets } from "@/lib/idlemmo";
import { TOKEN, RATE_DELAY, delay, apiGet, resolveCharId } from "../setup";

let CHAR_ID = "";

beforeAll(async () => {
  CHAR_ID = await resolveCharId();
  console.log(`\nResolved character ID from DB: ${CHAR_ID}`);
});

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
  it("returns all pets and identifies the equipped one with non-zero stats", async () => {
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

      // API bug is fixed — stats must be non-zero for a trained pet
      expect(equipped.stats.strength).toBeGreaterThan(0);
      expect(equipped.stats.defence).toBeGreaterThan(0);
      expect(equipped.stats.speed).toBeGreaterThan(0);
    }

    expect(Array.isArray(pets)).toBe(true);
    expect(pets.every((p) => typeof p.id === "number")).toBe(true);
    expect(pets.every((p) => typeof p.evolution?.state === "number")).toBe(true);
    // New fields
    expect(pets.every((p) => typeof p.experience === "number")).toBe(true);
    expect(pets.every((p) => typeof p.health?.current === "number")).toBe(true);
    expect(pets.every((p) => typeof p.location?.locked === "boolean")).toBe(true);
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
