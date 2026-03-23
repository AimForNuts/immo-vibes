"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Skull, User, Swords, Shield, Wind, Crosshair, Zap,
  Link2, Sparkles, AlertTriangle, Ban, Clock, ChevronDown, ChevronRight, PawPrint, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CHAR_STAT_MAP, QUALITY_COLORS, SLOT_LABELS } from "@/lib/game-constants";
import {
  assessDungeon,
  totalCombatStats,
  formatDuration,
  COMBAT_STAT_KEYS,
  type StaticDungeon,
} from "./difficulty";
import type { SavedPreset } from "../gear/actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const COMBAT_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  attack_power: { label: "Attack Power", icon: Swords },
  protection:   { label: "Protection",   icon: Shield },
  agility:      { label: "Agility",      icon: Wind },
  accuracy:     { label: "Accuracy",     icon: Crosshair },
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
  id: number;
  name: string;
  level: number;
  quality: string;
  image_url: string | null;
  stats: { strength: number; defence: number; speed: number };
}

type PetCombatStats = { attack_power: number; protection: number; agility: number; accuracy: number };

// ─── Props ────────────────────────────────────────────────────────────────────

interface DungeonExplorerProps {
  dungeons: StaticDungeon[];
  presets: SavedPreset[];
  itemsMap: Record<string, { name: string; quality: string; imageUrl: string | null }>;
  characters: { hashed_id: string; name: string }[];
  hasDifficultyData: boolean;
}

const EMPTY_PET_STATS: PetCombatStats = { attack_power: 0, protection: 0, agility: 0, accuracy: 0 };

// ─── Component ────────────────────────────────────────────────────────────────

