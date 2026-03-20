"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sword, Shield, Wind, Crosshair, User, Zap, TrendingUp,
  ChevronDown, ChevronRight, Flame, Coffee, AlertTriangle,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Zone, Enemy } from "@/data/zones";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CharacterStats {
  combatLevel: number;
  /** Movement speed in m/s — from character skills.speed or manual input */
  movementSpeed: number;
  attack_power: number;
  protection: number;
  agility: number;
  accuracy: number;
}

interface CombatPlannerProps {
  characters: { hashed_id: string; name: string }[];
  zones: Zone[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAT_COLS = [
  { key: "attack_power", label: "AP",   icon: Sword,      title: "Attack Power" },
  { key: "protection",   label: "Prot", icon: Shield,     title: "Protection" },
  { key: "agility",      label: "Agi",  icon: Wind,       title: "Agility" },
  { key: "accuracy",     label: "Acc",  icon: Crosshair,  title: "Accuracy" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scaleStat(base: number | null, baseLevel: number, scaledLevel: number): number | null {
  if (base === null || baseLevel === 0) return null;
  return Math.round(base * (scaledLevel / baseLevel));
}

function scaleXP(baseXP: number | null, baseLevel: number, scaledLevel: number): number | null {
  if (baseXP === null || baseLevel === 0) return null;
  return Math.round(baseXP * (scaledLevel / baseLevel));
}

/** Enemies found per hour from the hunting formula. See docs/game-mechanics/combat.md */
function enemiesPerHour(combatLevel: number, movementSpeed: number): number {
  const levelNorm = Math.min(combatLevel / 100, 1);
  const speedNorm = Math.min(movementSpeed / 50, 1);
  const perSec = 0.03 * (1 + levelNorm + speedNorm);
  return Math.round(perSec * 3600);
}

/**
 * Threat level of an enemy vs the player.
 * Based on how much damage the enemy deals per hit vs player protection.
 * "danger" = enemy AP significantly exceeds player Prot
 * "risky"  = enemy AP is close to player Prot
 * "safe"   = player outclasses enemy
 */
function threatLevel(enemyAP: number | null, playerProt: number): "unknown" | "danger" | "risky" | "safe" {
  if (enemyAP === null) return "unknown";
  const netDamage = enemyAP - playerProt;
  if (netDamage > 40) return "danger";
  if (netDamage > 0)  return "risky";
  return "safe";
}

const THREAT_COLORS = {
  unknown: "bg-muted-foreground/30",
  danger:  "bg-red-500",
  risky:   "bg-amber-500",
  safe:    "bg-emerald-500",
};

const THREAT_LABELS = {
  unknown: "?",
  danger:  "Danger",
  risky:   "Risky",
  safe:    "Safe",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCell({ value, player, compare }: {
  value: number | null;
  player?: number;
  /** if true, color red when value > player (enemy AP > player protection) */
  compare?: boolean;
}) {
  if (value === null) return <span className="text-muted-foreground/30 tabular-nums">—</span>;
  const color = compare && player !== undefined
    ? value > player ? "text-red-400" : value > player * 0.7 ? "text-amber-400" : "text-emerald-400"
    : "text-foreground/80";
  return <span className={cn("tabular-nums text-xs font-mono", color)}>{value.toLocaleString()}</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CombatPlanner({ characters, zones }: CombatPlannerProps) {
  const [characterId, setCharacterId] = useState(characters[0]?.hashed_id ?? "");
  const [charStats, setCharStats] = useState<CharacterStats | null>(null);
  const [loadingChar, setLoadingChar] = useState(false);

  // Manual movement speed override (since it's not always in the API)
  const [movementSpeed, setMovementSpeed] = useState(20);

  // Scaling — enabled when combat L80+
  const [scalingEnabled, setScalingEnabled] = useState(false);
  const [scaledLevel, setScaledLevel] = useState(80);

  // Zone expand state
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set(zones.map((z) => z.id)));

  // Fetch character stats when selection changes
  useEffect(() => {
    if (!characterId) { setCharStats(null); return; }
    let cancelled = false;
    setLoadingChar(true);

    fetch(`/api/idlemmo/character/${characterId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const stats = data.stats as Record<string, { level: number }> | undefined;
        if (!stats) return;

        const combatLevel = stats.combat?.level ?? 0;
        setCharStats({
          combatLevel,
          movementSpeed,
          attack_power: Math.floor((stats.strength?.level ?? 0) * 2.4),
          protection:   Math.floor((stats.defence?.level  ?? 0) * 2.4),
          agility:      Math.floor((stats.speed?.level    ?? 0) * 2.4),
          accuracy:     Math.floor((stats.dexterity?.level ?? 0) * 2.4),
        });

        // Auto-set scaled level to combat level (capped at 150)
        setScaledLevel(Math.min(Math.max(combatLevel, 1), 150));
      })
      .catch(() => { if (!cancelled) setLoadingChar(false); })
      .finally(() => { if (!cancelled) setLoadingChar(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  const canScale = (charStats?.combatLevel ?? 0) >= 80;

  const effectiveScaling = scalingEnabled && canScale;

  function toggleZone(zoneId: string) {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      next.has(zoneId) ? next.delete(zoneId) : next.add(zoneId);
      return next;
    });
  }

  // XP/hour and food estimates for a zone (uses first enemy's stats as representative)
  function zoneEstimates(zone: Zone) {
    const eph = charStats ? enemiesPerHour(charStats.combatLevel, movementSpeed) : null;

    // Average XP per kill across enemies in zone
    const xpValues = zone.enemies
      .map((e) => {
        const lvl = effectiveScaling ? scaledLevel : e.baseLevel;
        return scaleXP(e.baseXP, e.baseLevel, lvl);
      })
      .filter((v): v is number => v !== null);
    const avgXP = xpValues.length > 0 ? Math.round(xpValues.reduce((a, b) => a + b, 0) / xpValues.length) : null;

    const xpPerHour = eph !== null && avgXP !== null ? Math.round(eph * avgXP) : null;

    // Damage estimate: avg (enemy_AP - player_Prot, min 1) per enemy per hit
    // Rough hits per enemy = 1 (simplified — actual depends on HP and hit chance)
    const playerProt = charStats?.protection ?? 0;
    const dmgValues = zone.enemies
      .map((e) => {
        const lvl = effectiveScaling ? scaledLevel : e.baseLevel;
        const ap = scaleStat(e.stats.attack_power, e.baseLevel, lvl);
        return ap !== null ? Math.max(1, ap - playerProt) : null;
      })
      .filter((v): v is number => v !== null);
    const avgDmg = dmgValues.length > 0 ? Math.round(dmgValues.reduce((a, b) => a + b, 0) / dmgValues.length) : null;
    const dmgPerHour = eph !== null && avgDmg !== null ? Math.round(eph * avgDmg) : null;

    return { eph, avgXP, xpPerHour, avgDmg, dmgPerHour };
  }

  const hasAnyData = zones.some((z) => z.enemies.some((e) => e.baseXP !== null || e.baseHP !== null || e.stats.attack_power !== null));

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sword className="size-6 text-red-500/80 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Combat Planner</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Enemy zones · Scaling XP · Food consumption estimate
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Character */}
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

        {/* Movement speed */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Activity className="size-3" /> Movement Speed (m/s)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={50}
              value={movementSpeed}
              onChange={(e) => setMovementSpeed(Math.min(50, Math.max(1, parseInt(e.target.value, 10) || 1)))}
              className="w-20 text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
            />
            <span className="text-xs text-muted-foreground/60 font-mono">m/s (affects hunt rate)</span>
          </div>
        </div>

        {/* Scaling */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="size-3" /> Enemy Scaling
            {!canScale && charStats && (
              <span className="text-muted-foreground/40 normal-case font-normal ml-1">(L80+ required)</span>
            )}
          </label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scalingEnabled}
                disabled={!canScale}
                onChange={(e) => setScalingEnabled(e.target.checked)}
                className="accent-primary"
              />
              <span className="text-sm text-muted-foreground">
                {scalingEnabled ? `Scale to L${scaledLevel}` : "Off"}
              </span>
            </label>
            {scalingEnabled && canScale && (
              <input
                type="range"
                min={charStats?.combatLevel ?? 80}
                max={(charStats?.combatLevel ?? 100) >= 100 ? 150 : charStats?.combatLevel ?? 80}
                value={scaledLevel}
                onChange={(e) => setScaledLevel(parseInt(e.target.value, 10))}
                className="flex-1 accent-primary"
              />
            )}
          </div>
        </div>
      </div>

      {/* Character combat stats summary */}
      {charStats && !loadingChar && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STAT_COLS.map(({ key, label, icon: Icon, title }) => (
            <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 border border-border/40">
              <Icon className="size-3 text-muted-foreground/60 shrink-0" />
              <div>
                <p className="text-[10px] font-mono uppercase text-muted-foreground/60">{title}</p>
                <p className="text-sm font-bold tabular-nums">{charStats[key as keyof CharacterStats] as number}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state — no data yet */}
      {!hasAnyData && (
        <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-3.5 text-amber-500/70 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-mono text-amber-500/80 uppercase tracking-wide">Enemy data pending</p>
              <p className="text-xs text-muted-foreground/60">
                Zone and enemy stats are populated from in-game observation. Add data to{" "}
                <code className="text-xs bg-muted px-1 rounded">data/zones.ts</code> to enable XP and food estimates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Zone sections */}
      {zones.map((zone) => {
        const expanded = expandedZones.has(zone.id);
        const estimates = zoneEstimates(zone);
        const scaledLvl = effectiveScaling ? scaledLevel : null;

        // MF bonus for scaling (0-40% based on gap from base enemy avg level)
        const avgBaseLevel = zone.enemies.reduce((a, e) => a + e.baseLevel, 0) / zone.enemies.length;
        const mfGap = scaledLvl !== null ? Math.max(0, scaledLvl - avgBaseLevel) : 0;
        const mfBonus = Math.min(40, Math.round((mfGap / 50) * 40));

        return (
          <div key={zone.id} className="rounded-lg border border-border overflow-hidden">
            {/* Zone header */}
            <button
              onClick={() => toggleZone(zone.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border hover:bg-muted/60 transition-colors text-left"
            >
              {expanded
                ? <ChevronDown className="size-3.5 text-muted-foreground/60 shrink-0" />
                : <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
              }
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono uppercase tracking-widest font-semibold">{zone.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground/50">
                  Min L{zone.minLevel} · {zone.enemies.length} {zone.enemies.length === 1 ? "enemy" : "enemies"}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* XP/hr estimate */}
                {estimates.xpPerHour !== null && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60">
                    <TrendingUp className="size-2.5" />
                    {(estimates.xpPerHour).toLocaleString()} XP/hr
                    {effectiveScaling && mfBonus > 0 && (
                      <span className="text-emerald-400 ml-1">+{mfBonus}% MF</span>
                    )}
                  </div>
                )}
                {/* Damage/hr estimate */}
                {estimates.dmgPerHour !== null && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60">
                    <Flame className="size-2.5 text-red-400/60" />
                    ~{(estimates.dmgPerHour).toLocaleString()} dmg/hr
                  </div>
                )}
              </div>
            </button>

            {expanded && (
              <>
                {/* Enemy table */}
                <div className="overflow-x-auto">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_3rem_4rem_4rem_4rem_4rem_4rem_4rem] items-center gap-2 px-4 py-1.5 bg-muted/20 border-b border-border/50">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">Enemy</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 text-center">Lvl</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 text-center">HP</span>
                    {STAT_COLS.map(({ label }) => (
                      <span key={label} className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 text-center">{label}</span>
                    ))}
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 text-center">XP</span>
                  </div>

                  {/* Enemy rows */}
                  {zone.enemies.map((enemy, i) => {
                    const displayLevel = effectiveScaling ? scaledLevel : enemy.baseLevel;
                    const scaledHP = effectiveScaling ? scaleStat(enemy.baseHP, enemy.baseLevel, scaledLevel) : enemy.baseHP;
                    const scaledXP = effectiveScaling ? scaleXP(enemy.baseXP, enemy.baseLevel, scaledLevel) : enemy.baseXP;
                    const scaledAP  = effectiveScaling ? scaleStat(enemy.stats.attack_power, enemy.baseLevel, scaledLevel) : enemy.stats.attack_power;
                    const scaledProt = effectiveScaling ? scaleStat(enemy.stats.protection, enemy.baseLevel, scaledLevel) : enemy.stats.protection;
                    const scaledAgi  = effectiveScaling ? scaleStat(enemy.stats.agility, enemy.baseLevel, scaledLevel) : enemy.stats.agility;
                    const scaledAcc  = effectiveScaling ? scaleStat(enemy.stats.accuracy, enemy.baseLevel, scaledLevel) : enemy.stats.accuracy;

                    const threat = threatLevel(scaledAP, charStats?.protection ?? 0);

                    return (
                      <div
                        key={enemy.id}
                        className={cn(
                          "grid grid-cols-[1fr_3rem_4rem_4rem_4rem_4rem_4rem_4rem] items-center gap-2 px-4 py-2.5 border-b border-border/30 last:border-b-0 transition-colors hover:bg-muted/10",
                          i % 2 === 0 ? "bg-background" : "bg-muted/5"
                        )}
                      >
                        {/* Name + threat dot */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("size-1.5 rounded-full shrink-0", THREAT_COLORS[threat])} title={THREAT_LABELS[threat]} />
                          <span className="text-sm font-medium truncate">{enemy.name}</span>
                        </div>

                        {/* Level */}
                        <div className="text-center">
                          <span className={cn(
                            "text-xs font-mono tabular-nums",
                            effectiveScaling && scaledLevel !== enemy.baseLevel ? "text-primary" : "text-muted-foreground"
                          )}>
                            {displayLevel}
                          </span>
                        </div>

                        {/* HP */}
                        <div className="text-center">
                          <StatCell value={scaledHP} />
                        </div>

                        {/* AP — color vs player Protection */}
                        <div className="text-center">
                          <StatCell value={scaledAP} player={charStats?.protection} compare />
                        </div>

                        {/* Protection — color vs player AP */}
                        <div className="text-center">
                          <StatCell value={scaledProt} player={charStats?.attack_power} />
                        </div>

                        {/* Agility */}
                        <div className="text-center">
                          <StatCell value={scaledAgi} />
                        </div>

                        {/* Accuracy */}
                        <div className="text-center">
                          <StatCell value={scaledAcc} />
                        </div>

                        {/* XP */}
                        <div className="text-center">
                          <StatCell value={scaledXP} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Zone estimates footer */}
                {(estimates.xpPerHour !== null || estimates.dmgPerHour !== null) && (
                  <div className="px-4 py-2.5 bg-muted/10 border-t border-border/40 flex items-center gap-6 flex-wrap">
                    {estimates.eph !== null && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/60">
                        <Zap className="size-2.5" />
                        ~{estimates.eph.toLocaleString()} enemies/hr at L{charStats?.combatLevel} · {movementSpeed}m/s
                      </div>
                    )}
                    {estimates.xpPerHour !== null && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        <TrendingUp className="size-2.5 text-primary/60" />
                        <span className="text-primary/80 font-medium">{estimates.xpPerHour.toLocaleString()}</span>
                        <span className="text-muted-foreground/60">XP/hr</span>
                        {estimates.avgXP !== null && (
                          <span className="text-muted-foreground/40">({estimates.avgXP} avg/kill)</span>
                        )}
                      </div>
                    )}
                    {estimates.dmgPerHour !== null && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        <Coffee className="size-2.5 text-amber-500/60" />
                        <span className="text-amber-500/80 font-medium">~{estimates.dmgPerHour.toLocaleString()}</span>
                        <span className="text-muted-foreground/60">dmg/hr (rough — 1 hit/enemy assumed)</span>
                      </div>
                    )}
                    {effectiveScaling && mfBonus > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        <span className="text-emerald-400 font-medium">+{mfBonus}% MF</span>
                        <span className="text-muted-foreground/40">(scaling L{Math.round(avgBaseLevel)}→{scaledLevel})</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-red-500 inline-block" /> Danger — enemy AP significantly exceeds your Protection</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-amber-500 inline-block" /> Risky — enemy AP slightly exceeds your Protection</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500 inline-block" /> Safe — your Protection absorbs most damage</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-muted-foreground/30 inline-block" /> Unknown — no enemy data yet</span>
      </div>
      <p className="text-[10px] text-muted-foreground/40 font-mono">
        AP column coloured vs your Protection. XP and damage estimates require enemy data in data/zones.ts.
        Scaling formula: stat × (scaled_level / base_level) — validate against in-game values.
      </p>
    </div>
  );
}
