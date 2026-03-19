"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Copy,
  Eraser,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
  User,
  X,
} from "lucide-react";
import { savePreset, deletePreset, type SlotMap, type SavedPreset } from "./actions";

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

/** What we store before Compare — catalog data only, no stats */
interface SlotSelection {
  hashedId: string;
  name: string;
  quality: string;
  imageUrl: string | null;
  tier: number;
}

interface GearSet {
  weaponStyle: WeaponStyle;
  slots: Partial<Record<SlotKey, SlotSelection>>;
}

interface CatalogItem {
  hashedId: string;
  name: string;
  quality: string;
  imageUrl: string | null;
}

interface ComputedStats {
  setA: Record<string, number>;
  setB: Record<string, number>;
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

const QUALITIES = ["STANDARD", "REFINED", "PREMIUM", "EPIC", "LEGENDARY", "MYTHIC"] as const;

const QUALITY_COLORS: Record<string, string> = {
  STANDARD:  "text-zinc-400",
  REFINED:   "text-green-400",
  PREMIUM:   "text-blue-400",
  EPIC:      "text-purple-400",
  LEGENDARY: "text-yellow-400",
  MYTHIC:    "text-red-400",
};


function getSlots(style: WeaponStyle): SlotKey[] {
  const armor: SlotKey[] = ["helmet", "chestplate", "greaves", "gauntlets", "boots"];
  return style === "BOW" ? ["main_hand", ...armor] : ["main_hand", "off_hand", ...armor];
}

function getSlotType(style: WeaponStyle, slot: SlotKey): string {
  if (slot === "helmet") return "HELMET";
  if (slot === "chestplate") return "CHESTPLATE";
  if (slot === "greaves") return "GREAVES";
  if (slot === "gauntlets") return "GAUNTLETS";
  if (slot === "boots") return "BOOTS";
  if (slot === "off_hand") return style === "DUAL_DAGGER" ? "DAGGER" : "SHIELD";
  if (style === "DUAL_DAGGER") return "DAGGER";
  if (style === "BOW") return "BOW";
  return "SWORD";
}

/** Character raw stat → derived stat key + multiplier */
const CHAR_STAT_MAP: Record<string, { key: string; label: string; multiplier: number }> = {
  strength:  { key: "attack_power", label: "Attack Power", multiplier: 2.4 },
  defence:   { key: "protection",   label: "Protection",   multiplier: 2.4 },
  speed:     { key: "agility",      label: "Agility",      multiplier: 2.4 },
  dexterity: { key: "accuracy",     label: "Accuracy",     multiplier: 2.4 },
};

/** Human-readable labels for known stat keys */
const STAT_LABELS: Record<string, string> = {
  attack_power: "Attack Power",
  protection:   "Protection",
  agility:      "Agility",
  accuracy:     "Accuracy",
  damage:       "Damage",
  defence:      "Defence",
};

function statLabel(key: string) {
  return STAT_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface GearCalculatorProps {
  presets: SavedPreset[];
  /** Item details keyed by hashedId — used to resolve names/quality/imageUrl when loading presets */
  itemsMap: Record<string, { name: string; quality: string; imageUrl: string | null }>;
  characters: { hashed_id: string; name: string }[];
}

export function GearCalculator({ presets: initialPresets, itemsMap, characters }: GearCalculatorProps) {
  const [setA, setSetA] = useState<GearSet>(EMPTY_SET());
  const [setB, setSetB] = useState<GearSet>(EMPTY_SET());
  const [presets, setPresets] = useState(initialPresets);

  // Character selector
  const [characterId, setCharacterId] = useState("");
  const [charStats, setCharStats] = useState<Record<string, number>>({});
  const [charLoading, setCharLoading] = useState(false);

  // Computed stats — null until Compare is clicked
  const [computed, setComputed] = useState<ComputedStats | null>(null);
  const [comparing, setComparing] = useState(false);

  // Item picker
  const [picker, setPicker] = useState<{ side: "A" | "B"; slot: SlotKey } | null>(null);
  const [query, setQuery] = useState("");
  const [qualityFilter, setQualityFilter] = useState<string>("");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Preset save UI
  const [saveTarget, setSaveTarget] = useState<"A" | "B" | null>(null);
  const [presetName, setPresetName] = useState("");
  const [saving, setSaving] = useState(false);

  // Running items map — merges server-provided map with items discovered during the session
  const [localItemsMap, setLocalItemsMap] = useState(itemsMap);

  // Clear computed whenever slots change
  function invalidate() {
    setComputed(null);
  }

  // ── Character stats ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!characterId) { setCharStats({}); return; }
    let cancelled = false;
    setCharLoading(true);
    fetch(`/api/idlemmo/character/${characterId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const stats: Record<string, number> = {};
        if (data.stats) {
          for (const [k, v] of Object.entries(data.stats as Record<string, { level: number }>)) {
            const mapping = CHAR_STAT_MAP[k];
            if (mapping) {
              stats[mapping.key] = Math.round(v.level * mapping.multiplier);
            }
          }
        }
        setCharStats(stats);
        invalidate();
      })
      .catch(() => setCharStats({}))
      .finally(() => { if (!cancelled) setCharLoading(false); });
    return () => { cancelled = true; };
  }, [characterId]);

  // ── Auto-load preset when character is selected ────────────────────────────

  useEffect(() => {
    if (!characterId) return;
    const linked = presets.find((p) => p.characterId === characterId);
    if (linked) loadPreset(linked, "A");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  // ── Item picker search ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!picker) { setResults([]); setQuery(""); setQualityFilter(""); return; }
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
        const params = new URLSearchParams({ type, q: query });
        if (qualityFilter) params.set("quality", qualityFilter);
        const res = await fetch(`/api/items?${params}`);
        const data = await res.json();
        const fetched: CatalogItem[] = (data.items ?? []).map(
          (i: { hashedId: string; name: string; quality: string; imageUrl: string | null }) => ({
            hashedId: i.hashedId,
            name: i.name,
            quality: i.quality,
            imageUrl: i.imageUrl,
          })
        );
        setResults(fetched);
        // Extend local items map with freshly fetched items
        setLocalItemsMap((prev) => {
          const additions: typeof prev = {};
          for (const i of fetched) {
            if (!prev[i.hashedId]) {
              additions[i.hashedId] = { name: i.name, quality: i.quality, imageUrl: i.imageUrl };
            }
          }
          return Object.keys(additions).length ? { ...prev, ...additions } : prev;
        });
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, qualityFilter, picker, setA.weaponStyle, setB.weaponStyle]);

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
      };
      const update = (prev: GearSet): GearSet => ({
        ...prev,
        slots: { ...prev.slots, [picker.slot]: selection },
      });
      if (picker.side === "A") setSetA(update);
      else setSetB(update);
      invalidate();
      setPicker(null);
    },
    [picker]
  );

  // ── Tier change ────────────────────────────────────────────────────────────

  function setTier(side: "A" | "B", slot: SlotKey, tier: number) {
    if (tier < 1) return;
    const update = (prev: GearSet): GearSet => {
      const existing = prev.slots[slot];
      if (!existing) return prev;
      return { ...prev, slots: { ...prev.slots, [slot]: { ...existing, tier } } };
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

    const allIds = new Set([
      ...Object.values(setA.slots).filter(Boolean).map((i) => i!.hashedId),
      ...Object.values(setB.slots).filter(Boolean).map((i) => i!.hashedId),
    ]);

    const inspects: Record<string, { stats: Record<string, number> | null; tier_modifiers: Record<string, number> | null }> = {};
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

    function computeStats(set: GearSet, base: Record<string, number>): Record<string, number> {
      const totals = { ...base };
      for (const item of Object.values(set.slots)) {
        if (!item) continue;
        const inspect = inspects[item.hashedId];
        if (!inspect?.stats) continue;
        const modifier = inspect.tier_modifiers?.[String(item.tier)] ?? 1;
        for (const [stat, value] of Object.entries(inspect.stats)) {
          totals[stat] = (totals[stat] ?? 0) + Math.round(value * modifier);
        }
      }
      return totals;
    }

    setComputed({
      setA: computeStats(setA, charStats),
      setB: computeStats(setB, charStats),
    });
    setComparing(false);
  }

  // ── Presets ────────────────────────────────────────────────────────────────

  async function handleSave(side: "A" | "B") {
    if (!presetName.trim()) return;
    const set = side === "A" ? setA : setB;
    setSaving(true);
    const slots: SlotMap = {};
    for (const [slot, item] of Object.entries(set.slots)) {
      if (item) slots[slot] = { hashedId: item.hashedId, tier: item.tier };
    }
    const newPreset = await savePreset({
      name: presetName.trim(),
      weaponStyle: set.weaponStyle,
      slots,
      characterId: characterId || undefined,
    });
    setPresets((p) => [...p, newPreset]);
    setPresetName("");
    setSaveTarget(null);
    setSaving(false);
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
      };
    }
    const loaded: GearSet = { weaponStyle: preset.weaponStyle as WeaponStyle, slots };
    if (side === "A") setSetA(loaded);
    else setSetB(loaded);
    invalidate();
  }

  async function handleDelete(id: string) {
    await deletePreset(id);
    setPresets((p) => p.filter((x) => x.id !== id));
  }

  // ── Stats table ────────────────────────────────────────────────────────────

  const allStatKeys = computed
    ? Array.from(new Set([...Object.keys(computed.setA), ...Object.keys(computed.setB)])).sort()
    : [];

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
      {presets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saved Presets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const linkedChar = p.characterId
                ? characters.find((c) => c.hashed_id === p.characterId)
                : null;
              return (
                <div key={p.id} className="flex items-center gap-1 border border-border rounded-md px-2 py-1 text-sm">
                  <span>{p.name}</span>
                  {linkedChar && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                      {linkedChar.name}
                    </Badge>
                  )}
                  <button onClick={() => loadPreset(p, "A")} className="text-xs text-muted-foreground hover:text-foreground px-1" title="Load into Set A">→A</button>
                  <button onClick={() => loadPreset(p, "B")} className="text-xs text-muted-foreground hover:text-foreground px-1" title="Load into Set B">→B</button>
                  <button onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Two-column sets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(["A", "B"] as const).map((side) => {
          const set = side === "A" ? setA : setB;
          return (
            <GearSetPanel
              key={side}
              label={side}
              set={set}
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

        <div className="flex-1" />

        {/* Save presets */}
        {(["A", "B"] as const).map((side) => (
          <div key={side} className="flex items-center gap-2">
            {saveTarget === side ? (
              <>
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder={`Name for Set ${side}…`}
                  className="h-8 text-sm w-40"
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
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setSaveTarget(side); setPresetName(""); }}>
                <Save className="size-3.5 mr-1" /> Save Set {side}
              </Button>
            )}
          </div>
        ))}

        <Button onClick={compare} disabled={comparing} className="gap-2">
          <Play className="size-4" />
          {comparing ? "Comparing…" : "Compare"}
        </Button>
      </div>

      {/* Item picker */}
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

            {/* Quality filter */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setQualityFilter("")}
                className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                  qualityFilter === ""
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {QUALITIES.map((q) => (
                <button
                  key={q}
                  onClick={() => setQualityFilter(qualityFilter === q ? "" : q)}
                  className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                    qualityFilter === q
                      ? "border-current font-medium " + QUALITY_COLORS[q]
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {q.charAt(0) + q.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5">
              {searching && <p className="text-xs text-muted-foreground py-3 text-center">Searching…</p>}
              {!searching && results.length === 0 && (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  {query || qualityFilter ? "No items found." : "Start typing or pick a quality."}
                </p>
              )}
              {!searching && results.map((item) => (
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
                    {item.quality.charAt(0) + item.quality.slice(1).toLowerCase()}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats table */}
      {computed ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Total Stats
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
                  const a = computed.setA[stat] ?? 0;
                  const b = computed.setB[stat] ?? 0;
                  const delta = b - a;
                  return (
                    <tr key={stat} className="border-b border-border/50">
                      <td className="py-2">{statLabel(stat)}</td>
                      <td className="py-2 text-right tabular-nums">{a}</td>
                      <td className="py-2 text-right tabular-nums">{b}</td>
                      <td className={`py-2 text-right tabular-nums font-medium ${
                        delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"
                      }`}>
                        {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
                      </td>
                    </tr>
                  );
                })}

                {/* Sum row */}
                {allStatKeys.length > 1 && (() => {
                  const sumA = allStatKeys.reduce((s, k) => s + (computed.setA[k] ?? 0), 0);
                  const sumB = allStatKeys.reduce((s, k) => s + (computed.setB[k] ?? 0), 0);
                  const d = sumB - sumA;
                  return (
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right tabular-nums">{sumA}</td>
                      <td className="py-2 text-right tabular-nums">{sumB}</td>
                      <td className={`py-2 text-right tabular-nums ${
                        d > 0 ? "text-green-500" : d < 0 ? "text-red-500" : "text-muted-foreground"
                      }`}>
                        {d > 0 ? `+${d}` : d === 0 ? "—" : d}
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Select your gear for both sets, then click <span className="font-medium mx-1">Compare</span> to see stats.
        </div>
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
  onClear,
  activePicker,
}: {
  label: string;
  set: GearSet;
  onSlotClick: (slot: SlotKey) => void;
  onTierChange: (slot: SlotKey, tier: number) => void;
  onRemove: (slot: SlotKey) => void;
  onWeaponStyleChange: (style: WeaponStyle) => void;
  onClear: () => void;
  activePicker: SlotKey | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Set {label}</h2>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Clear all slots"
        >
          <Eraser className="size-3.5" /> Clear
        </button>
      </div>

      {/* Weapon style toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-md w-fit text-xs">
        {(["SWORD_SHIELD", "DUAL_DAGGER", "BOW"] as WeaponStyle[]).map((style) => (
          <button
            key={style}
            onClick={() => onWeaponStyleChange(style)}
            className={`px-2.5 py-1 rounded transition-colors ${
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
        {getSlots(set.weaponStyle).map((slot) => (
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
  item: SlotSelection | null;
  isActive: boolean;
  onEdit: () => void;
  onTierChange: (tier: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`border rounded-md px-3 py-2.5 transition-colors ${
      isActive ? "border-primary bg-primary/5" : "border-border"
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-24 shrink-0">{SLOT_LABELS[slotKey]}</span>

        {item ? (
          <>
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="size-5 object-contain shrink-0" />
            ) : (
              <div className="size-5 bg-muted rounded shrink-0" />
            )}
            <span className={`flex-1 text-sm font-medium truncate ${QUALITY_COLORS[item.quality] ?? ""}`}>
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
            <Plus className="size-3.5" /> Add item
          </button>
        )}
      </div>

      {/* Tier control */}
      {item && (
        <div className="flex items-center gap-2 mt-2 ml-[6.5rem]">
          <span className="text-xs text-muted-foreground">Tier</span>
          <input
            type="number"
            min={1}
            value={item.tier}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1) onTierChange(v);
            }}
            className="w-14 h-6 text-xs text-center bg-background border border-border rounded px-1 tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
}