export function DungeonExplorer({ dungeons, presets, itemsMap, characters, hasDifficultyData }: DungeonExplorerProps) {
  const [characterId, setCharacterId] = useState(characters[0]?.hashed_id ?? "");
  const [presetId, setPresetId] = useState(presets[0]?.id ?? NO_GEAR_ID);
  const [combatStats, setCombatStats] = useState<Record<string, number> | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, StatBreakdown> | null>(null);
  const [equippedPet, setEquippedPet] = useState<EquippedPet | null>(null);
  const [loading, setLoading] = useState(false);

  const [expandedStat, setExpandedStat] = useState<string | null>(null);

  // Pet combat stats — manually entered, pre-filled from DB
  const [petStats, setPetStats] = useState<PetCombatStats>(EMPTY_PET_STATS);
  const [petSaving, setPetSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Override total combat
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideValue, setOverrideValue] = useState(0);

  // Efficiency modifier
  const [efficiencyPct, setEfficiencyPct] = useState(0);

  const noGear = presetId === NO_GEAR_ID;
  const selectedPreset = noGear ? null : (presets.find((p) => p.id === presetId) ?? null);

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

  // ── Compute combat stats whenever character or preset changes ───────────────

  useEffect(() => {
    if (!characterId) { setCombatStats(null); setBreakdown(null); setEquippedPet(null); return; }
    let cancelled = false;
    setLoading(true);

    async function compute() {
      const stats: Record<string, number> = {};
      const bk: Record<string, StatBreakdown> = {};

      try {
        const res = await fetch(`/api/idlemmo/character/${characterId}`);
        const data = await res.json();

        if (data.stats) {
          for (const [k, v] of Object.entries(data.stats as Record<string, { level: number }>)) {
            const m = CHAR_STAT_MAP[k];
            if (!m) continue;
            const base = Math.round(v.level * m.multiplier);
            stats[m.key] = base;
            bk[m.key] = { skillLabel: m.skillLabel, skillLevel: v.level, charBase: base, gear: [] };
          }
        }

        // Class talent bonuses at combat L70 — see docs/game-mechanics/classes.md
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

        // Equipped pet — API always returns str/def/spd = 0; manual stats are entered separately
        if (data.equipped_pet) {
          setEquippedPet({ ...data.equipped_pet } as EquippedPet);
        } else {
          setEquippedPet(null);
        }
      } catch { /* skip */ }

      if (cancelled) return;

      // Gear stats from preset
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
      }
    }

    compute().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [characterId, presetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save pet combat stats ───────────────────────────────────────────────────

  async function savePetStats() {
    if (!characterId || !equippedPet) return;
    setPetSaving("saving");
    try {
      const res = await fetch(`/api/characters/${characterId}/pet-stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attackPower: petStats.attack_power,
          protection:  petStats.protection,
          agility:     petStats.agility,
          accuracy:    petStats.accuracy,
          pet: {
            id:       equippedPet.id,
            name:     equippedPet.name,
            level:    equippedPet.level,
            quality:  equippedPet.quality,
            imageUrl: equippedPet.image_url,
          },
        }),
      });
      setPetSaving(res.ok ? "saved" : "error");
      setTimeout(() => setPetSaving("idle"), 2000);
    } catch {
      setPetSaving("error");
      setTimeout(() => setPetSaving("idle"), 2000);
    }
  }

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

      {/* Gear preview + Combat stats */}
      {showStatsSection && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gear card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {noGear ? "Gear — None equipped" : `Gear — ${selectedPreset!.name}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {noGear ? (
                <p className="text-xs text-muted-foreground/50 font-mono">No gear — showing base character stats only.</p>
              ) : (
                Object.entries(selectedPreset!.slots).map(([slot, { hashedId, tier }]) => {
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
                })
              )}

              {/* Pet row — inline within gear card */}
              {equippedPet && !loading && (
                <div className={cn(
                  "mt-3 pt-3 border-t border-border/40 space-y-3",
                  noGear && "mt-0 pt-0 border-t-0"
                )}>
                  {/* Identity */}
                  <div className="flex items-center gap-3">
                    <PawPrint className="size-3 text-muted-foreground/50 shrink-0" />
                    <span className="text-xs text-muted-foreground w-20 shrink-0">Pet</span>
                    {equippedPet.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={equippedPet.image_url}
                        alt={equippedPet.name}
                        className="size-8 object-contain shrink-0 rounded-sm bg-muted/40 p-0.5"
                      />
                    ) : (
                      <div className="size-8 rounded-sm bg-muted/40 shrink-0 flex items-center justify-center">
                        <PawPrint className="size-4 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={cn("text-sm font-medium leading-tight", QUALITY_COLORS[equippedPet.quality] ?? "")}>
                        {equippedPet.name}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                        L{equippedPet.level} · {equippedPet.quality.charAt(0) + equippedPet.quality.slice(1).toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {/* Manual combat stat inputs */}
                  <div className="ml-[1.625rem] pl-[1.625rem] space-y-2 border-l border-border/30">
                    <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wide">
                      Combat contribution
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {([
                        { key: "attack_power" as const, label: "Attack Power", icon: Swords },
                        { key: "protection"   as const, label: "Protection",   icon: Shield },
                        { key: "agility"      as const, label: "Agility",      icon: Wind },
                        { key: "accuracy"     as const, label: "Accuracy",     icon: Crosshair },
                      ]).map(({ key, label, icon: Icon }) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <Icon className="size-3 text-muted-foreground/40 shrink-0" />
                          <span className="text-[10px] font-mono text-muted-foreground/60 w-[4.5rem] shrink-0">{label}</span>
                          <input
                            type="number"
                            min={0}
                            value={petStats[key] || ""}
                            placeholder="0"
                            onChange={(e) => setPetStats((prev) => ({ ...prev, [key]: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                            className="w-14 text-xs bg-background border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-0.5">
                      <button
                        onClick={savePetStats}
                        disabled={petSaving === "saving"}
                        className={cn(
                          "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors",
                          petSaving === "saved"
                            ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                            : petSaving === "error"
                            ? "border-destructive/40 text-destructive"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                        )}
                      >
                        <Save className="size-3" />
                        {petSaving === "saving" ? "Saving…" : petSaving === "saved" ? "Saved" : petSaving === "error" ? "Error" : "Save"}
                      </button>
                      {petStatsTotal > 0 && (
                        <span className="text-[10px] font-mono text-muted-foreground/50">
                          +{petStatsTotal.toLocaleString()} total
                        </span>
                      )}
                    </div>
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
                        {petManual > 0 && equippedPet && (
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-muted-foreground truncate max-w-[200px]">Pet — {equippedPet.name}</span>
                            <span className="tabular-nums text-foreground/70 shrink-0 ml-2">+{petManual}</span>
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

              {computedTotal !== null && !loading && (
                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-primary/5 border border-primary/20">
                  <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Total Combat</span>
                  <span className={cn("text-lg font-bold tabular-nums", overrideEnabled ? "text-muted-foreground/40 line-through text-sm" : "text-primary")}>
                    {computedTotal.toLocaleString()}
                  </span>
                </div>
              )}

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
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{dungeon.name}</p>
                <p className="text-[10px] text-muted-foreground/60 truncate font-mono">{dungeon.location}</p>
              </div>
              <span className="text-xs font-mono tabular-nums text-muted-foreground">{dungeon.minLevel}</span>
              <span className="text-xs font-mono tabular-nums text-muted-foreground">
                {dungeon.difficulty > 0 ? dungeon.difficulty.toLocaleString() : "—"}
              </span>
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
              <span className={cn(
                "text-xs font-mono tabular-nums text-right",
                !assessment ? "text-muted-foreground/40" :
                !assessment.canEnter ? "text-red-500" :
                assessment.mfTier !== "none" ? "text-emerald-400" :
                assessment.healthLossPct > 50 ? "text-amber-400" : "text-green-400"
              )}>
                {!assessment ? "—" : !assessment.canEnter ? "100%" : `${assessment.healthLossPct}%`}
              </span>
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
