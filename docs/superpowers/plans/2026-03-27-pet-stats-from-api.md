# Pet Stats From API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual pet combat stat entry system with values computed directly from the IdleMMO pets API, which now correctly returns non-zero `stats.strength / defence / speed`.

**Architecture:** The `/v1/character/{id}/pets` endpoint now returns real skill levels. We compute combat contributions (`floor(stat × 2.4)`) inline in `DungeonExplorer` from the already-fetched API response, removing the `pet-stats` route, the manual input UI, and four unused DB columns.

**Tech Stack:** Next.js App Router, Drizzle ORM, TypeScript, Vitest (integration tests)

---

## File Map

| File | Action | Reason |
|---|---|---|
| `lib/idlemmo.ts` | Modify | Remove API-bug warning, add new response fields to `CharacterPet` |
| `tests/integration/characters/characters.api.test.ts` | Modify | Add assertion: equipped pet stats are non-zero |
| `app/api/characters/[id]/sync-pet/route.ts` | Modify | Drop redundant `getCharacterInfo` call |
| `app/api/characters/[id]/pet-stats/route.ts` | **Delete** | Replaced by inline computation |
| `app/(dashboard)/dashboard/dungeons/DungeonExplorer.tsx` | Modify | Remove manual inputs; compute stats from `equippedPet.stats` |
| `lib/db/schema.ts` | Modify | Drop 4 dead columns from `characterPets` table definition |
| `lib/db/migrations/` | **New file** | Migration to drop those columns in production |
| `docs/game-mechanics/pets.md` | Modify | Remove API-bug note; confirm stats are now reliable |

---

## Setup

- [ ] **Create worktree**

```bash
cd c:/Users/josep/immo_web_suite
git pull origin master
git worktree add ../immo_web_suite-pet-stats-api -b feat/pet-stats-api
cd ../immo_web_suite-pet-stats-api
```

---

## Task 1: Update `CharacterPet` interface and tighten the integration test

**Files:**
- Modify: `lib/idlemmo.ts` (around line 179)
- Modify: `tests/integration/characters/characters.api.test.ts`

- [ ] **Step 1: Update the `CharacterPet` interface**

Replace the entire `CharacterPet` interface (lines 179–208) in `lib/idlemmo.ts`:

```typescript
export interface CharacterPet {
  id: number;
  name: string;
  custom_name: string | null;
  pet_id: number;
  image_url: string | null;
  level: number;
  experience: number;
  quality: string;
  stats: {
    strength: number;  // → Attack Power  (×2.4)
    defence: number;   // → Protection    (×2.4)
    speed: number;     // → Agility       (×2.4)
  };
  health: {
    current: number;
    maximum: number;
    percentage: number;
  };
  equipped: boolean;
  /** null when the pet is not in a dungeon */
  battle: null | unknown;
  evolution: {
    state: number;           // 0–5
    max: number;             // always 5
    bonus_per_stage: number; // always 5 (= 5% per stage)
    current_bonus: number;   // state × bonus_per_stage
    next_bonus: number;
    can_evolve: boolean;
    /** All possible combat stat targets for this pet type (not which one was chosen). */
    targets: Array<{ key: string; label: string }>;
  };
  location: {
    id: number | null;
    name: string | null;
    locked: boolean;
  };
  created_at: string;
}
```

- [ ] **Step 2: Add a non-zero stats assertion to the integration test**

In `tests/integration/characters/characters.api.test.ts`, replace the `getCharacterPets` `it` block with:

```typescript
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
```

- [ ] **Step 3: Run the integration test and confirm it passes**

```bash
npm test -- tests/integration/characters
```

Expected: all tests pass; the equipped pet's `strength/defence/speed` are > 0.

- [ ] **Step 4: Commit**

```bash
git add lib/idlemmo.ts tests/integration/characters/characters.api.test.ts
git commit -m "feat: update CharacterPet interface with new fields; assert non-zero pet stats"
```

---

## Task 2: Simplify `sync-pet/route.ts`

The route currently calls `getCharacterInfo` just to check whether a pet is equipped before looking it up in `getCharacterPets`. The `equipped: true` flag is reliable, so the extra call is unnecessary.

**Files:**
- Modify: `app/api/characters/[id]/sync-pet/route.ts`

- [ ] **Step 1: Replace `fetchEquippedPetWithStats`**

Replace the entire function (lines 20–32) with:

