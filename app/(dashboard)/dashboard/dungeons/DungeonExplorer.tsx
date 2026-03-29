"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Skull, User, Swords, Shield, Wind, Crosshair, Zap,
  Link2, Sparkles, AlertTriangle, Ban, Clock, ChevronDown, ChevronRight, PawPrint,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CHAR_STAT_MAP, QUALITY_COLORS, SLOT_LABELS, BASE_IDLE_TIME_MS } from "@/lib/game-constants";
import {
  assessDungeon,
  totalCombatStats,
  formatDuration,
  COMBAT_STAT_KEYS,
  type StaticDungeon,
} from "./difficulty";
import type { SavedPreset } from "../gear/actions";
import type { CharacterEffect } from "@/lib/idlemmo";

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


// ─── Props ────────────────────────────────────────────────────────────────────

interface DungeonExplorerProps {
  dungeons: StaticDungeon[];
  presets: SavedPreset[];
  itemsMap: Record<string, { name: string; quality: string; imageUrl: string | null }>;
  characters: { hashed_id: string; name: string; isMember: boolean | null; isPrimary: boolean }[];
  hasDifficultyData: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DungeonExplorer({ dungeons, presets, itemsMap, characters, hasDifficultyData }: DungeonExplorerProps) {
  const [characterId, setCharacterId] = useState(characters[0]?.hashed_id ?? "");
  const [presetId, setPresetId] = useState(presets[0]?.id ?? NO_GEAR_ID);
  const [combatStats, setCombatStats] = useState<Record<string, number> | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, StatBreakdown> | null>(null);
  const [petDbStats, setPetDbStats] = useState<{
    attackPower: number;
    protection: number;
    agility: number;
    accuracy: number | null;
    petName: string | null;
    imageUrl: string | null;
    quality: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const [expandedStat, setExpandedStat] = useState<string | null>(null);

  // Override total combat
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideValue, setOverrideValue] = useState(0);

  // Efficiency modifier
  const [efficiencyPct, setEfficiencyPct] = useState(0);

  // Expandable dungeon rows
  const [expandedDungeon, setExpandedDungeon] = useState<string | null>(null);

  // Extra MF input (for future use)
  const [extraMfPct, setExtraMfPct] = useState(0);

  // Effects / idle time
  const [effectsHouseBonus, setEffectsHouseBonus] = useState(0);
  const [effectsLoading, setEffectsLoading] = useState(false);
  const [effectsCooldown, setEffectsCooldown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const noGear = presetId === NO_GEAR_ID;
  const selectedPreset = noGear ? null : (presets.find((p) => p.id === presetId) ?? null);
  const selectedChar = characters.find((c) => c.hashed_id === characterId) ?? null;

  // ── Max idle time ────────────────────────────────────────────────────────────

  const maxIdleMs: number | null = (() => {
    if (!selectedChar) return null;
    if (selectedChar.isMember === null) return null;
    const memberKey = selectedChar.isMember ? "member" : "nonMember";
    const roleKey   = selectedChar.isPrimary ? "main" : "alt";
    return BASE_IDLE_TIME_MS[memberKey][roleKey] + effectsHouseBonus;
  })();

  // ── Load effects from sessionStorage or API ──────────────────────────────────

  function applyEffects(effects: CharacterEffect[]) {
    const bonus = effects
      .filter((e) => e.source === "house_component" && e.attribute === "max_idle_time")
      .reduce((sum, e) => sum + e.value, 0);
    setEffectsHouseBonus(bonus);
  }

  async function loadEffects(charId: string, forceRefresh = false) {
    if (!charId) { setEffectsHouseBonus(0); return; }

    const cacheKey = `effects:${charId}`;

    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          applyEffects(JSON.parse(cached) as CharacterEffect[]);
          return;
        } catch { /* fall through to fetch */ }
      }
    }

