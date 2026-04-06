/**
 * Unit tests for combat scaling / Magic Find calculations.
 *
 * Pure-function tests — no API calls, no DB, no .env.local required.
 * Run with: npm test -- tests/unit
 *
 * Formulas under test: docs/game-mechanics/combat.md (MF section)
 * Wiki source: https://wiki.idle-mmo.com/combat/battling#magic-find-calculation
 */

import { describe, it, expect } from "vitest";
import { computeMfBonus, applyMfToLoot } from "@/app/(dashboard)/dashboard/combat/lib/combat-scaling";

// ─── computeMfBonus ───────────────────────────────────────────────────────────

describe("computeMfBonus", () => {
  it("returns 0 when no scaling (scaledLevel equals enemyLevel)", () => {
    expect(computeMfBonus(50, 50)).toBe(0);
  });

  it("returns 0 when scaled below enemy level", () => {
    expect(computeMfBonus(50, 30)).toBe(0);
  });

  it("returns 40 (max) when L1 enemy scaled to L150", () => {
    expect(computeMfBonus(1, 150)).toBe(40);
  });

  it("returns ~0.27 when L99 enemy scaled to L100 (minimal gap)", () => {
    // gap=1, (1/149)*40 ≈ 0.268
    expect(computeMfBonus(99, 100)).toBeCloseTo(0.27, 1);
  });

  it("caps at 40 even with impossible gaps", () => {
    expect(computeMfBonus(1, 999)).toBe(40);
  });

  it("scales proportionally at midpoint", () => {
    // L1 enemy, scaledLevel=75: gap=74, (74/149)*40 ≈ 19.87
    expect(computeMfBonus(1, 75)).toBeCloseTo(19.87, 1);
  });
});

// ─── applyMfToLoot ────────────────────────────────────────────────────────────

describe("applyMfToLoot — no scaling", () => {
  it("returns items unchanged when mfBonus is 0", () => {
    const items = [
      { hashed_item_id: "a", name: "Sword", chance: 20 },
      { hashed_item_id: "b", name: "Shield", chance: 10 },
    ];
    expect(applyMfToLoot(items, 0)).toEqual(items);
  });

  it("returns empty array unchanged", () => {
    expect(applyMfToLoot([], 40)).toEqual([]);
  });
});

describe("applyMfToLoot — scaling without overflow", () => {
  it("multiplies each item's chance by (1 + mfBonus/100)", () => {
    const items = [{ hashed_item_id: "a", name: "Gem", chance: 20 }];
    const result = applyMfToLoot(items, 40); // +40%
    expect(result[0].chance).toBeCloseTo(28, 1); // 20 * 1.4 = 28
  });

  it("preserves all non-chance fields", () => {
    const items = [{ hashed_item_id: "a", name: "Gem", quantity: 3, chance: 10 }];
    const result = applyMfToLoot(items, 20);
    expect(result[0].hashed_item_id).toBe("a");
    expect(result[0].name).toBe("Gem");
    expect(result[0].quantity).toBe(3);
  });

  it("does not mutate the original array", () => {
    const items = [{ hashed_item_id: "a", name: "Gem", chance: 20 }];
    applyMfToLoot(items, 40);
    expect(items[0].chance).toBe(20);
  });
});

describe("applyMfToLoot — overflow trimming", () => {
  it("trims from most common item when total exceeds 100%", () => {
    // item A: 60%, item B: 30% → with +40% MF: A=84%, B=42% → total=126% → trim 26 from A (most common)
    // A becomes 84-26=58, B stays 42, total=100
    const items = [
      { hashed_item_id: "a", name: "Common", chance: 60 },
      { hashed_item_id: "b", name: "Rare", chance: 30 },
    ];
    const result = applyMfToLoot(items, 40);
    const total = result.reduce((s, i) => s + i.chance, 0);
    expect(total).toBeCloseTo(100, 0);
    // Most common (A) should be reduced more
    expect(result.find(i => i.hashed_item_id === "a")!.chance).toBeCloseTo(58, 0);
    // Less common (B) should be at full adjusted value
    expect(result.find(i => i.hashed_item_id === "b")!.chance).toBeCloseTo(42, 0);
  });

  it("trims across multiple items if single item is not enough", () => {
    // All items already near 100% before MF
    const items = [
      { hashed_item_id: "a", name: "A", chance: 40 },
      { hashed_item_id: "b", name: "B", chance: 40 },
      { hashed_item_id: "c", name: "C", chance: 10 },
    ];
    // With +40% MF: A=56, B=56, C=14 → total=126 → trim 26 from most common first
    const result = applyMfToLoot(items, 40);
    const total = result.reduce((s, i) => s + i.chance, 0);
    expect(total).toBeCloseTo(100, 0);
  });
});
