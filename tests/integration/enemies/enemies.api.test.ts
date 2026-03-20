/**
 * Integration tests — Enemies endpoints.
 *
 * Requires .env.local:
 *   IDLEMMO_TEST_TOKEN=<your API token>
 *
 * Run with: npm test -- tests/integration/enemies
 */

import { describe, it, expect } from "vitest";
import { RATE_DELAY, delay, apiGet } from "../setup";

describe("combat enemies list", () => {
  it("fetches /v1/combat/enemies/list and logs full response shape", async () => {
    await delay(RATE_DELAY);
    const { status, body } = await apiGet("/v1/combat/enemies/list");

    console.log(`\n=== COMBAT ENEMIES — HTTP ${status} ===`);
    console.log("Response shape (top-level keys):", body ? Object.keys(body) : "null");

    if (status === 200 && body) {
      // Detect the array of enemies regardless of wrapper key
      const enemies: unknown[] =
        Array.isArray(body) ? body :
        Array.isArray(body.data) ? body.data :
        Array.isArray(body.enemies) ? body.enemies :
        [];

      console.log(`Total enemies: ${enemies.length}`);

      if (enemies.length > 0) {
        const first = enemies[0] as Record<string, unknown>;
        console.log("\nFirst enemy (all fields):", JSON.stringify(first, null, 2));
        console.log("\nAll enemy keys:", Object.keys(first));

        console.log("\n=== ENEMY SUMMARY TABLE ===");
        const headers = ["name", "level", "zone", "location", "hp", "attack_power", "protection", "agility", "accuracy", "xp"];
        console.log(headers.map((h) => h.padEnd(14)).join(" "));
        for (const e of enemies.slice(0, 30)) {
          const row = e as Record<string, unknown>;
          const cols = headers.map((h) => String(row[h] ?? row[h.replace("_", "")] ?? "—").slice(0, 13).padEnd(14));
          console.log(cols.join(" "));
        }
        if (enemies.length > 30) console.log(`  ... and ${enemies.length - 30} more`);
      }

      if (body.pagination || body.meta || body.links) {
        console.log("\nPagination info:", JSON.stringify(body.pagination ?? body.meta ?? body.links));
      }
    } else {
      console.log("Full response:", JSON.stringify(body).slice(0, 500));
    }

    expect(status).toBe(200);
  });
});