```typescript
async function fetchEquippedPet(
  characterHashedId: string,
  token: string
): Promise<CharacterPet | null> {
  const pets = await getCharacterPets(characterHashedId, token);
  return pets.find((p) => p.equipped) ?? null;
}
```

- [ ] **Step 2: Update the `POST` handler to use the renamed function**

In the `POST` handler, replace the call:

```typescript
  // before
  pet = await fetchEquippedPetWithStats(characterHashedId, token);
```

```typescript
  // after
  pet = await fetchEquippedPet(characterHashedId, token);
```

- [ ] **Step 3: Remove unused import**

Remove `getCharacterInfo` from the import at the top of the file since it is no longer used:

```typescript
// before
import { getCharacterInfo, getCharacterPets, type CharacterPet } from "@/lib/idlemmo";

// after
import { getCharacterPets, type CharacterPet } from "@/lib/idlemmo";
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/characters/\[id\]/sync-pet/route.ts
git commit -m "refactor: simplify sync-pet — drop getCharacterInfo call, find equipped pet by flag"
```

---

## Task 3: Delete `pet-stats/route.ts`

This route (GET + POST) existed solely to save and retrieve manually-entered pet combat stats. Nothing else calls it after `DungeonExplorer` is updated in Task 4.

**Files:**
- Delete: `app/api/characters/[id]/pet-stats/route.ts`

- [ ] **Step 1: Confirm no other file imports or fetches this route**

```bash
grep -r "pet-stats" app/ lib/ components/ --include="*.ts" --include="*.tsx"
```

Expected output: only `DungeonExplorer.tsx` (which we fix in Task 4). If anything else appears, address it before deleting.

- [ ] **Step 2: Delete the file**

```bash
rm app/api/characters/\[id\]/pet-stats/route.ts
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (the file is gone, no remaining imports).

- [ ] **Step 4: Commit**

```bash
git add -A app/api/characters/
git commit -m "remove: delete pet-stats route — replaced by inline API computation"
```

---

## Task 4: Update `DungeonExplorer.tsx`

Replace the manual-input system with values computed inline from `equippedPet.stats`.

**Files:**
- Modify: `app/(dashboard)/dashboard/dungeons/DungeonExplorer.tsx`

### Step-by-step changes (apply in order)

- [ ] **Step 1: Remove `Save` from the lucide import**

```typescript
// before
import {
  Skull, User, Swords, Shield, Wind, Crosshair, Zap,
  Link2, Sparkles, AlertTriangle, Ban, Clock, ChevronDown, ChevronRight, PawPrint, Save,
  RefreshCw,
} from "lucide-react";

