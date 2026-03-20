# Item Types

All 42 item types returned by the IdleMMO `/v1/item/search` endpoint.

Used by:
- `lib/idlemmo.ts` — `IDLEMMO_ITEM_TYPES` constant
- `lib/market-config.ts` — `MARKET_TABS` tab groupings
- Admin sync endpoint — `EQUIPMENT_TYPES` subset

---

## Type Reference

| Type | Category | Description |
|---|---|---|
| `BAIT` | Resources | Fishing bait used to attract fish |
| `BLANK_SCROLL` | Alchemy | Blank scrolls used as crafting ingredients |
| `BOOTS` | Gear | Foot armour slot |
| `BOW` | Gear | Ranged weapon (main-hand) |
| `CAKE` | Alchemy | Special food item; likely event/seasonal |
| `CAMPAIGN_ITEM` | Collectables | Items tied to campaigns or limited events |
| `CHEST` | Collectables | Loot chest containing multiple randomised items |
| `CHESTPLATE` | Gear | Body armour slot |
| `COLLECTABLE` | Collectables | General collectible items for the museum |
| `CONSTRUCTION_MATERIAL` | Resources | Materials used for construction activities |
| `CRAFTING_MATERIAL` | Resources | Generic ingredients used in crafting recipes |
| `DAGGER` | Gear | Fast melee weapon (main-hand) |
| `EMPTY_CRYSTAL` | Alchemy | Empty crystals used to store essences |
| `ESSENCE_CRYSTAL` | Alchemy | Crystals filled with captured essences |
| `FELLING_AXE` | Tools | Used for the Woodcutting skill |
| `FISH` | Resources | Fish caught from fishing activities |
| `FISHING_ROD` | Tools | Used for the Fishing skill |
| `FOOD` | Alchemy | Consumable food; restores health and hunger during combat |
| `GAUNTLETS` | Gear | Hand armour slot |
| `GEMSTONE` | Resources | Precious gems from mining; used in crafting |
| `GREAVES` | Gear | Leg armour slot |
| `GUIDANCE_SCROLL` | Alchemy | Scrolls granting guidance effects or buffs |
| `HELMET` | Gear | Head armour slot |
| `LOG` | Resources | Wood logs from woodcutting |
| `MEMBERSHIP` | Collectables | Membership tokens; unlock membership benefits (enemy scaling L80+, dungeon XP bonus) |
| `METAL_BAR` | Resources | Smelted bars crafted from ore |
| `METAMORPHITE` | Collectables | Rare material used in special high-tier upgrades |
| `NAMESTONE` | Collectables | Used to rename items or characters |
| `ORE` | Resources | Raw ore extracted from mining |
| `PET_EGG` | Collectables | Contains a hatching pet; quality determines pet rarity |
| `PICKAXE` | Tools | Used for the Mining skill |
| `POTION` | Alchemy | Consumable potions providing buffs or healing |
| `RECIPE` | Alchemy | Crafting recipes that unlock new craftable items |
| `RELIC` | Collectables | Ancient relics collected for museum or lore |
| `SHIELD` | Gear | Off-hand defensive equipment |
| `SKIN` | Collectables | Cosmetic character skins for the museum |
| `SPECIAL` | Collectables | Miscellaneous special items that do not fit other categories |
| `SWORD` | Gear | Standard melee weapon (main-hand) |
| `TELEPORTATION_STONE` | Collectables | Used for fast travel between locations |
| `TOKEN` | Collectables | Premium or special-purpose tokens |
| `UPGRADE_STONE` | Collectables | Used to upgrade item tier (see item tier formula in `docs/game-mechanics/items.md`) |
| `VIAL` | Alchemy | Empty vials used in potion crafting |

---

## Market Browser Tab Assignments

The market browser groups these types into tabs. Defined in `lib/market-config.ts`.
The detail panel shows recipe info and material market prices for any item that has a recipe (regardless of tab).

| Tab | Types |
|---|---|
| **Resources** | `CAKE`, `CAMPAIGN_ITEM`, `CHEST`, `CONSTRUCTION_MATERIAL`, `CRAFTING_MATERIAL`, `FISH`, `FOOD`, `GUIDANCE_SCROLL`, `LOG`, `MEMBERSHIP`, `METAL_BAR`, `ORE`, `PET_EGG`, `RELIC`, `TELEPORTATION_STONE`, `TOKEN`, `UPGRADE_STONE` |
| **Alchemy** | `POTION` |
| **Gear** | `BOOTS`, `BOW`, `CHESTPLATE`, `DAGGER`, `GAUNTLETS`, `GREAVES`, `HELMET`, `SHIELD`, `SWORD` |
| **Tools** | `FELLING_AXE`, `FISHING_ROD`, `PICKAXE` |
| **Collectables** | `COLLECTABLE` |
| **Merchants** | `BAIT`, `BLANK_SCROLL`, `EMPTY_CRYSTAL`, `ESSENCE_CRYSTAL`, `METAMORPHITE`, `NAMESTONE`, `SKIN`, `VIAL` |
| **Event** | `SPECIAL` |
| **Recipes** | `RECIPE` |
| **Legacy** | `GEMSTONE` |

> To reorganise tabs, edit the `MARKET_TABS` array in `lib/market-config.ts`.

---

## Equipment Types (Gear Calculator subset)

The 9 types that occupy gear slots are tracked separately in `lib/idlemmo.ts` as `EQUIPMENT_TYPES`. These are synced to the local database by the admin sync tool:

`SWORD`, `DAGGER`, `BOW`, `SHIELD`, `HELMET`, `CHESTPLATE`, `GREAVES`, `GAUNTLETS`, `BOOTS`

---

## Notes

- **Tools are not equipment** — `FELLING_AXE`, `FISHING_ROD`, and `PICKAXE` occupy a tool slot separate from the 7 gear slots. They are not included in `EQUIPMENT_TYPES`.
- **MEMBERSHIP effect** — players with an active membership get enemy scaling at L80+ and L100+ (see `docs/game-mechanics/combat.md`).
- **FOOD in combat** — food items are consumed during hunting to restore HP. See `docs/game-mechanics/combat.md` for the food consumption formula.
