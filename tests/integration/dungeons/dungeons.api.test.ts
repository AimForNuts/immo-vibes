/**
 * Integration tests — Dungeons endpoints.
 *
 * Requires .env.local:
 *   IDLEMMO_TEST_TOKEN=<your API token>
 *
 * Run with: npm test -- tests/integration/dungeons
 */

import { describe, it, expect } from "vitest";
import { getDungeons } from "@/lib/idlemmo";
import { TOKEN, delay } from "../setup";

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
