/**
 * Enemy combat stats — the only enemy data NOT returned by the IdleMMO API.
 * Everything else (name, level, HP, XP, zone/location) comes from /v1/combat/enemies/list.
 *
 * Keyed by enemy ID (integer from the API).
 * Values are at the enemy's BASE level. Scale with: stat × (scaledLevel / baseLevel).
 *
 * See docs/game-mechanics/combat.md for the scaling formula.
 * Populate from in-game observation — provide (enemy name, level, AP/Prot/Agi/Acc) and we'll add it.
 */

export interface EnemyCombatStats {
  attack_power: number;
  protection: number;
  agility: number;
  accuracy: number;
}

/**
 * Map of enemy ID → combat stats at base level.
 * IDs match the `id` field from /v1/combat/enemies/list.
 */
export const ENEMY_COMBAT_STATS: Record<number, EnemyCombatStats> = {
  // ── Bluebell Hollow ──────────────────────────────────────────────────────────
  // 1:  Rabbit      L1
  // 16: Goblin      L2
  // 2:  Duck        L4
  // 17: Goblin King L6

  // ── Whispering Woods ──────────────────────────────────────────────────────────
  // 6:  Boar        L8
  // 3:  Deer        L10
  // 24: Cultist     L12
  // 26: Gorgon      L14
  // 25: Djinn       L16

  // ── Eldoria ───────────────────────────────────────────────────────────────────
  // 23: Spectre     L18
  // 22: Ogre        L20
  // 7:  Buffalo     L22
  // 21: Slimeball   L24
  // 18: Pirate      L26
  // 19: Skeleton Warrior L28

  // ── Crystal Caverns ──────────────────────────────────────────────────────────
  // 20: Zombie      L32
  // 28: Shadow Beast L35
  // 8:  Elephant    L36
  // 9:  Elk         L38
  // 29: Siren       L42

  // ── Skyreach Peak ─────────────────────────────────────────────────────────────
  // 10: Lion        L48
  // 30: Wraith      L52
  // 11: Moose       L54
  // 31: Golem       L58

  // ── Enchanted Oasis ──────────────────────────────────────────────────────────
  // 12: Polar Bear  L60
  // 32: Witch       L62
  // 14: Raccoon     L64
  // 33: Dwarven Warrior L68
  // 15: Wolf        L69

  // ── Floating Gardens of Aetheria ─────────────────────────────────────────────
  // 5:  Black Bear  L70
  // 34: Minotaur    L72
  // 35: Reaper      L74
  // 36: Harpy       L76

  // ── Celestial Observatory ─────────────────────────────────────────────────────
  // 37: Undead Knight        L78
  // 38: Wizard of the South  L82
  // 39: Air Elemental        L84
  // 40: Water Elemental      L86
  // 41: Fire Elemental       L89

  // ── Isle of Whispers ──────────────────────────────────────────────────────────
  // 46: Basilisk    L92
  // 47: Griffon     L94
  // 42: Earth Elemental L98
  // 44: Werewolf    L99

  // ── The Citadel ───────────────────────────────────────────────────────────────
  // 63: Arvendor Guardian L100
  // 61: Banshee           L100
  // 64: Kikimora          L100
  // 65: Man Moth          L100
  // 62: Will-o'-the-wisp  L100
};
