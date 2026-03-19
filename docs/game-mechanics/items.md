# Items — Types, Quality, and Tiers

---

## Quality Tiers

| Quality | Display Color |
|---|---|
| STANDARD | Grey |
| REFINED | Green |
| PREMIUM | Blue |
| EPIC | Purple |
| LEGENDARY | Yellow/Gold |
| MYTHIC | Red |

---

## Equipment Types (gear slots)

| Type | Slot |
|---|---|
| SWORD | Main hand |
| DAGGER | Main hand (dual) |
| BOW | Main hand (ranged) |
| SHIELD | Off hand |
| HELMET | Head |
| CHESTPLATE | Chest |
| GREAVES | Legs |
| GAUNTLETS | Hands |
| BOOTS | Feet |

---

## All Item Types (IDLEMMO_ITEM_TYPES)

```
BAIT, BLANK_SCROLL, BOOTS, BOW, CAKE, CAMPAIGN_ITEM, CHEST,
CHESTPLATE, COLLECTABLE, CONSTRUCTION_MATERIAL, CRAFTING_MATERIAL,
DAGGER, EMPTY_CRYSTAL, ESSENCE_CRYSTAL, FELLING_AXE, FISH,
FISHING_ROD, FOOD, GAUNTLETS, GEMSTONE, GREAVES, GUIDANCE_SCROLL,
HELMET, LOG, MEMBERSHIP, METAL_BAR, METAMORPHITE, NAMESTONE,
ORE, PET_EGG, PICKAXE, POTION, RECIPE, RELIC, SHIELD, SKIN,
SPECIAL, SWORD, TELEPORTATION_STONE, TOKEN, UPGRADE_STONE, VIAL
```

---

## Item Tier Formula

```
effectiveStat = baseStat + (tier − 1) × tierModifier[stat]
```

- `stats` — base values at Tier 1 (from `/v1/item/{id}/inspect`)
- `tier_modifiers` — flat addend per tier, keyed by stat name
- `max_tier` — maximum tier the item can reach

See [combat-stats.md](./combat-stats.md) for examples.

---

## API Notes

- `searchItemsByType(type, token)` — paginates automatically, normalizes type to uppercase
- `inspectItem(hashedId, token)` — returns full stats + tier_modifiers + max_tier
- Rate limit: ~20 req/min; use ≥ 1500ms delay between bulk calls in tests
