"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skull, User, Swords, Shield, Wind, Crosshair, Zap, Link2, Sparkles, AlertTriangle, Ban, Clock, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [presetId, setPresetId] = useState(presets[0]?.id ?? "");
  const [combatStats, setCombatStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);

  // Custom modifiers
  const [efficiencyPct, setEfficiencyPct] = useState(0);
  const [attackPowerBoostPct, setAttackPowerBoostPct] = useState(0);

  const selectedPreset = presets.find((p) => p.id === presetId) ?? null;

  // Compute combat stats whenever character or preset changes
  useEffect(() => {
    if (!characterId || !selectedPreset) { setCombatStats(null); return; }
    let cancelled = false;
    setLoading(true);

    async function compute() {
      const stats: Record<string, number> = {};

      // 1. Character base combat stats (attack_power, protection, agility, accuracy)
      try {
        const res = await fetch(`/api/idlemmo/character/${characterId}`);
        const data = await res.json();
        if (data.stats) {
          for (const key of COMBAT_STAT_KEYS) {
            const entry = (data.stats as Record<string, { level: number }>)[key];
            if (entry) stats[key] = entry.level;
          }
        }
      } catch { /* skip */ }

      if (cancelled) return;

      // 2. Gear stats from preset — inspect each unique item
      const slots = Object.values(selectedPreset!.slots);
      const uniqueIds = [...new Set(slots.map((s) => s.hashedId))];

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

      for (const [, { hashedId, tier }] of Object.entries(selectedPreset!.slots)) {
        const inspect = inspects[hashedId];
        if (!inspect?.stats) continue;
        for (const [stat, baseValue] of Object.entries(inspect.stats)) {
          // tier_modifiers = { statKey: addendPerTier }; tier 1 = base stats, each tier adds the modifier
          const addendPerTier = inspect.tier_modifiers?.[stat] ?? 0;
          const effectiveValue = (baseValue as number) + (tier - 1) * addendPerTier;
          stats[stat] = (stats[stat] ?? 0) + Math.round(effectiveValue);
        }
      }

      if (!cancelled) {
        setCombatStats(stats);
        setLoading(false);
      }
    }

    compute().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [characterId, presetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply attack power % boost before computing total
  const effectiveStats: Record<string, number> | null = combatStats
    ? {
        ...combatStats,
        attack_power: Math.round((combatStats.attack_power ?? 0) * (1 + attackPowerBoostPct / 100)),
      }
    : null;

  const combatTotal = effectiveStats ? totalCombatStats(effectiveStats) : null;

  // Efficiency formula from wiki: Final = Initial / ((Efficiency% + 100) / 100)
  function effectiveDuration(durationSec: number): number {
    return Math.round(durationSec / ((efficiencyPct + 100) / 100));
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skull className="size-6 text-red-500/80 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dungeon Planner</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Combat stats ≥ 70% of difficulty to enter · ≥ 100% to chain · ≥ 130% for Magic Find
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
            <option value="">— Select gear preset —</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Custom modifiers */}
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

        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Swords className="size-3" /> Attack Power Bonus %
            <span className="normal-case font-normal text-muted-foreground/60">— scales ATK before difficulty check</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={9999}
              value={attackPowerBoostPct}
              onChange={(e) => setAttackPowerBoostPct(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-24 text-sm bg-background border border-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
            />
            <span className="text-sm text-muted-foreground">%</span>
            {attackPowerBoostPct > 0 && (
              <button onClick={() => setAttackPowerBoostPct(0)} className="text-xs text-muted-foreground hover:text-foreground">reset</button>
            )}
          </div>
        </div>
      </div>

      {/* Gear preview + Combat stats */}
      {selectedPreset && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gear slot preview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Gear — {selectedPreset.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(selectedPreset.slots).map(([slot, { hashedId, tier }]) => {
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
            </CardContent>
          </Card>

          {/* Combat stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                Combat Stats
                {loading && <span className="text-muted-foreground/50 normal-case font-normal">Computing…</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {COMBAT_STAT_KEYS.map((key) => {
                  const { label, icon: Icon } = COMBAT_LABELS[key];
                  const base = combatStats?.[key] ?? null;
                  const effective = effectiveStats?.[key] ?? null;
                  const boosted = key === "attack_power" && attackPowerBoostPct > 0;
                  return (
                    <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border/50">
                      <Icon className="size-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground/70 font-mono uppercase">{label}</p>
                        <p className="text-sm font-bold tabular-nums">
                          {loading ? <span className="text-muted-foreground/30">—</span> : (effective ?? <span className="text-muted-foreground/30">—</span>)}
                          {boosted && base !== null && (
                            <span className="text-[10px] font-normal text-muted-foreground/50 ml-1">(base {base})</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {combatTotal !== null && !loading && (
                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-primary/5 border border-primary/20">
                  <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Total Combat</span>
                  <span className="text-lg font-bold tabular-nums text-primary">{combatTotal.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* No presets notice */}
      {presets.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          <Swords className="size-4 shrink-0" />
          No gear presets saved yet. Go to the <a href="/dashboard/gear" className="underline underline-offset-4 hover:text-foreground">Gear Calculator</a> to create one.
        </div>
      )}

      {/* Dungeon table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Table header */}
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
              ? Math.min(combatTotal / dungeon.difficulty, 1.5)
              : null;

          // Bar fill: 0% = 0, 100% of bar = ratio≥1.5
          // Threshold marks at 70% and 130%
          const barPct = ratio !== null ? Math.min(ratio / 1.5, 1) * 100 : 0;

          const barColor =
            !assessment ? "bg-muted-foreground/20" :
            !assessment.canEnter ? "bg-red-500/70" :
            assessment.magicFind ? "bg-emerald-500" :
            assessment.canChain ? "bg-green-500" :
            "bg-amber-500";

          const leftBorder =
            !assessment ? "border-l-muted-foreground/20" :
            !assessment.canEnter ? "border-l-red-500/60" :
            assessment.magicFind ? "border-l-emerald-500" :
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

              {/* Readiness bar */}
              <div className="relative h-5 rounded-sm overflow-hidden bg-muted/30 border border-border/40">
                {/* Fill */}
                <div
                  className={cn("h-full transition-all duration-500", barColor)}
                  style={{ width: `${barPct}%` }}
                />
                {/* Threshold markers */}
                <div className="absolute inset-0 flex items-center">
                  {/* 70% threshold = 70/150 = 46.7% of bar */}
                  <div className="absolute top-0 bottom-0 w-px bg-foreground/20" style={{ left: "46.7%" }} />
                  {/* 130% threshold = 130/150 = 86.7% of bar */}
                  <div className="absolute top-0 bottom-0 w-px bg-foreground/20" style={{ left: "86.7%" }} />
                  {ratio !== null && (
                    <span className="absolute right-1 text-[9px] font-mono text-foreground/50">
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
                ) : assessment.magicFind ? (
                  <Badge className="text-[10px] px-1.5 py-0 gap-0.5 h-5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <Sparkles className="size-2.5" /> Magic Find
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
                assessment.magicFind ? "text-emerald-400" :
                assessment.healthLossPct > 50 ? "text-amber-400" : "text-green-400"
              )}>
                {!assessment ? "—" :
                 !assessment.canEnter ? "✗" :
                 assessment.magicFind ? "MF" :
                 `${assessment.healthLossPct}%`}
              </span>

              {/* Duration */}
              <span className="text-[10px] font-mono text-muted-foreground/60 flex items-center gap-0.5">
                <Clock className="size-2.5 shrink-0" />
                {formatDuration(effectiveDuration(dungeon.durationSec))}
                {efficiencyPct > 0 && (
                  <span className="text-muted-foreground/40 ml-0.5">(base {formatDuration(dungeon.durationSec)})</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-red-500/70 inline-block" /> &lt; 70% — Cannot enter</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-amber-500 inline-block" /> 70–100% — Risky (high HP loss)</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-green-500 inline-block" /> 100–130% — Chain ready (&lt;50% HP loss)</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-emerald-500 inline-block" /> &gt; 130% — Magic Find bonus</span>
        {!hasDifficultyData && (
          <span className="flex items-center gap-1.5 text-amber-500/80">
            <Zap className="size-3" /> Difficulty data unavailable — the IdleMMO API may not expose dungeon data yet; difficulty values will show "—"
          </span>
        )}
      </div>
    </div>
  );
}