    setEffectsLoading(true);
    try {
      const res = await fetch(`/api/idlemmo/character/${charId}/effects`);
      if (res.ok) {
        const data = await res.json();
        const effects: CharacterEffect[] = data.effects ?? [];
        sessionStorage.setItem(cacheKey, JSON.stringify(effects));
        applyEffects(effects);
      }
    } catch { /* leave bonus at 0 */ }
    setEffectsLoading(false);
  }

  // ── Load effects whenever character changes ──────────────────────────────────

  useEffect(() => {
    setEffectsHouseBonus(0);
    setEffectsCooldown(false);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    loadEffects(characterId);
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  // ── Refresh effects button handler ──────────────────────────────────────────

  function handleRefreshEffects() {
    if (!characterId || effectsCooldown || effectsLoading) return;
    sessionStorage.removeItem(`effects:${characterId}`);
    loadEffects(characterId, true);
    setEffectsCooldown(true);
    cooldownTimerRef.current = setTimeout(() => setEffectsCooldown(false), 10_000);
  }

  // ── Compute combat stats whenever character or preset changes ───────────────

  useEffect(() => {
    if (!characterId) { setCombatStats(null); setBreakdown(null); setPetDbStats(null); return; }
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

        try {
          const petRes = await fetch(`/api/characters/${characterId}/pet-stats`);
          if (petRes.ok) {
            const petData = await petRes.json();
            setPetDbStats({
              attackPower: petData.attackPower ?? 0,
              protection:  petData.protection  ?? 0,
              agility:     petData.agility     ?? 0,
              accuracy:    petData.accuracy    ?? null,
              petName:     data.equipped_pet?.name ?? null,
              imageUrl:    petData.imageUrl    ?? null,
              quality:     petData.quality     ?? null,
            });
          } else {
            setPetDbStats(null);
          }
        } catch {
          setPetDbStats(null);
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

  const petContribution: Record<string, number> = petDbStats
    ? {
        attack_power: petDbStats.attackPower,
        protection:   petDbStats.protection,
        agility:      petDbStats.agility,
        accuracy:     petDbStats.accuracy ?? 0,
      }
    : { attack_power: 0, protection: 0, agility: 0, accuracy: 0 };

  const petContributionTotal = Object.values(petContribution).reduce((a, b) => a + b, 0);
  const computedTotal = combatStats ? totalCombatStats(combatStats) + petContributionTotal : null;
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

          {/* Max idle time display */}
          {characterId && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Clock className="size-3 shrink-0" />
              {selectedChar?.isMember === null ? (
                <span className="text-amber-500/70">Sync characters to see idle time</span>
              ) : maxIdleMs !== null ? (
                <span>
                  Max idle:
                  {effectsHouseBonus > 0 ? (
                    <>
                      {" "}{formatDuration(Math.round((maxIdleMs - effectsHouseBonus) / 1000))}
                      <span className="text-emerald-400/80"> + {formatDuration(Math.round(effectsHouseBonus / 1000))} house</span>
                      {" = "}<span className="text-foreground/80">{formatDuration(Math.round(maxIdleMs / 1000))}</span>
                    </>
                  ) : (
                    <> <span className="text-foreground/80">{formatDuration(Math.round(maxIdleMs / 1000))}</span></>
                  )}
                </span>
              ) : (
                <span>—</span>
              )}
              <button
                onClick={handleRefreshEffects}
                disabled={effectsCooldown || effectsLoading || !characterId}
                title={effectsCooldown ? "Cooldown — wait 10s" : "Refresh house effects"}
                className={cn(
                  "ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] transition-colors",
                  (effectsCooldown || effectsLoading)
                    ? "border-border/30 text-muted-foreground/30 cursor-not-allowed"
                    : "border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30"
                )}
              >
                <RefreshCw className={cn("size-2.5", effectsLoading && "animate-spin")} />
                Refresh
              </button>
            </div>
          )}
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
              {petDbStats && !loading && (
                <div className={cn(
                  "mt-3 pt-3 border-t border-border/40 space-y-3",
                  noGear && "mt-0 pt-0 border-t-0"
                )}>
                  {/* Identity */}
                  <div className="flex items-center gap-3">
                    <PawPrint className="size-3 text-muted-foreground/50 shrink-0" />
                    <span className="text-xs text-muted-foreground w-20 shrink-0">Pet</span>
                    <div className="size-8 rounded-sm bg-muted/40 shrink-0 flex items-center justify-center overflow-hidden">
                      {petDbStats.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={petDbStats.imageUrl} alt={petDbStats.petName ?? "Pet"} className="size-full object-contain p-0.5" />
                      ) : (
                        <PawPrint className="size-4 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-sm font-medium leading-tight", QUALITY_COLORS[petDbStats.quality ?? ""] ?? "")}>
                        {petDbStats.petName ?? "Pet"}
                      </p>
                    </div>
                  </div>

                  {/* Computed combat contribution */}
                  <div className="ml-[1.625rem] pl-[1.625rem] space-y-2 border-l border-border/30">
                    <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wide">
                      Combat contribution
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {([
                        { key: "attack_power", label: "Attack Power", icon: Swords, value: petContribution.attack_power },
                        { key: "protection",   label: "Protection",   icon: Shield, value: petContribution.protection   },
                        { key: "agility",      label: "Agility",      icon: Wind,   value: petContribution.agility      },
                      ] as const).map(({ key, label, icon: Icon, value }) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <Icon className="size-3 text-muted-foreground/40 shrink-0" />
                          <span className="text-[10px] font-mono text-muted-foreground/60 w-[4.5rem] shrink-0">{label}</span>
                          <span className="text-xs font-mono tabular-nums text-foreground/80">+{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {!petDbStats && !loading && characterId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Pet stats not saved — sync on the character page first.
                </p>
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
                const petAdd = petContribution[key] ?? 0;
                const value = baseValue !== null ? baseValue + petAdd : null;
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
                        {petAdd > 0 && petDbStats && (
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-muted-foreground truncate max-w-[200px]">Pet — {petDbStats.petName ?? "Pet"}</span>
                            <span className="tabular-nums text-foreground/70 shrink-0 ml-2">+{petAdd}</span>
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

          const isExpanded = expandedDungeon === dungeon.name;
          const effectiveDurSec = effectiveDuration(dungeon.durationSec);
          const runsInIdle = maxIdleMs !== null
            ? Math.floor(maxIdleMs / (effectiveDurSec * 1000))
            : null;

          return (
            <div key={dungeon.name} className={cn("border-b border-border/50 last:border-b-0", i % 2 === 0 ? "bg-background" : "bg-muted/10")}>
              {/* Main row — clickable to expand */}
              <button
                type="button"
                onClick={() => setExpandedDungeon(isExpanded ? null : dungeon.name)}
                className={cn(
                  "w-full grid grid-cols-[1fr_3rem_5rem_10rem_6rem_5rem_5rem] items-center gap-3 px-4 py-3 border-l-2 transition-colors text-left",
                  "hover:bg-muted/20",
                  leftBorder,
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isExpanded
                      ? <ChevronDown className="size-3 text-muted-foreground/50 shrink-0" />
                      : <ChevronRight className="size-3 text-muted-foreground/30 shrink-0" />
                    }
                    <p className="text-sm font-medium truncate">{dungeon.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 truncate font-mono pl-4">{dungeon.location}</p>
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
                  {formatDuration(effectiveDurSec)}
                  {efficiencyPct > 0 && (
                    <span className="text-muted-foreground/40 ml-0.5">({formatDuration(dungeon.durationSec)})</span>
                  )}
                </span>
              </button>

              {/* Expansion panel */}
              {isExpanded && (
                <div className="border-t border-border/30 bg-muted/5 px-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Left — Idle time stats */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">Idle Stats</p>
                      {selectedChar?.isMember === null ? (
                        <p className="text-xs text-amber-500/70 font-mono">Sync characters to calculate</p>
                      ) : maxIdleMs !== null ? (
                        <div className="space-y-1.5 font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Max idle</span>
                            <span className="text-foreground/80">{formatDuration(Math.round(maxIdleMs / 1000))}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Run duration</span>
                            <span className="text-foreground/80">{formatDuration(effectiveDurSec)}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-border/30 pt-1.5">
                            <span className="text-muted-foreground">Runs possible</span>
                            <span className={cn(
                              "font-bold",
                              runsInIdle === null ? "text-muted-foreground/40"
                              : runsInIdle >= 3 ? "text-emerald-400"
                              : runsInIdle >= 2 ? "text-green-400"
                              : "text-amber-400"
                            )}>
                              {runsInIdle ?? "—"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/40 font-mono">No character selected</p>
                      )}
                    </div>

                    {/* Middle — Modifier inputs */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">Modifiers</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground w-24 shrink-0">Efficiency</span>
                          <span className="text-xs font-mono text-foreground/60 tabular-nums">{efficiencyPct}%</span>
                          <span className="text-[10px] text-muted-foreground/40">(global)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-mono text-muted-foreground w-24 shrink-0">Magic Find %</label>
                          <input
                            type="number"
                            min={0}
                            value={extraMfPct || ""}
                            placeholder="0"
                            onChange={(e) => setExtraMfPct(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-16 text-xs bg-background border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right — Loot table */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">Loot Table</p>
                      {!dungeon.loot || dungeon.loot.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground/40 font-mono">
                          Loot data unavailable — sync dungeons in Admin
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {[...dungeon.loot]
                            .sort((a, b) => b.chance - a.chance)
                            .map((item, idx) => (
                              <div key={`${item.hashed_item_id}-${idx}`} className="flex items-center justify-between gap-2 text-xs">
                                <span className={cn("truncate font-medium", QUALITY_COLORS[item.quality] ?? "text-foreground")}>
                                  {item.name}
                                </span>
                                <span className="text-muted-foreground/60 font-mono tabular-nums shrink-0">
                                  {item.chance}%
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}
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
