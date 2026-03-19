"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  User,
} from "lucide-react";
import { savePreset, deletePreset, type SlotMap } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type WeaponStyle = "DUAL_DAGGER" | "SWORD_SHIELD" | "BOW";

type SlotKey =
  | "main_hand"
  | "off_hand"
  | "helmet"
  | "chestplate"
  | "greaves"
  | "gauntlets"
  | "boots";

interface ItemData {
  hashedId: string;
  name: string;
  quality: string;
  imageUrl: string | null;
  maxTier: number;
  tier: number;
  stats: Record<string, number>;
  tierModifiers: Record<string, number>;
}

interface GearSet {
  weaponStyle: WeaponStyle;
  slots: Partial<Record<SlotKey, ItemData>>;
}

interface CatalogItem {
  hashedId: string;
  name: string;
  quality: string;
  imageUrl: string | null;
}

interface SavedPreset {
  id: string;
  name: string;
  weaponStyle: string;
  slots: Record<string, { hashedId: string; tier: number }>;
  characterId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_SET = (style: WeaponStyle = "SWORD_SHIELD"): GearSet => ({
  weaponStyle: style,
  slots: {},
});

const SLOT_LABELS: Record<SlotKey, string> = {
  main_hand: "Main Hand",
  off_hand: "Off Hand",
  helmet: "Helmet",
  chestplate: "Chestplate",
  greaves: "Greaves",
  gauntlets: "Gauntlets",
  boots: "Boots",
};

const QUALITY_COLORS: Record<string, string> = {
  COMMON: "text-zinc-400",
  UNCOMMON: "text-green-400",
  RARE: "text-blue-400",
  EPIC: "text-purple-400",
  LEGENDARY: "text-yellow-400",
};

function getSlots(style: WeaponStyle): SlotKey[] {
  const armor: SlotKey[] = ["helmet", "chestplate", "greaves", "gauntlets", "boots"];
  if (style === "BOW") return ["main_hand", ...armor];
  return ["main_hand", "off_hand", ...armor];
}

function getSlotType(style: WeaponStyle, slot: SlotKey): string {
  if (slot === "helmet") return "HELMET";
  if (slot === "chestplate") return "CHESTPLATE";
  if (slot === "greaves") return "GREAVES";
  if (slot === "gauntlets") return "GAUNTLETS";
  if (slot === "boots") return "BOOTS";
  if (slot === "off_hand") return style === "DUAL_DAGGER" ? "DAGGER" : "SHIELD";
  // main_hand
  if (style === "DUAL_DAGGER") return "DAGGER";
  if (style === "BOW") return "BOW";
  return "SWORD";
}

function applyTier(
  stats: Record<string, number>,
  tier: number,
  modifiers: Record<string, number>
): Record<string, number> {
  if (tier <= 0 || !modifiers) return stats;
  const mult = modifiers[String(tier)] ?? 1;
  return Object.fromEntries(
    Object.entries(stats).map(([k, v]) => [k, Math.round(v * mult)])
  );
}

function computeSetStats(set: GearSet): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of Object.values(set.slots)) {
    if (!item) continue;
    const effective = applyTier(item.stats, item.tier, item.tierModifiers);
    for (const [stat, value] of Object.entries(effective)) {
      totals[stat] = (totals[stat] ?? 0) + value;
    }
  }
  return totals;
}