// after
import {
  Skull, User, Swords, Shield, Wind, Crosshair, Zap,
  Link2, Sparkles, AlertTriangle, Ban, Clock, ChevronDown, ChevronRight, PawPrint,
  RefreshCw,
} from "lucide-react";
```

- [ ] **Step 2: Remove the `PetCombatStats` type and `EMPTY_PET_STATS` constant**

Delete lines 52 and 64:

```typescript
// remove these two lines:
type PetCombatStats = { attack_power: number; protection: number; agility: number; accuracy: number };
const EMPTY_PET_STATS: PetCombatStats = { attack_power: 0, protection: 0, agility: 0, accuracy: 0 };
```

- [ ] **Step 3: Remove the `petStats` and `petSaving` state declarations**

Delete lines 79–80:

```typescript
// remove these two lines:
const [petStats, setPetStats] = useState<PetCombatStats>(EMPTY_PET_STATS);
const [petSaving, setPetSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
```

- [ ] **Step 4: Remove the `useEffect` that loads from `/api/characters/.../pet-stats`**

Delete lines 152–171 (the entire block):

```typescript
// remove this entire block:
// ── Load saved pet combat stats from DB whenever character changes ──────────

useEffect(() => {
  if (!characterId) { setPetStats(EMPTY_PET_STATS); return; }
  fetch(`/api/characters/${characterId}/pet-stats`)
    .then((r) => r.json())
    .then((data) => {
      if (data.pet) {
        setPetStats({
          attack_power: data.pet.attackPower ?? 0,
          protection:   data.pet.protection  ?? 0,
          agility:      data.pet.agility      ?? 0,
          accuracy:     data.pet.accuracy     ?? 0,
        });
      } else {
        setPetStats(EMPTY_PET_STATS);
      }
    })
    .catch(() => setPetStats(EMPTY_PET_STATS));
}, [characterId]);
```

- [ ] **Step 5: Remove the stale comment on line 236 and fix it**

```typescript
// before
// Equipped pet — API always returns str/def/spd = 0; manual stats are entered separately

// after (just remove the comment — the code below it is unchanged)
```

- [ ] **Step 6: Remove the `savePetStats` function**

Delete lines 292–321 (the entire `savePetStats` async function and the preceding comment block).

- [ ] **Step 7: Replace `petStatsTotal` and `computedTotal` with computed values**

Replace lines 323–324:

```typescript
// before
const petStatsTotal = petStats.attack_power + petStats.protection + petStats.agility + petStats.accuracy;
const computedTotal = combatStats ? totalCombatStats(combatStats) + petStatsTotal : null;

// after
const petContribution: Record<string, number> = equippedPet
  ? {
      attack_power: Math.floor(equippedPet.stats.strength * 2.4),
      protection:   Math.floor(equippedPet.stats.defence  * 2.4),
      agility:      Math.floor(equippedPet.stats.speed    * 2.4),
      accuracy:     0,
    }
  : { attack_power: 0, protection: 0, agility: 0, accuracy: 0 };

const petContributionTotal = Object.values(petContribution).reduce((a, b) => a + b, 0);
const computedTotal = combatStats ? totalCombatStats(combatStats) + petContributionTotal : null;
```

- [ ] **Step 8: Replace the manual inputs section with a computed read-only display**

Replace the entire "Manual combat stat inputs" `div` (lines 510–559):

```tsx
{/* Computed combat contribution */}
<div className="ml-[1.625rem] pl-[1.625rem] space-y-2 border-l border-border/30">
  <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wide">
    Combat contribution
  </p>
  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
    {([
      { key: "attack_power", label: "Attack Power", icon: Swords, value: Math.floor(equippedPet.stats.strength * 2.4) },
      { key: "protection",   label: "Protection",   icon: Shield, value: Math.floor(equippedPet.stats.defence  * 2.4) },
      { key: "agility",      label: "Agility",      icon: Wind,   value: Math.floor(equippedPet.stats.speed    * 2.4) },
    ] as const).map(({ key, label, icon: Icon, value }) => (
      <div key={key} className="flex items-center gap-1.5">
        <Icon className="size-3 text-muted-foreground/40 shrink-0" />
        <span className="text-[10px] font-mono text-muted-foreground/60 w-[4.5rem] shrink-0">{label}</span>
        <span className="text-xs font-mono tabular-nums text-foreground/80">+{value}</span>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 9: Update the combat stat breakdown to use `petContribution`**

Replace lines 577–578:

```typescript
// before
const petManual = petStats[key as keyof typeof petStats];
const value = baseValue !== null ? baseValue + petManual : null;

// after
const petAdd = petContribution[key] ?? 0;
const value = baseValue !== null ? baseValue + petAdd : null;
```

- [ ] **Step 10: Update the pet breakdown row in the expanded stat view**

Replace lines 618–623:

```tsx
// before
{petManual > 0 && equippedPet && (
  <div className="flex items-center justify-between text-[11px] font-mono">
    <span className="text-muted-foreground truncate max-w-[200px]">Pet — {equippedPet.name}</span>
    <span className="tabular-nums text-foreground/70 shrink-0 ml-2">+{petManual}</span>
  </div>
)}

// after
{petAdd > 0 && equippedPet && (
  <div className="flex items-center justify-between text-[11px] font-mono">
    <span className="text-muted-foreground truncate max-w-[200px]">Pet — {equippedPet.name}</span>
    <span className="tabular-nums text-foreground/70 shrink-0 ml-2">+{petAdd}</span>
  </div>
)}
```

- [ ] **Step 11: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 12: Commit**

```bash
git add app/\(dashboard\)/dashboard/dungeons/DungeonExplorer.tsx
git commit -m "feat: compute pet combat stats from API instead of manual inputs"
```

---

## Task 5: Drop unused DB columns and generate migration

The four columns `attack_power`, `protection`, `agility`, `accuracy` in `character_pets` are now orphaned — no route writes them and no code reads them.

**Files:**
- Modify: `lib/db/schema.ts`
- New: `lib/db/migrations/<timestamp>_drop_pet_manual_stats.sql`

- [ ] **Step 1: Update the schema**

In `lib/db/schema.ts`, remove the four nullable columns and the comment block above them (lines 321–330):

```typescript
// remove this entire block from the characterPets table definition:
/**
 * Manually entered pet combat-stat contributions (AP/Prot/Agi/Acc).
 * The IdleMMO API always returns strength/defence/speed = 0 (known bug),
 * so these values are entered by the user and saved here.
 * Null until the user saves them.
 */
attackPower:  integer("attack_power"),
protection:   integer("protection"),
agility:      integer("agility"),
accuracy:     integer("accuracy"),
```

Also update the table comment (line 295–299) to remove the API-bug mention:

```typescript
// before
/**
 * Saved equipped-pet stats per character, synced manually by the user.
 * One row per (user, character) — upserted each time the user clicks "Sync Current Pet".
 * Stats reflect the pet-skills API values (may be 0 due to a known API bug).
 */

// after
/**
 * Saved equipped-pet stats per character, synced by the user via "Sync Current Pet".
 * One row per (user, character). Raw skill levels are stored; combat values are computed
 * as floor(skill × 2.4) at render time.
 */
```

- [ ] **Step 2: Generate the migration (run from inside the worktree)**

```bash
ln -s ../immo_web_suite/node_modules ./node_modules
cp ../immo_web_suite/.env.local .env.local
node_modules/.bin/drizzle-kit generate --name="drop_pet_manual_stats"
rm node_modules .env.local
```

- [ ] **Step 3: Review the generated SQL**

```bash
ls lib/db/migrations/ | tail -1  # find the new file
cat lib/db/migrations/<new-file>.sql
```

Expected content (may vary slightly in column order):

```sql
ALTER TABLE "character_pets" DROP COLUMN "attack_power";
ALTER TABLE "character_pets" DROP COLUMN "protection";
ALTER TABLE "character_pets" DROP COLUMN "agility";
ALTER TABLE "character_pets" DROP COLUMN "accuracy";
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.ts lib/db/migrations/
git commit -m "chore: drop unused pet manual-stat columns from character_pets"
```

---

## Task 6: Update documentation

**Files:**
- Modify: `docs/game-mechanics/pets.md`

- [ ] **Step 1: Update the pets doc**

In `docs/game-mechanics/pets.md`:

1. Remove the `⚠️ Known API bug` callout from the Step 2 response example section.
2. Update the comment on `stats` to remove the warning:

```markdown
<!-- before -->
> ⚠️ No `hashed_id`, no `quality`, no combat stats here.
```

Stays the same (that's about `character.equipped_pet` not having stats — still true).

The bug note to remove is in the `CharacterPet` example block. Remove this line:

```
// ⚠️ Known API bug: these may return 0 even when trained. Use manual inputs as fallback.
```

And the note below the table:

```
> ⚠️ **Known API bug:** `stats.*` fields often return 0 even when the pet has trained skills. Until fixed, use manual combat stat inputs in the Dungeon Planner.
```

Replace with:

```
> `stats.*` fields return the pet's trained skill levels. Combat contributions are `floor(stat × 2.4)`, identical to character skills.
```

- [ ] **Step 2: Commit**

```bash
git add docs/game-mechanics/pets.md
git commit -m "docs: remove API-bug warning from pets.md — stats are now reliable"
```

---

## Task 7: Open PR

- [ ] **Push the branch**

```bash
git push -u origin feat/pet-stats-api
```

- [ ] **Open PR**

```bash
gh pr create \
  --title "feat: compute pet combat stats from API instead of manual inputs" \
  --body "$(cat <<'EOF'
## Summary
- The IdleMMO pets endpoint now correctly returns non-zero \`stats.strength/defence/speed\`
- Replaces the manual input system in Dungeon Planner with values computed inline: \`floor(skill × 2.4)\`
- Deletes the \`pet-stats\` API route (GET + POST) — no longer needed
- Simplifies \`sync-pet\` by dropping the redundant \`getCharacterInfo\` call
- Drops 4 orphaned DB columns (\`attack_power/protection/agility/accuracy\`) with migration
- Updates \`CharacterPet\` interface with new API fields (\`experience\`, \`health\`, \`battle\`, \`location\`, \`evolution.can_evolve\`, \`evolution.next_bonus\`)

## Test plan
- [ ] Run integration tests: \`npm test -- tests/integration/characters\` — equipped pet stats must be > 0
- [ ] Open Dungeon Planner, select a character with a pet — confirm computed stats appear (no inputs)
- [ ] Confirm combat stat breakdown shows pet row with correct values
- [ ] Run \`npx tsc --noEmit\` — no errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Do not merge** — wait for user approval.
