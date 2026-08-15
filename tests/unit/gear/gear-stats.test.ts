import { describe, expect, it } from "vitest";
import { applyTier, buildSlotStats, computeGearStats } from "@/app/(dashboard)/dashboard/gear/lib/gear-stats";
import type { GearSet, InspectEntry } from "@/app/(dashboard)/dashboard/gear/types";

describe("gear stat tier calculations", () => {
  it("keeps tier 1 at base stats and applies additive modifiers above tier 1", () => {
    expect(applyTier(120, "attack_power", 1, { attack_power: 10 })).toBe(120);
    expect(applyTier(120, "attack_power", 5, { attack_power: 10 })).toBe(160);
  });

  it("uses zero as the modifier when tier data is missing for a stat", () => {
    expect(applyTier(42, "accuracy", 6, null)).toBe(42);
    expect(applyTier(42, "accuracy", 6, { attack_power: 12 })).toBe(42);
  });

  it("rounds fractional tier results to match displayed combat stats", () => {
    expect(applyTier(10.2, "agility", 4, { agility: 2.4 })).toBe(17);
  });

  it("builds per-slot stat contributions using the selected item tier", () => {
    const set: GearSet = {
      weaponStyle: "SWORD_SHIELD",
      slots: {
        main_hand: {
          hashedId: "sword",
          name: "Sword",
          quality: "EPIC",
          imageUrl: null,
          tier: 4,
          maxTier: 6,
        },
      },
    };

    const inspects: Record<string, InspectEntry> = {
      sword: {
        stats: { attack_power: 100, accuracy: 20 },
        tier_modifiers: { attack_power: 8 },
      },
    };

    expect(buildSlotStats(set, inspects)).toEqual({
      main_hand: { attack_power: 124, accuracy: 20 },
    });
  });

  it("adds tier-scaled gear stats on top of character base stats", () => {
    const setA: GearSet = {
      weaponStyle: "DUAL_DAGGER",
      slots: {
        main_hand: {
          hashedId: "dagger",
          name: "Dagger",
          quality: "LEGENDARY",
          imageUrl: null,
          tier: 3,
          maxTier: 5,
        },
      },
    };
    const setB: GearSet = { weaponStyle: "BOW", slots: {} };
    const inspects: Record<string, InspectEntry> = {
      dagger: {
        stats: { attack_power: 30, agility: 12 },
        tier_modifiers: { attack_power: 5, agility: 3 },
      },
    };

    expect(computeGearStats(setA, setB, inspects, {
      attack_power: 200,
      protection: 150,
      agility: 100,
      accuracy: 80,
    })).toEqual({
      setA: {
        attack_power: 240,
        protection: 150,
        agility: 118,
        accuracy: 80,
      },
      setB: {
        attack_power: 200,
        protection: 150,
        agility: 100,
        accuracy: 80,
      },
    });
  });
});
