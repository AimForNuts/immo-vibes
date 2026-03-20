"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Skull, User, Swords, Shield, Wind, Crosshair, Zap,
  Link2, Sparkles, AlertTriangle, Ban, Clock, ChevronDown, ChevronRight, PawPrint,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  assessDungeon,
  totalCombatStats,
  formatDuration,
  COMBAT_STAT_KEYS,
  type StaticDungeon,
  type MFTier,
} from "./difficulty";
import type { SavedPreset } from "../gear/actions";

// ─── Constants ────────────────────────────────────────────────────────────────

// char.stats keys → combat stat keys. Multiplier: 2.4 per level (wiki-documented).
// See docs/game-mechanics/combat-stats.md
const CHAR_STAT_MAP: Record<string, { key: string; skillLabel: string; multiplier: number }> = {
  strength:  { key: "attack_power", skillLabel: "Strength",  multiplier: 2.4 },
  defence:   { key: "protection",   skillLabel: "Defence",   multiplier: 2.4 },
  speed:     { key: "agility",      skillLabel: "Speed",     multiplier: 2.4 },
  dexterity: { key: "accuracy",     skillLabel: "Dexterity", multiplier: 2.4 },
};

const COMBAT_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  attack_power: { label: "Attack Power", icon: Swords },
  protection:   { label: "Protection",   icon: Shield },
  agility:      { label: "Agility",      icon: Wind },
  accuracy:     { label: "Accuracy",     icon: Crosshair },
};

const QUALITY_COLORS: Record<string, string> = {
  STANDARD:  "text-zinc-400",
  REFINED:   "text-green-400",
  PREMIUM:   "text-blue-400",
  EPIC:      "text-purple-400",
  LEGENDARY: "text-yellow-400",
  MYTHIC:    "text-red-400",
};

const SLOT_LABELS: Record<string, string> = {
  main_hand: "Main Hand", off_hand: "Off Hand", helmet: "Helmet",
  chestplate: "Chestplate", greaves: "Greaves", gauntlets: "Gauntlets", boots: "Boots",
};

const NO_GEAR_ID = "__NO_GEAR__";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatBreakdown {
  skillLabel: string;
  skillLevel: number;
  charBase: number;
  gear: Array<{ slotLabel: string; value: number }>;
}

