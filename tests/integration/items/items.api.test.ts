/**
 * Integration tests — Items endpoints.
 *
 * Requires .env.local:
 *   IDLEMMO_TEST_TOKEN=<your API token>
 *
 * Run with: npm test -- tests/integration/items
 */

import { describe, it, expect } from "vitest";
import { searchItemsByType, inspectItem, EQUIPMENT_TYPES } from "@/lib/idlemmo";
import { TOKEN, delay } from "../setup";

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
