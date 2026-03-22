"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Copy, User } from "lucide-react";
import { savePreset, updatePreset, deletePreset, type SlotMap, type SavedPreset } from "./actions";
import { useCharacterStats } from "./hooks/useCharacterStats";
import { computeGearStats, buildSlotStats } from "./lib/gear-stats";
import { GearSetPanel } from "./components/GearSetPanel";
import { ItemPickerModal } from "./components/ItemPickerModal";
import { StatsPanel } from "./components/StatsPanel";
import { PresetManager } from "./components/PresetManager";
import type {
  WeaponStyle, SlotKey, SlotSelection, GearSet, CatalogItem, InspectEntry, ComputedStats, SlotStatsMap,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_SET = (style: WeaponStyle = "SWORD_SHIELD"): GearSet => ({
  weaponStyle: style,
  slots: {},
});

// ─── Main Component ───────────────────────────────────────────────────────────

interface GearCalculatorProps {
  presets:    SavedPreset[];
  itemsMap:   Record<string, { name: string; quality: string; imageUrl: string | null }>;
  characters: { hashed_id: string; name: string }[];
}

export function GearCalculator({ presets: initialPresets, itemsMap, characters }: GearCalculatorProps) {
  const [setA, setSetA] = useState<GearSet>(EMPTY_SET());
  const [setB, setSetB] = useState<GearSet>(EMPTY_SET());
  const [presets, setPresets] = useState(initialPresets);

  // Pre-select primary character (first in list)
  const [characterId, setCharacterId] = useState(characters[0]?.hashed_id ?? "");

  const { charStats, charLoading } = useCharacterStats(characterId);

  // Computed stats — null until Compare is clicked
  const [computed, setComputed]   = useState<ComputedStats | null>(null);
  const [comparing, setComparing] = useState(false);

  // Per-slot item stat contributions — populated after Compare
  const [slotStatsA, setSlotStatsA] = useState<SlotStatsMap>({});
  const [slotStatsB, setSlotStatsB] = useState<SlotStatsMap>({});

  // Item picker
  const [picker, setPicker] = useState<{ side: "A" | "B"; slot: SlotKey } | null>(null);

  // Running items map — merges server-provided map with items discovered during the session
  const [localItemsMap, setLocalItemsMap] = useState(itemsMap);

  function invalidate() {
    setComputed(null);
    setSlotStatsA({});
    setSlotStatsB({});
  }

  // ── Invalidate comparison when character changes ───────────────────────────

  useEffect(() => {
    invalidate();
  }, [characterId]);

  // ── Auto-load preset when character is selected ────────────────────────────

  useEffect(() => {
    if (!characterId) return;
    const linked = presets.find((p) => p.characterId === characterId);
    if (linked) loadPreset(linked, "A");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  // ── Item selection ─────────────────────────────────────────────────────────

  const selectItem = useCallback(
    (catalogItem: CatalogItem) => {
      if (!picker) return;
      const selection: SlotSelection = {
        hashedId: catalogItem.hashedId,
        name: catalogItem.name,
        quality: catalogItem.quality,
        imageUrl: catalogItem.imageUrl,
        tier: 1,
        maxTier: null,
      };
      const update = (prev: GearSet): GearSet => ({
        ...prev,
        slots: { ...prev.slots, [picker.slot]: selection },
      });
      if (picker.side === "A") setSetA(update);
      else setSetB(update);
      invalidate();
      setPicker(null);

      // Background fetch for maxTier
      const { side, slot } = picker;
      fetch(`/api/idlemmo/item/${catalogItem.hashedId}`)
        .then((r) => r.json())
        .then((data) => {
          const mt: number | undefined = data.item?.max_tier;
          if (!mt) return;
          const updateMaxTier = (prev: GearSet): GearSet => {
            const existing = prev.slots[slot];
            if (!existing || existing.hashedId !== catalogItem.hashedId) return prev;
            return { ...prev, slots: { ...prev.slots, [slot]: { ...existing, maxTier: mt } } };
          };
          if (side === "A") setSetA(updateMaxTier);
          else setSetB(updateMaxTier);
        })
        .catch(() => {});
    },
    [picker]
  );

  // ── Tier change ────────────────────────────────────────────────────────────

  function setTier(side: "A" | "B", slot: SlotKey, tier: number) {
    if (tier < 1) return;
    const update = (prev: GearSet): GearSet => {
      const existing = prev.slots[slot];
      if (!existing) return prev;
      const capped = existing.maxTier ? Math.min(tier, existing.maxTier) : tier;
      return { ...prev, slots: { ...prev.slots, [slot]: { ...existing, tier: capped } } };
    };
    if (side === "A") setSetA(update);
    else setSetB(update);
    invalidate();
  }

  function removeItem(side: "A" | "B", slot: SlotKey) {
    const update = (prev: GearSet): GearSet => {
      const next = { ...prev.slots };
      delete next[slot];
      return { ...prev, slots: next };
    };
    if (side === "A") setSetA(update);
    else setSetB(update);
    invalidate();
  }

  function setWeaponStyle(side: "A" | "B", style: WeaponStyle) {
    const update = (prev: GearSet): GearSet => {
      const next = { ...prev.slots };
      delete next.main_hand;
      delete next.off_hand;
      return { ...prev, weaponStyle: style, slots: next };
    };
    if (side === "A") setSetA(update);
    else setSetB(update);
    invalidate();
  }

  function clearSet(side: "A" | "B") {
    const reset = EMPTY_SET(side === "A" ? setA.weaponStyle : setB.weaponStyle);
    if (side === "A") setSetA(reset);
    else setSetB(reset);
    invalidate();
  }

  // ── Copy A → B ─────────────────────────────────────────────────────────────

  function copyAtoB() {
    setSetB({ weaponStyle: setA.weaponStyle, slots: { ...setA.slots } });
    invalidate();
  }

  // ── Compare ────────────────────────────────────────────────────────────────

  async function compare() {
    setComparing(true);
    setComputed(null);
    setSlotStatsA({});
    setSlotStatsB({});

    const allIds = new Set([
      ...Object.values(setA.slots).filter(Boolean).map((i) => i!.hashedId),
      ...Object.values(setB.slots).filter(Boolean).map((i) => i!.hashedId),
    ]);

    const inspects: Record<string, InspectEntry> = {};
    await Promise.all(
      Array.from(allIds).map(async (id) => {
        try {
          const res = await fetch(`/api/idlemmo/item/${id}`);
          const data = await res.json();
          inspects[id] = data.item;
        } catch {
          inspects[id] = { stats: null, tier_modifiers: null };
        }
      })
    );

    // Update maxTier on all slots from inspect data
    const applyMaxTier = (prev: GearSet): GearSet => {
      let changed = false;
      const next = { ...prev.slots };
      for (const [slot, item] of Object.entries(prev.slots)) {
        if (!item) continue;
        const mt = inspects[item.hashedId]?.max_tier;
        if (mt !== undefined && mt !== item.maxTier) {
          next[slot as SlotKey] = { ...item, maxTier: mt };
          changed = true;
        }
      }
      return changed ? { ...prev, slots: next } : prev;
    };
    setSetA(applyMaxTier);
    setSetB(applyMaxTier);

    setSlotStatsA(buildSlotStats(setA, inspects));
    setSlotStatsB(buildSlotStats(setB, inspects));
    setComputed(computeGearStats(setA, setB, inspects, charStats));
    setComparing(false);
  }

  // ── Presets ────────────────────────────────────────────────────────────────

  async function handleSave(side: "A" | "B", name: string) {
    const set = side === "A" ? setA : setB;
    const slots: SlotMap = {};
    for (const [slot, item] of Object.entries(set.slots)) {
      if (item) slots[slot] = { hashedId: item.hashedId, tier: item.tier };
    }
    const newPreset = await savePreset({
      name,
      weaponStyle: set.weaponStyle,
      slots,
      characterId: characterId || undefined,
    });
    setPresets((p) => [...p, newPreset]);
  }

  async function handleUpdate(id: string, side: "A" | "B") {
    const set = side === "A" ? setA : setB;
    const slots: SlotMap = {};
    for (const [slot, item] of Object.entries(set.slots)) {
      if (item) slots[slot] = { hashedId: item.hashedId, tier: item.tier };
    }
    await updatePreset(id, { weaponStyle: set.weaponStyle, slots, characterId: characterId || undefined });
    setPresets((p) =>
      p.map((x) =>
        x.id === id ? { ...x, weaponStyle: set.weaponStyle, slots, characterId: characterId || undefined } : x
      )
    );
  }

  function loadPreset(preset: SavedPreset, side: "A" | "B") {
    const slots: Partial<Record<SlotKey, SlotSelection>> = {};
    for (const [slot, { hashedId, tier }] of Object.entries(preset.slots)) {
      const meta = localItemsMap[hashedId];
      slots[slot as SlotKey] = {
        hashedId,
        name: meta?.name ?? hashedId,
        quality: meta?.quality ?? "STANDARD",
        imageUrl: meta?.imageUrl ?? null,
        tier,
        maxTier: null,
      };
    }
    const loaded: GearSet = { weaponStyle: preset.weaponStyle as WeaponStyle, slots };
    if (side === "A") setSetA(loaded);
    else setSetB(loaded);
    invalidate();

    // Background-fetch maxTier for each unique item in the preset
    const uniqueIds = [...new Set(Object.values(preset.slots).map((s) => s.hashedId))];
    for (const hashedId of uniqueIds) {
      fetch(`/api/idlemmo/item/${hashedId}`)
        .then((r) => r.json())
        .then((data) => {
          const mt: number | undefined = data.item?.max_tier;
          if (!mt) return;
          const applyMaxTier = (prev: GearSet): GearSet => {
            let changed = false;
            const next = { ...prev.slots };
            for (const [slot, item] of Object.entries(prev.slots)) {
              if (item?.hashedId === hashedId && item.maxTier !== mt) {
                next[slot as SlotKey] = { ...item, maxTier: mt };
                changed = true;
              }
            }
            return changed ? { ...prev, slots: next } : prev;
          };
          if (side === "A") setSetA(applyMaxTier);
          else setSetB(applyMaxTier);
        })
        .catch(() => {});
    }
  }

  async function handleDelete(id: string) {
    await deletePreset(id);
    setPresets((p) => p.filter((x) => x.id !== id));
  }

  // ── localItemsMap update callback (for picker results) ─────────────────────

  const handlePickerResults = useCallback((items: CatalogItem[]) => {
    setLocalItemsMap((prev) => {
      const additions: typeof prev = {};
      for (const i of items) {
        if (!prev[i.hashedId]) {
          additions[i.hashedId] = { name: i.name, quality: i.quality, imageUrl: i.imageUrl };
        }
      }
      return Object.keys(additions).length ? { ...prev, ...additions } : prev;
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Gear Comparison</h1>

        {/* Character selector */}
        <div className="flex items-center gap-2">
          <User className="size-4 text-muted-foreground shrink-0" />
          <select
            className="text-sm bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
          >
            <option value="">No character (gear stats only)</option>
            {characters.map((c) => (
              <option key={c.hashed_id} value={c.hashed_id}>{c.name}</option>
            ))}
          </select>
          {charLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>
      </div>

      {/* Saved presets */}
      <PresetManager
        presets={presets}
        characters={characters}
        onLoad={loadPreset}
        onSave={handleSave}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {/* Two-column sets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(["A", "B"] as const).map((side) => {
          const set = side === "A" ? setA : setB;
          const slotStats = side === "A" ? slotStatsA : slotStatsB;
          return (
            <GearSetPanel
              key={side}
              label={side}
              set={set}
              slotStats={slotStats}
              onSlotClick={(slot) => setPicker({ side, slot })}
              onTierChange={(slot, tier) => setTier(side, slot, tier)}
              onRemove={(slot) => removeItem(side, slot)}
              onWeaponStyleChange={(style) => setWeaponStyle(side, style)}
              onClear={() => clearSet(side)}
              activePicker={picker?.side === side ? picker.slot : null}
            />
          );
        })}
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={copyAtoB}>
          <Copy className="size-3.5 mr-1.5" /> Copy A → B
        </Button>
      </div>

      {/* Item picker */}
      {picker && (
        <ItemPickerModal
          picker={picker}
          weaponStyleA={setA.weaponStyle}
          weaponStyleB={setB.weaponStyle}
          onSelect={selectItem}
          onClose={() => setPicker(null)}
          onResults={handlePickerResults}
        />
      )}

      {/* Stats table */}
      <StatsPanel
        computed={computed}
        charStats={charStats}
        slotStatsA={slotStatsA}
        slotStatsB={slotStatsB}
        setA={setA}
        setB={setB}
        characters={characters}
        characterId={characterId}
        comparing={comparing}
        onCompare={compare}
      />
    </div>
  );
}