interface EquippedPet {
  name: string;
  level: number;
  quality: string;
  image_url: string | null;
  stats: { strength: number; defence: number; speed: number };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DungeonExplorerProps {
  dungeons: StaticDungeon[];
  presets: SavedPreset[];
  itemsMap: Record<string, { name: string; quality: string; imageUrl: string | null }>;
  characters: { hashed_id: string; name: string }[];
  hasDifficultyData: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DungeonExplorer({ dungeons, presets, itemsMap, characters, hasDifficultyData }: DungeonExplorerProps) {
  const [characterId, setCharacterId] = useState(characters[0]?.hashed_id ?? "");
  const [presetId, setPresetId] = useState(presets[0]?.id ?? NO_GEAR_ID);
  const [combatStats, setCombatStats] = useState<Record<string, number> | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, StatBreakdown> | null>(null);
  const [equippedPet, setEquippedPet] = useState<EquippedPet | null>(null);
  const [loading, setLoading] = useState(false);

  // Expanded stat breakdown
  const [expandedStat, setExpandedStat] = useState<string | null>(null);

  // Manual pet combat stats (API bug: strength/defence/speed return 0)
  const [petStats, setPetStats] = useState({ attack_power: 0, protection: 0, agility: 0, accuracy: 0 });

  // Override total combat
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideValue, setOverrideValue] = useState(0);

  // Efficiency modifier
  const [efficiencyPct, setEfficiencyPct] = useState(0);

  const noGear = presetId === NO_GEAR_ID;
  const selectedPreset = noGear ? null : (presets.find((p) => p.id === presetId) ?? null);

  // Compute combat stats whenever character or preset changes
  useEffect(() => {
    if (!characterId) { setCombatStats(null); setBreakdown(null); setEquippedPet(null); return; }
    let cancelled = false;
    setLoading(true);

    async function compute() {
      const stats: Record<string, number> = {};
      const bk: Record<string, StatBreakdown> = {};

      // 1. Character base combat stats + equipped pet
      try {
        const res = await fetch(`/api/idlemmo/character/${characterId}`);
        const data = await res.json();

        // Character skills → combat stats (×2.4 per level)
        if (data.stats) {
          for (const [k, v] of Object.entries(data.stats as Record<string, { level: number }>)) {
            const m = CHAR_STAT_MAP[k];
            if (!m) continue;
            const base = Math.floor(v.level * m.multiplier);
            stats[m.key] = base;
            bk[m.key] = { skillLabel: m.skillLabel, skillLevel: v.level, charBase: base, gear: [] };
          }
        }

        // Class talent bonuses at combat L70 — see docs/game-mechanics/classes.md
        // Warrior Shield Wall: +40 Protection  |  Shadowblade Shadow's Veil: +40 Agility
        const charClass: string = data.class ?? "";
        const combatLevel: number = (data.stats as Record<string, { level: number }>).combat?.level ?? 0;
        if (combatLevel >= 70) {
          if (charClass === "Warrior") {
            stats.protection = (stats.protection ?? 0) + 40;
            if (!bk.protection) bk.protection = { skillLabel: "Defence", skillLevel: 0, charBase: 0, gear: [] };
            bk.protection.gear.push({ slotLabel: "Warrior — Shield Wall (L70 talent)", value: 40 });
          } else if (charClass === "Shadowblade") {
            stats.agility = (stats.agility ?? 0) + 40;
            if (!bk.agility) bk.agility = { skillLabel: "Speed", skillLevel: 0, charBase: 0, gear: [] };
            bk.agility.gear.push({ slotLabel: "Shadowblade — Shadow's Veil (L70 talent)", value: 40 });
          }
        }

        // Equipped pet → adds strength/defence/speed × 2.4 to combat stats
        // See docs/game-mechanics/pets.md
        if (data.equipped_pet) {
          const pet = data.equipped_pet as EquippedPet;
          setEquippedPet(pet);
          const petStatMap: Record<string, string> = {
            strength: "attack_power",
            defence:  "protection",
            speed:    "agility",
          };
          for (const [petStat, combatKey] of Object.entries(petStatMap)) {
            const level = pet.stats[petStat as keyof typeof pet.stats] ?? 0;
            if (level === 0) continue;
            const value = Math.floor(level * 2.4);
            stats[combatKey] = (stats[combatKey] ?? 0) + value;
            if (!bk[combatKey]) bk[combatKey] = { skillLabel: "", skillLevel: 0, charBase: 0, gear: [] };
            bk[combatKey].gear.push({ slotLabel: `Pet — ${pet.name}`, value });
          }
        } else {
          setEquippedPet(null);
        }
      } catch { /* skip */ }

      if (cancelled) return;

      // 2. Gear stats from preset (skip if "no gear")
      if (selectedPreset) {
        const slots = Object.entries(selectedPreset.slots);
        const uniqueIds = [...new Set(slots.map(([, s]) => s.hashedId))];

        const inspects: Record<string, { stats: Record<string, number> | null; tier_modifiers: Record<string, number> | null }> = {};
        await Promise.all(
          uniqueIds.map(async (id) => {
            try {
              const res = await fetch(`/api/idlemmo/item/${id}`);
              const data = await res.json();
              inspects[id] = data.item;
            } catch {
              inspects[id] = { stats: null, tier_modifiers: null };
            }
          })
        );

        if (cancelled) return;

        for (const [slot, { hashedId, tier }] of slots) {
          const inspect = inspects[hashedId];
          if (!inspect?.stats) continue;
          const slotLabel = SLOT_LABELS[slot] ?? slot;
          const itemName = itemsMap[hashedId]?.name ?? hashedId;
          for (const [stat, baseValue] of Object.entries(inspect.stats)) {
            const addendPerTier = inspect.tier_modifiers?.[stat] ?? 0;
            const effectiveValue = Math.round((baseValue as number) + (tier - 1) * addendPerTier);
            stats[stat] = (stats[stat] ?? 0) + effectiveValue;
            if (!bk[stat]) bk[stat] = { skillLabel: "", skillLevel: 0, charBase: 0, gear: [] };
            bk[stat].gear.push({ slotLabel: `${slotLabel} — ${itemName} T${tier}`, value: effectiveValue });
          }
        }
      }

      if (!cancelled) {
        setCombatStats(stats);
        setBreakdown(bk);
        setLoading(false);
      } else {
        setEquippedPet(null);
      }
    }

    compute().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [characterId, presetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const petStatsTotal = petStats.attack_power + petStats.protection + petStats.agility + petStats.accuracy;
  const computedTotal = combatStats ? totalCombatStats(combatStats) + petStatsTotal : null;
  const combatTotal = overrideEnabled ? overrideValue : computedTotal;

  function effectiveDuration(durationSec: number): number {
    return Math.round(durationSec / ((efficiencyPct + 100) / 100));
  }

  const showStatsSection = noGear || selectedPreset !== null;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skull className="size-6 text-red-500/80 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dungeon Planner</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            ≥ 70% difficulty to enter · ≥ 100% to chain · 130–160% small MF · ≥ 160% max MF
          </p>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <User className="size-3" /> Character
          </label>
          <select
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">— Select character —</option>
            {characters.map((c) => (
              <option key={c.hashed_id} value={c.hashed_id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Swords className="size-3" /> Gear Preset
          </label>
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={NO_GEAR_ID}>— No gear (base stats only) —</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Efficiency modifier */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Zap className="size-3" /> Efficiency Bonus %
            <span className="normal-case font-normal text-muted-foreground/60">— reduces run time</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={9999}
              value={efficiencyPct}
              onChange={(e) => setEfficiencyPct(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-24 text-sm bg-background border border-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
            />
            <span className="text-sm text-muted-foreground">%</span>
            {efficiencyPct > 0 && (
              <button onClick={() => setEfficiencyPct(0)} className="text-xs text-muted-foreground hover:text-foreground">reset</button>
            )}
          </div>
        </div>
      </div>

      {/* Pet combat stats — manual input (API bug: strength/defence/speed return 0) */}
      {equippedPet && (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <PawPrint className="size-3.5 text-muted-foreground/60 shrink-0" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Pet Stats — {equippedPet.name}
            </span>
            <span className={cn("text-[10px] font-mono ml-1", QUALITY_COLORS[equippedPet.quality] ?? "text-muted-foreground")}>
              L{equippedPet.level} {equippedPet.quality.charAt(0) + equippedPet.quality.slice(1).toLowerCase()}
            </span>
            {petStatsTotal > 0 && (
              <button
                onClick={() => setPetStats({ attack_power: 0, protection: 0, agility: 0, accuracy: 0 })}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                reset
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              { key: "attack_power", label: "Attack Power", icon: Swords },
              { key: "protection",   label: "Protection",   icon: Shield },
              { key: "agility",      label: "Agility",      icon: Wind },
              { key: "accuracy",     label: "Accuracy",     icon: Crosshair },
            ] as const).map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/70 flex items-center gap-1">
                  <Icon className="size-2.5" /> {label}
                </label>
                <input
                  type="number"
                  min={0}
                  value={petStats[key] || ""}
                  placeholder="0"
                  onChange={(e) => setPetStats((prev) => ({ ...prev, [key]: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  className="w-full text-sm bg-background border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                />
              </div>
            ))}
          </div>
          {petStatsTotal > 0 && (
            <p className="text-[10px] font-mono text-muted-foreground/50">
              Pet total: +{petStatsTotal.toLocaleString()} combat score
            </p>
          )}
        </div>
      )}

      {/* Gear preview + Combat stats */}
      {showStatsSection && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gear slot preview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {noGear ? "Gear — None equipped" : `Gear — ${selectedPreset!.name}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {noGear ? (
                <p className="text-xs text-muted-foreground/50 font-mono">No gear — showing base character stats only.</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(selectedPreset!.slots).map(([slot, { hashedId, tier }]) => {
                    const meta = itemsMap[hashedId];
                    return (
                      <div key={slot} className="flex items-center gap-2 text-sm">
                        <span className="w-24 text-xs text-muted-foreground shrink-0">{SLOT_LABELS[slot] ?? slot}</span>
                        {meta ? (
                          <>
                            <span className={cn("flex-1 truncate font-medium", QUALITY_COLORS[meta.quality] ?? "")}>
                              {meta.name}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground shrink-0">T{tier}</span>
                          </>
                        ) : (
                          <span className="flex-1 text-xs font-mono text-muted-foreground/50 truncate">{hashedId}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Equipped pet */}
              {equippedPet && !loading && (
                <div className={cn("mt-3 pt-3 border-t border-border/40", noGear && "mt-0 pt-0 border-t-0")}>
                  <div className="flex items-center gap-2">
                    <PawPrint className="size-3 text-muted-foreground/60 shrink-0" />
                    <span className="text-xs text-muted-foreground w-20 shrink-0">Pet</span>
                    {equippedPet.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={equippedPet.image_url} alt="" className="size-4 object-contain shrink-0" />
                    )}
                    <span className={cn("flex-1 text-sm font-medium truncate", QUALITY_COLORS[equippedPet.quality] ?? "")}>
                      {equippedPet.name}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">L{equippedPet.level}</span>
                  </div>
                  <div className="mt-1 ml-[1.375rem] pl-[1.375rem] flex gap-3 text-[10px] font-mono text-muted-foreground/60">
                    <span>str {equippedPet.stats.strength}</span>
                    <span>def {equippedPet.stats.defence}</span>
                    <span>spd {equippedPet.stats.speed}</span>
                    {equippedPet.stats.strength === 0 && equippedPet.stats.defence === 0 && equippedPet.stats.speed === 0 && (
                      <span className="text-muted-foreground/40 italic">no trained stats</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Combat stats with breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                Combat Stats
                {loading && <span className="text-muted-foreground/50 normal-case font-normal">Computing…</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {COMBAT_STAT_KEYS.map((key) => {
                const { label, icon: Icon } = COMBAT_LABELS[key];
                const baseValue = combatStats?.[key] ?? null;
                const petManual = petStats[key as keyof typeof petStats];
                const value = baseValue !== null ? baseValue + petManual : null;
                const bk = breakdown?.[key];
                const expanded = expandedStat === key;

                return (
                  <div key={key}>
                    <button
                      onClick={() => setExpandedStat(expanded ? null : key)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors text-left"
                    >
                      <Icon className="size-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground/70 font-mono uppercase">{label}</p>
                        <p className="text-sm font-bold tabular-nums">
                          {loading ? <span className="text-muted-foreground/30">—</span> : (value ?? <span className="text-muted-foreground/30">—</span>)}
                        </p>
                      </div>
                      {bk && !loading && (
                        expanded
                          ? <ChevronDown className="size-3 text-muted-foreground/40 shrink-0" />
                          : <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
                      )}
                    </button>

                    {expanded && bk && !loading && (
                      <div className="mt-1 ml-3 pl-3 border-l border-border/40 space-y-0.5">
                        {bk.charBase > 0 && (
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-muted-foreground">
                              {bk.skillLabel} ({bk.skillLevel} × {CHAR_STAT_MAP[bk.skillLabel.toLowerCase()]?.multiplier ?? 2.4})
                            </span>
                            <span className="tabular-nums text-foreground/70">+{bk.charBase}</span>
                          </div>
                        )}
                        {bk.gear.map((g, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-muted-foreground truncate max-w-[200px]">{g.slotLabel}</span>
                            <span className="tabular-nums text-foreground/70 shrink-0 ml-2">+{g.value}</span>
                          </div>
                        ))}
                        {petStats[key as keyof typeof petStats] > 0 && equippedPet && (
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-muted-foreground truncate max-w-[200px]">
                              Pet — {equippedPet.name} (manual)
                            </span>
                            <span className="tabular-nums text-foreground/70 shrink-0 ml-2">
                              +{petStats[key as keyof typeof petStats]}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] font-mono border-t border-border/30 pt-0.5 mt-0.5">
                          <span className="text-muted-foreground/60">Total</span>
                          <span className="tabular-nums font-bold">{value}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Total combat */}
              {computedTotal !== null && !loading && (
                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-primary/5 border border-primary/20">
                  <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Total Combat</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-lg font-bold tabular-nums", overrideEnabled ? "text-muted-foreground/40 line-through text-sm" : "text-primary")}>
                      {computedTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Override */}
              {computedTotal !== null && !loading && (
                <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border/40 bg-muted/20">
                  <input
                    type="checkbox"
                    id="override-toggle"
                    checked={overrideEnabled}
                    onChange={(e) => {
                      setOverrideEnabled(e.target.checked);
                      if (e.target.checked && overrideValue === 0) setOverrideValue(computedTotal);
                    }}
                    className="accent-primary"
                  />
                  <label htmlFor="override-toggle" className="text-xs font-mono text-muted-foreground cursor-pointer">
                    Override total
                  </label>
                  {overrideEnabled && (
                    <input
                      type="number"
                      min={0}
                      value={overrideValue}
                      onChange={(e) => setOverrideValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-24 text-sm bg-background border border-primary/40 rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary tabular-nums ml-auto"
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* No presets notice */}
      {presets.length === 0 && !noGear && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          <Swords className="size-4 shrink-0" />
          No gear presets saved yet. Go to the <a href="/dashboard/gear" className="underline underline-offset-4 hover:text-foreground">Gear Calculator</a> to create one.
        </div>
      )}

      {/* Dungeon table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_3rem_5rem_10rem_6rem_5rem_5rem] items-center gap-3 px-4 py-2 bg-muted/40 border-b border-border">
          {(["Dungeon", "Lvl", "Difficulty", "Readiness", "Status", "HP Loss", "Duration"] as const).map((h) => (
            <span key={h} className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">{h}</span>
          ))}
        </div>

        {dungeons.map((dungeon, i) => {
          const assessment =
            combatTotal !== null && dungeon.difficulty > 0 && !loading
              ? assessDungeon(combatTotal, dungeon.difficulty)
              : null;

          const ratio =
            combatTotal !== null && dungeon.difficulty > 0
              ? combatTotal / dungeon.difficulty
              : null;

          // Bar max = 2.0 (200% of difficulty); thresholds at 70%, 130%, 160%
          const BAR_MAX = 2.0;
          const barPct = ratio !== null ? Math.min(ratio / BAR_MAX, 1) * 100 : 0;

          const barColor =
            !assessment ? "bg-muted-foreground/20" :
            !assessment.canEnter ? "bg-red-500/70" :
            assessment.mfTier === "max" ? "bg-emerald-400" :
            assessment.mfTier === "small" ? "bg-emerald-600" :
            assessment.canChain ? "bg-green-500" :
            "bg-amber-500";

          const leftBorder =
            !assessment ? "border-l-muted-foreground/20" :
            !assessment.canEnter ? "border-l-red-500/60" :
            assessment.mfTier === "max" ? "border-l-emerald-400" :
            assessment.mfTier === "small" ? "border-l-emerald-600" :
            assessment.canChain ? "border-l-green-500" :
            "border-l-amber-500";

          return (
            <div
              key={dungeon.name}
              className={cn(
                "grid grid-cols-[1fr_3rem_5rem_10rem_6rem_5rem_5rem] items-center gap-3 px-4 py-3 border-l-2 transition-colors",
                "border-b border-border/50 last:border-b-0",
                leftBorder,
                i % 2 === 0 ? "bg-background" : "bg-muted/10"
              )}
            >
              {/* Name + location */}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{dungeon.name}</p>
                <p className="text-[10px] text-muted-foreground/60 truncate font-mono">{dungeon.location}</p>
              </div>

              {/* Level */}
              <span className="text-xs font-mono tabular-nums text-muted-foreground">{dungeon.minLevel}</span>

              {/* Difficulty */}
              <span className="text-xs font-mono tabular-nums text-muted-foreground">
                {dungeon.difficulty > 0 ? dungeon.difficulty.toLocaleString() : "—"}
              </span>

              {/* Readiness bar — thresholds at 70% (35%), 130% (65%), 160% (80%) of bar */}
              <div className="relative h-5 rounded-sm overflow-hidden bg-muted/30 border border-border/40">
                <div className={cn("h-full transition-all duration-500", barColor)} style={{ width: `${barPct}%` }} />
                <div className="absolute inset-0">
                  <div className="absolute top-0 bottom-0 w-px bg-foreground/20" style={{ left: "35%" }} />
                  <div className="absolute top-0 bottom-0 w-px bg-foreground/20" style={{ left: "65%" }} />
                  <div className="absolute top-0 bottom-0 w-px bg-foreground/10" style={{ left: "80%" }} />
                  {ratio !== null && (
                    <span className="absolute right-1 top-0 bottom-0 flex items-center text-[9px] font-mono text-foreground/50">
                      {Math.round(ratio * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <div>
                {!assessment ? (
                  <span className="text-[10px] font-mono text-muted-foreground/40">—</span>
                ) : !assessment.canEnter ? (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5 h-5">
                    <Ban className="size-2.5" /> Blocked
                  </Badge>
                ) : assessment.mfTier === "max" ? (
                  <Badge className="text-[10px] px-1.5 py-0 gap-0.5 h-5 bg-emerald-400/20 text-emerald-300 border-emerald-400/30">
                    <Sparkles className="size-2.5" /> Max MF
                  </Badge>
                ) : assessment.mfTier === "small" ? (
                  <Badge className="text-[10px] px-1.5 py-0 gap-0.5 h-5 bg-emerald-600/20 text-emerald-500 border-emerald-600/30">
                    <Sparkles className="size-2.5" /> MF
                  </Badge>
                ) : assessment.canChain ? (
                  <Badge className="text-[10px] px-1.5 py-0 gap-0.5 h-5 bg-green-500/20 text-green-400 border-green-500/30">
                    <Link2 className="size-2.5" /> Chain
                  </Badge>
                ) : (
                  <Badge className="text-[10px] px-1.5 py-0 gap-0.5 h-5 bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <AlertTriangle className="size-2.5" /> Risky
                  </Badge>
                )}
              </div>

              {/* Health loss */}
              <span className={cn(
                "text-xs font-mono tabular-nums text-right",
                !assessment ? "text-muted-foreground/40" :
                !assessment.canEnter ? "text-red-500" :
                assessment.mfTier !== "none" ? "text-emerald-400" :
                assessment.healthLossPct > 50 ? "text-amber-400" : "text-green-400"
              )}>
                {!assessment ? "—" :
                 !assessment.canEnter ? "100%" :
                 `${assessment.healthLossPct}%`}
              </span>

              {/* Duration */}
              <span className="text-[10px] font-mono text-muted-foreground/60 flex items-center gap-0.5">
                <Clock className="size-2.5 shrink-0" />
                {formatDuration(effectiveDuration(dungeon.durationSec))}
                {efficiencyPct > 0 && (
                  <span className="text-muted-foreground/40 ml-0.5">({formatDuration(dungeon.durationSec)})</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-red-500/70 inline-block" /> &lt; 70% — Blocked</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-amber-500 inline-block" /> 70–100% — Risky (100%→50% HP loss)</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-green-500 inline-block" /> 100–130% — Chain (50%→10% HP loss)</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-emerald-600 inline-block" /> 130–160% — Small MF (10% HP loss)</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-emerald-400 inline-block" /> ≥ 160% — Max MF (10% HP loss)</span>
        {!hasDifficultyData && (
          <span className="flex items-center gap-1.5 text-amber-500/80">
            <Zap className="size-3" /> Difficulty data unavailable — difficulty values will show "—"
          </span>
        )}
      </div>
    </div>
  );
}