function capitalize(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface GearCalculatorProps {
  presets: SavedPreset[];
  characters: { hashed_id: string; name: string }[];
}

export function GearCalculator({ presets: initialPresets, characters }: GearCalculatorProps) {
  const [setA, setSetA] = useState<GearSet>(EMPTY_SET());
  const [setB, setSetB] = useState<GearSet>(EMPTY_SET());
  const [presets, setPresets] = useState(initialPresets);

  // Character selector
  const [characterId, setCharacterId] = useState("");
  const [charStats, setCharStats] = useState<Record<string, number>>({});
  const [charLoading, setCharLoading] = useState(false);

  // Item picker state
  const [picker, setPicker] = useState<{ side: "A" | "B"; slot: SlotKey } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [fetchingItem, setFetchingItem] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Preset save UI
  const [saveTarget, setSaveTarget] = useState<"A" | "B" | null>(null);
  const [presetName, setPresetName] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Character stats fetch ──────────────────────────────────────────────────

  useEffect(() => {
    if (!characterId) {
      setCharStats({});
      return;
    }
    let cancelled = false;
    setCharLoading(true);
    fetch(`/api/idlemmo/character/${characterId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const stats: Record<string, number> = {};
        if (data.stats) {
          for (const [key, val] of Object.entries(data.stats as Record<string, { level: number }>)) {
            stats[key] = val.level;
          }
        }
        setCharStats(stats);
      })
      .catch(() => setCharStats({}))
      .finally(() => !cancelled && setCharLoading(false));
    return () => { cancelled = true; };
  }, [characterId]);

  // ── Item search ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!picker) {
      setResults([]);
      setQuery("");
      return;
    }
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [picker]);

  useEffect(() => {
    if (!picker) return;
    const type = getSlotType(
      picker.side === "A" ? setA.weaponStyle : setB.weaponStyle,
      picker.slot
    );

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/items?type=${type}&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(
          (data.items ?? []).map((i: { hashedId: string; name: string; quality: string; imageUrl: string | null }) => ({
            hashedId: i.hashedId,
            name: i.name,
            quality: i.quality,
            imageUrl: i.imageUrl,
          }))
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, picker, setA.weaponStyle, setB.weaponStyle]);

  // ── Item selection ─────────────────────────────────────────────────────────

  const selectItem = useCallback(
    async (catalogItem: CatalogItem) => {
      if (!picker) return;
      setFetchingItem(true);

      try {
        const res = await fetch(`/api/idlemmo/item/${catalogItem.hashedId}`);
        const data = await res.json();
        const item = data.item;

        const itemData: ItemData = {
          hashedId: catalogItem.hashedId,
          name: catalogItem.name,
          quality: catalogItem.quality,
          imageUrl: catalogItem.imageUrl,
          maxTier: item.max_tier ?? 0,
          tier: 0,
          stats: item.stats ?? {},
          tierModifiers: item.tier_modifiers ?? {},
        };

        const update = (prev: GearSet): GearSet => ({
          ...prev,
          slots: { ...prev.slots, [picker.slot]: itemData },
        });

        if (picker.side === "A") setSetA(update);
        else setSetB(update);
      } catch {
        // silently fail — slot stays empty
      } finally {
        setFetchingItem(false);
        setPicker(null);
      }
    },
    [picker]
  );

  // ── Tier change ────────────────────────────────────────────────────────────

  function setTier(side: "A" | "B", slot: SlotKey, tier: number) {
    const update = (prev: GearSet): GearSet => {
      const existing = prev.slots[slot];
      if (!existing) return prev;
      return { ...prev, slots: { ...prev.slots, [slot]: { ...existing, tier } } };
    };
    if (side === "A") setSetA(update);
    else setSetB(update);
  }

  function removeItem(side: "A" | "B", slot: SlotKey) {
    const update = (prev: GearSet): GearSet => {
      const next = { ...prev.slots };
      delete next[slot];
      return { ...prev, slots: next };
    };
    if (side === "A") setSetA(update);
    else setSetB(update);
  }

  // ── Weapon style change ────────────────────────────────────────────────────

  function setWeaponStyle(side: "A" | "B", style: WeaponStyle) {
    const update = (prev: GearSet): GearSet => {
      const next = { ...prev.slots };
      delete next.main_hand;
      delete next.off_hand;
      return { ...prev, weaponStyle: style, slots: next };
    };
    if (side === "A") setSetA(update);
    else setSetB(update);
  }

  // ── Copy ──────────────────────────────────────────────────────────────────

  function copyAtoB() {
    setSetB({ weaponStyle: setA.weaponStyle, slots: { ...setA.slots } });
  }
  function copyBtoA() {
    setSetA({ weaponStyle: setB.weaponStyle, slots: { ...setB.slots } });
  }

  // ── Presets ───────────────────────────────────────────────────────────────

  async function handleSave(side: "A" | "B") {
    if (!presetName.trim()) return;
    const set = side === "A" ? setA : setB;
    setSaving(true);
    const slots: SlotMap = {};
    for (const [slot, item] of Object.entries(set.slots)) {
      if (item) slots[slot] = { hashedId: item.hashedId, tier: item.tier };
    }
    await savePreset({
      name: presetName.trim(),
      weaponStyle: set.weaponStyle,
      slots,
      characterId: characterId || undefined,
    });
    setPresetName("");
    setSaveTarget(null);
    setSaving(false);
  }

  async function loadPreset(preset: SavedPreset, side: "A" | "B") {
    const slotEntries = Object.entries(preset.slots);
    const fetched = await Promise.all(
      slotEntries.map(async ([, { hashedId, tier }]) => {
        try {
          const res = await fetch(`/api/idlemmo/item/${hashedId}`);
          const data = await res.json();
          const item = data.item;
          return {
            hashedId,
            name: item.name,
            quality: item.quality,
            imageUrl: item.image_url ?? null,
            maxTier: item.max_tier ?? 0,
            tier,
            stats: item.stats ?? {},
            tierModifiers: item.tier_modifiers ?? {},
          } as ItemData;
        } catch {
          return null;
        }
      })
    );

    const slots: Partial<Record<SlotKey, ItemData>> = {};
    slotEntries.forEach(([slot], i) => {
      const item = fetched[i];
      if (item) slots[slot as SlotKey] = item;
    });

    const loaded: GearSet = { weaponStyle: preset.weaponStyle as WeaponStyle, slots };
    if (side === "A") setSetA(loaded);
    else setSetB(loaded);
  }

  async function handleDelete(id: string) {
    await deletePreset(id);
    setPresets((p) => p.filter((x) => x.id !== id));
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const statsA = computeSetStats(setA);
  const statsB = computeSetStats(setB);

  const allStatKeys = Array.from(
    new Set([...Object.keys(statsA), ...Object.keys(statsB), ...Object.keys(charStats)])
  ).sort();

  const totalA = { ...charStats };
  const totalB = { ...charStats };
  for (const [k, v] of Object.entries(statsA)) totalA[k] = (totalA[k] ?? 0) + v;
  for (const [k, v] of Object.entries(statsB)) totalB[k] = (totalB[k] ?? 0) + v;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Gear Comparison</h1>

        {/* Character selector */}
        <div className="flex items-center gap-2 min-w-0">
          <User className="size-4 text-muted-foreground shrink-0" />
          <select
            className="text-sm bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
          >
            <option value="">No character (gear stats only)</option>
            {characters.map((c) => (
              <option key={c.hashed_id} value={c.hashed_id}>
                {c.name}
              </option>
            ))}
          </select>
          {charLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>
      </div>

      {/* Presets */}
      {presets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saved Presets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <div key={p.id} className="flex items-center gap-1 border border-border rounded-md px-2 py-1 text-sm">
                <span>{p.name}</span>
                <button
                  onClick={() => loadPreset(p, "A")}
                  className="text-xs text-muted-foreground hover:text-foreground px-1"
                  title="Load into Set A"
                >
                  →A
                </button>
                <button
                  onClick={() => loadPreset(p, "B")}
                  className="text-xs text-muted-foreground hover:text-foreground px-1"
                  title="Load into Set B"
                >
                  →B
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Two-column gear sets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GearSetPanel
          label="A"
          set={setA}
          onSlotClick={(slot) => setPicker({ side: "A", slot })}
          onTierChange={(slot, tier) => setTier("A", slot, tier)}
          onRemove={(slot) => removeItem("A", slot)}
          onWeaponStyleChange={(style) => setWeaponStyle("A", style)}
          activePicker={picker?.side === "A" ? picker.slot : null}
        />
        <GearSetPanel
          label="B"
          set={setB}
          onSlotClick={(slot) => setPicker({ side: "B", slot })}
          onTierChange={(slot, tier) => setTier("B", slot, tier)}
          onRemove={(slot) => removeItem("B", slot)}
          onWeaponStyleChange={(style) => setWeaponStyle("B", style)}
          activePicker={picker?.side === "B" ? picker.slot : null}
        />
      </div>

      {/* Copy buttons */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="sm" onClick={copyAtoB}>
          Copy A → B
        </Button>
        <ArrowLeftRight className="size-4 text-muted-foreground" />
        <Button variant="outline" size="sm" onClick={copyBtoA}>
          Copy B → A
        </Button>
      </div>

      {/* Save as preset */}
      <div className="flex flex-wrap gap-3">
        {(["A", "B"] as const).map((side) => (
          <div key={side} className="flex items-center gap-2">
            {saveTarget === side ? (
              <>
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder={`Name for Set ${side}…`}
                  className="h-8 text-sm w-44"
                  onKeyDown={(e) => e.key === "Enter" && handleSave(side)}
                  autoFocus
                />
                <Button size="sm" className="h-8" disabled={saving} onClick={() => handleSave(side)}>
                  <Save className="size-3.5 mr-1" /> Save
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setSaveTarget(null)}>
                  <X className="size-3.5" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setSaveTarget(side); setPresetName(""); }}
              >
                <Save className="size-3.5 mr-1" /> Save Set {side}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Item Picker Panel */}
      {picker && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              Pick {SLOT_LABELS[picker.slot]} for Set {picker.side}
            </CardTitle>
            <button onClick={() => setPicker(null)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="h-8 text-sm"
            />
            <div className="max-h-56 overflow-y-auto flex flex-col gap-1">
              {searching && (
                <p className="text-xs text-muted-foreground py-2 text-center">Searching…</p>
              )}
              {fetchingItem && (
                <p className="text-xs text-muted-foreground py-2 text-center">Loading item details…</p>
              )}
              {!searching && !fetchingItem && results.length === 0 && (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  {query ? "No items found." : "Start typing to search."}
                </p>
              )}
              {!fetchingItem && results.map((item) => (
                <button
                  key={item.hashedId}
                  onClick={() => selectItem(item)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent text-left transition-colors"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="size-6 object-contain shrink-0" />
                  ) : (
                    <div className="size-6 bg-muted rounded shrink-0" />
                  )}
                  <span className="flex-1 truncate">{item.name}</span>
                  <span className={`text-xs shrink-0 ${QUALITY_COLORS[item.quality] ?? "text-muted-foreground"}`}>
                    {item.quality}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Table */}
      {allStatKeys.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Total Stats Comparison
              {characterId && characters.find((c) => c.hashed_id === characterId) && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (incl. {characters.find((c) => c.hashed_id === characterId)!.name}&apos;s base stats)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">Stat</th>
                  <th className="text-right py-2 font-medium">Set A</th>
                  <th className="text-right py-2 font-medium">Set B</th>
                  <th className="text-right py-2 font-medium">Δ (B − A)</th>
                </tr>
              </thead>
              <tbody>
                {allStatKeys.map((stat) => {
                  const a = totalA[stat] ?? 0;
                  const b = totalB[stat] ?? 0;
                  const delta = b - a;
                  return (
                    <tr key={stat} className="border-b border-border/50 last:border-0">
                      <td className="py-2 capitalize">{capitalize(stat)}</td>
                      <td className="py-2 text-right tabular-nums">{a}</td>
                      <td className="py-2 text-right tabular-nums">{b}</td>
                      <td
                        className={`py-2 text-right tabular-nums font-medium ${
                          delta > 0
                            ? "text-green-500"
                            : delta < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── GearSetPanel ─────────────────────────────────────────────────────────────

function GearSetPanel({
  label,
  set,
  onSlotClick,
  onTierChange,
  onRemove,
  onWeaponStyleChange,
  activePicker,
}: {
  label: string;
  set: GearSet;
  onSlotClick: (slot: SlotKey) => void;
  onTierChange: (slot: SlotKey, tier: number) => void;
  onRemove: (slot: SlotKey) => void;
  onWeaponStyleChange: (style: WeaponStyle) => void;
  activePicker: SlotKey | null;
}) {
  const slots = getSlots(set.weaponStyle);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">Set {label}</h2>
      </div>

      {/* Weapon style toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
        {(["SWORD_SHIELD", "DUAL_DAGGER", "BOW"] as WeaponStyle[]).map((style) => (
          <button
            key={style}
            onClick={() => onWeaponStyleChange(style)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              set.weaponStyle === style
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {style === "SWORD_SHIELD" ? "Sword & Shield" : style === "DUAL_DAGGER" ? "Dual Dagger" : "Bow"}
          </button>
        ))}
      </div>

      {/* Slots */}
      <div className="flex flex-col gap-2">
        {slots.map((slot) => (
          <SlotCard
            key={slot}
            slotKey={slot}
            item={set.slots[slot] ?? null}
            isActive={activePicker === slot}
            onEdit={() => onSlotClick(slot)}
            onTierChange={(tier) => onTierChange(slot, tier)}
            onRemove={() => onRemove(slot)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── SlotCard ─────────────────────────────────────────────────────────────────

function SlotCard({
  slotKey,
  item,
  isActive,
  onEdit,
  onTierChange,
  onRemove,
}: {
  slotKey: SlotKey;
  item: ItemData | null;
  isActive: boolean;
  onEdit: () => void;
  onTierChange: (tier: number) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`border rounded-md px-3 py-2.5 transition-colors ${
        isActive ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-24 shrink-0">
          {SLOT_LABELS[slotKey]}
        </span>

        {item ? (
          <>
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="size-5 object-contain shrink-0" />
            ) : (
              <div className="size-5 bg-muted rounded shrink-0" />
            )}
            <span
              className={`flex-1 text-sm truncate font-medium ${
                QUALITY_COLORS[item.quality] ?? ""
              }`}
            >
              {item.name}
            </span>
            <button onClick={onEdit} className="text-muted-foreground hover:text-foreground shrink-0">
              <Pencil className="size-3.5" />
            </button>
            <button onClick={onRemove} className="text-muted-foreground hover:text-destructive shrink-0">
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={onEdit}
            className="flex-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
          >
            <Plus className="size-3.5" />
            Add item
          </button>
        )}
      </div>

      {/* Tier control */}
      {item && item.maxTier > 0 && (
        <div className="flex items-center gap-2 mt-2 ml-[6.5rem]">
          <span className="text-xs text-muted-foreground">Tier</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onTierChange(Math.max(0, item.tier - 1))}
              disabled={item.tier <= 0}
              className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="size-3.5" />
            </button>
            <span className="text-xs w-5 text-center tabular-nums">{item.tier}</span>
            <button
              onClick={() => onTierChange(Math.min(item.maxTier, item.tier + 1))}
              disabled={item.tier >= item.maxTier}
              className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="size-3.5" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">/ {item.maxTier}</span>
        </div>
      )}
    </div>
  );
}
