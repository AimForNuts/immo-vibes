/**
 * Unit tests for dungeon difficulty calculations.
 *
 * These are pure-function tests — no API calls, no DB, no .env.local required.
 * Run with: npm test -- tests/unit
 *
 * Formulas under test: docs/game-mechanics/dungeons.md
 */

import { describe, it, expect } from "vitest";
import {
  assessDungeon,
  totalCombatStats,
  formatDuration,
  COMBAT_STAT_KEYS,
} from "@/app/(dashboard)/dashboard/dungeons/difficulty";

// ─── totalCombatStats ──────────────────────────────────────────────────────────

describe("totalCombatStats", () => {
  it("sums the four combat stat keys", () => {
    expect(totalCombatStats({ attack_power: 100, protection: 80, agility: 60, accuracy: 40 })).toBe(280);
  });

  it("treats missing keys as 0", () => {
    expect(totalCombatStats({ attack_power: 100 })).toBe(100);
  });

  it("ignores non-combat stat keys", () => {
    expect(totalCombatStats({ attack_power: 50, damage: 999, movement_speed: 20 })).toBe(50);
  });

  it("returns 0 for empty stats", () => {
    expect(totalCombatStats({})).toBe(0);
  });
});

// ─── assessDungeon — entry threshold ──────────────────────────────────────────

describe("assessDungeon — entry", () => {
  it("blocks entry when ratio < 0.70", () => {
    expect(assessDungeon(69, 100)).toEqual({ canEnter: false });
    expect(assessDungeon(0, 100)).toEqual({ canEnter: false });
  });

  it("blocks entry when difficulty is 0 (unknown)", () => {
    expect(assessDungeon(1000, 0)).toEqual({ canEnter: false });
  });

  it("allows entry exactly at 0.70", () => {
    const result = assessDungeon(70, 100);
    expect(result.canEnter).toBe(true);
  });
});

// ─── assessDungeon — HP loss ───────────────────────────────────────────────────

describe("assessDungeon — HP loss", () => {
  it("100% HP loss at ratio 0.70 (entry floor)", () => {
    const r = assessDungeon(70, 100);
    expect(r.canEnter).toBe(true);
    if (r.canEnter) expect(r.healthLossPct).toBe(100);
  });

  it("50% HP loss at ratio 1.00", () => {
    const r = assessDungeon(100, 100);
    expect(r.canEnter).toBe(true);
    if (r.canEnter) expect(r.healthLossPct).toBe(50);
  });

  it("10% HP loss at ratio 1.30", () => {
    const r = assessDungeon(130, 100);
    expect(r.canEnter).toBe(true);
    if (r.canEnter) expect(r.healthLossPct).toBe(10);
  });

  it("10% HP loss (flat) above ratio 1.30", () => {
    const r = assessDungeon(200, 100);
    expect(r.canEnter).toBe(true);
    if (r.canEnter) expect(r.healthLossPct).toBe(10);
  });

  it("interpolates linearly between 0.70 and 1.00 (midpoint = 0.85 → 75%)", () => {
    const r = assessDungeon(85, 100);
    expect(r.canEnter).toBe(true);
    if (r.canEnter) expect(r.healthLossPct).toBe(75);
  });

  it("interpolates linearly between 1.00 and 1.30 (midpoint = 1.15 → 30%)", () => {
    const r = assessDungeon(115, 100);
    expect(r.canEnter).toBe(true);
    if (r.canEnter) expect(r.healthLossPct).toBe(30);
  });
});

// ─── assessDungeon — chaining ─────────────────────────────────────────────────

describe("assessDungeon — chaining", () => {
  it("cannot chain at ratio 0.70 (100% HP loss)", () => {
    const r = assessDungeon(70, 100);
    if (r.canEnter) expect(r.canChain).toBe(false);
  });

  it("can chain at ratio 1.00 (50% HP loss)", () => {
    const r = assessDungeon(100, 100);
    if (r.canEnter) expect(r.canChain).toBe(true);
  });

  it("can chain at ratio 1.30+ (10% HP loss)", () => {
    const r = assessDungeon(160, 100);
    if (r.canEnter) expect(r.canChain).toBe(true);
  });
});

// ─── assessDungeon — magic find tiers ─────────────────────────────────────────

describe("assessDungeon — magic find tier", () => {
  it("no MF below ratio 1.30", () => {
    const r = assessDungeon(129, 100);
    if (r.canEnter) expect(r.mfTier).toBe("none");
  });

  it("small MF at ratio 1.30", () => {
    const r = assessDungeon(130, 100);
    if (r.canEnter) expect(r.mfTier).toBe("small");
  });

  it("small MF between 1.30 and 1.60", () => {
    const r = assessDungeon(150, 100);
    if (r.canEnter) expect(r.mfTier).toBe("small");
  });

  it("max MF at ratio 1.60", () => {
    const r = assessDungeon(160, 100);
    if (r.canEnter) expect(r.mfTier).toBe("max");
  });

  it("max MF above ratio 1.60", () => {
    const r = assessDungeon(999, 100);
    if (r.canEnter) expect(r.mfTier).toBe("max");
  });
});

// ─── formatDuration ───────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("formats hours only", () => {
    expect(formatDuration(3600)).toBe("1h");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3600 + 600)).toBe("1h 10m");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(formatDuration(3600 + 600 + 30)).toBe("1h 10m 30s");
  });

  it("formats minutes only", () => {
    expect(formatDuration(300)).toBe("5m");
  });

  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("handles 0 seconds", () => {
    expect(formatDuration(0)).toBe("");
  });
});

// ─── COMBAT_STAT_KEYS ─────────────────────────────────────────────────────────

describe("COMBAT_STAT_KEYS", () => {
  it("contains exactly the four expected keys", () => {
    expect(COMBAT_STAT_KEYS).toEqual(["attack_power", "protection", "agility", "accuracy"]);
  });
});
