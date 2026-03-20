"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Sword, Shield, Wind, Crosshair, User, Zap, TrendingUp,
  ChevronDown, ChevronRight, Flame, Coffee, Activity, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnemyInfo } from "@/lib/idlemmo";
import type { EnemyCombatStats } from "@/data/enemy-combat-stats";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CharacterStats {
  combatLevel: number;
  attack_power: number;
  protection: number;
  agility: number;
  accuracy: number;
}

interface CombatPlannerProps {
  characters: { hashed_id: string; name: string }[];
  enemies: EnemyInfo[];
  combatStats: Record<number, EnemyCombatStats>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAT_COLS = [
  { key: "attack_power" as const, label: "AP",   icon: Sword,     title: "Attack Power" },
  { key: "protection"   as const, label: "Prot", icon: Shield,    title: "Protection" },
  { key: "agility"      as const, label: "Agi",  icon: Wind,      title: "Agility" },
  { key: "accuracy"     as const, label: "Acc",  icon: Crosshair, title: "Accuracy" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scaleStat(base: number, baseLevel: number, scaledLevel: number): number {
  if (baseLevel === 0) return base;
  return Math.round(base * (scaledLevel / baseLevel));
}

/** Enemies found per hour — see docs/game-mechanics/combat.md */
function enemiesPerHour(combatLevel: number, movementSpeed: number): number {
  const levelNorm = Math.min(combatLevel / 100, 1);
  const speedNorm = Math.min(movementSpeed / 50, 1);
  return Math.round(0.03 * (1 + levelNorm + speedNorm) * 3600);
}

function threatColor(enemyAP: number | null, playerProt: number): string {
  if (enemyAP === null) return "bg-muted-foreground/25";
  const net = enemyAP - playerProt;
  if (net > 40)  return "bg-red-500";
  if (net > 0)   return "bg-amber-500";
  return "bg-emerald-500";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CombatPlanner({ characters, enemies, combatStats }: CombatPlannerProps) {
  const [characterId, setCharacterId] = useState(characters[0]?.hashed_id ?? "");
  const [charStats, setCharStats] = useState<CharacterStats | null>(null);
  const [loadingChar, setLoadingChar] = useState(false);
  const [movementSpeed, setMovementSpeed] = useState(20);

  // Scaling
  const [scalingEnabled, setScalingEnabled] = useState(false);
  const [scaledLevel, setScaledLevel] = useState(80);

  // Zone expand state — all expanded by default
  const zones = useMemo(() => {
    const map = new Map<string, EnemyInfo[]>();
    for (const e of enemies) {
      const loc = e.location.name;
      if (!map.has(loc)) map.set(loc, []);
      map.get(loc)!.push(e);
    }
    // Sort each zone's enemies by level
    for (const arr of map.values()) arr.sort((a, b) => a.level - b.level);
    return map;
  }, [enemies]);

  const [expandedZones, setExpandedZones] = useState<Set<string>>(
    () => new Set(zones.keys())
  );

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
          attack_power: Math.floor((stats.strength?.level  ?? 0) * 2.4),
          protection:   Math.floor((stats.defence?.level   ?? 0) * 2.4),
          agility:      Math.floor((stats.speed?.level     ?? 0) * 2.4),
          accuracy:     Math.floor((stats.dexterity?.level ?? 0) * 2.4),
        });
        setScaledLevel(Math.min(Math.max(combatLevel, 1), 150));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingChar(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  const canScale = (charStats?.combatLevel ?? 0) >= 80;
  const scaling = scalingEnabled && canScale;

  function toggleZone(name: string) {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  const eph = charStats ? enemiesPerHour(charStats.combatLevel, movementSpeed) : null;

  const hasCombatStats = Object.keys(combatStats).length > 0;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sword className="size-6 text-red-500/80 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Combat Planner</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {enemies.length} enemies across {zones.size} zones · Scaling XP · Food consumption estimate
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <span className="text-xs text-muted-foreground/60 font-mono">
              {eph !== null ? `~${eph.toLocaleString()} enemies/hr` : "m/s"}
            </span>
          </div>
        </div>

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
                {scalingEnabled ? `L${scaledLevel}` : "Off"}
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

      {/* Character stats strip */}
      {charStats && !loadingChar && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Combat Lvl", value: charStats.combatLevel, icon: Sword },
            ...STAT_COLS.map(({ key, title, icon }) => ({ label: title, value: charStats[key], icon })),
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 border border-border/40">
              <Icon className="size-3 text-muted-foreground/60 shrink-0" />
              <div>
                <p className="text-[10px] font-mono uppercase text-muted-foreground/60">{label}</p>
                <p className="text-sm font-bold tabular-nums">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Combat stats pending notice */}
      {!hasCombatStats && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <Info className="size-3.5 text-amber-500/70 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground/70">
            Enemy combat stats (AP/Prot/Agi/Acc) are not in the API. Provide in-game observations and they&apos;ll be added to{" "}
            <code className="text-xs bg-muted px-1 rounded">data/enemy-combat-stats.ts</code>.
            HP, XP, and zone data load live from the API.
          </p>
        </div>
      )}

      {/* Zone sections */}
      {[...zones.entries()].map(([zoneName, zoneEnemies]) => {
        const expanded = expandedZones.has(zoneName);
        const minLevel = zoneEnemies[0]?.level ?? 0;
        const maxLevel = zoneEnemies[zoneEnemies.length - 1]?.level ?? 0;

        // Zone XP and damage estimates
        const avgXP = scaling
          ? zoneEnemies.reduce((s, e) => s + scaleStat(e.experience, e.level, scaledLevel), 0) / zoneEnemies.length
          : zoneEnemies.reduce((s, e) => s + e.experience, 0) / zoneEnemies.length;

        const xpPerHour = eph !== null ? Math.round(eph * avgXP) : null;

        // MF bonus for this zone when scaling
        const avgBaseLevel = zoneEnemies.reduce((s, e) => s + e.level, 0) / zoneEnemies.length;
        const mfGap = scaling ? Math.max(0, scaledLevel - avgBaseLevel) : 0;
        const mfBonus = Math.min(40, Math.round((mfGap / 50) * 40));

        return (
          <div key={zoneName} className="rounded-lg border border-border overflow-hidden">
            {/* Zone header */}
            <button
              onClick={() => toggleZone(zoneName)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border hover:bg-muted/60 transition-colors text-left"
            >
              {expanded
                ? <ChevronDown  className="size-3.5 text-muted-foreground/60 shrink-0" />
                : <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
              }
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono uppercase tracking-widest font-semibold">{zoneName}</span>
                <span className="text-[10px] font-mono text-muted-foreground/50">
                  L{minLevel}{minLevel !== maxLevel ? `–${maxLevel}` : ""} · {zoneEnemies.length} {zoneEnemies.length === 1 ? "enemy" : "enemies"}
                </span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {xpPerHour !== null && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60">
                    <TrendingUp className="size-2.5" />
                    {xpPerHour.toLocaleString()} XP/hr
                    {scaling && mfBonus > 0 && (
                      <span className="text-emerald-400 ml-1">+{mfBonus}% MF</span>
                    )}
                  </div>
                )}
              </div>
            </button>

            {expanded && (
              <>
                {/* Column headers */}
                <div className="grid grid-cols-[1.5rem_1fr_3.5rem_4rem_4.5rem_4rem_4rem_4rem_4rem_4rem] items-center gap-2 px-4 py-1.5 bg-muted/20 border-b border-border/50 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">
                  <span />
                  <span>Enemy</span>
                  <span className="text-center">Lvl</span>
                  <span className="text-center">HP</span>
                  <span className="text-center">XP/kill</span>
                  <span className="text-center">AP</span>
                  <span className="text-center">Prot</span>
                  <span className="text-center">Agi</span>
                  <span className="text-center">Acc</span>
                  <span className="text-center">Loot%</span>
                </div>

                {/* Enemy rows */}
                {zoneEnemies.map((enemy, i) => {
                  const cs = combatStats[enemy.id] ?? null;
                  const displayLevel = scaling ? scaledLevel : enemy.level;
                  const displayHP  = scaling ? scaleStat(enemy.health, enemy.level, scaledLevel) : enemy.health;
                  const displayXP  = scaling ? scaleStat(enemy.experience, enemy.level, scaledLevel) : enemy.experience;
                  const displayAP  = cs ? (scaling ? scaleStat(cs.attack_power, enemy.level, scaledLevel) : cs.attack_power) : null;
                  const displayProt = cs ? (scaling ? scaleStat(cs.protection,   enemy.level, scaledLevel) : cs.protection)   : null;
                  const displayAgi  = cs ? (scaling ? scaleStat(cs.agility,      enemy.level, scaledLevel) : cs.agility)      : null;
                  const displayAcc  = cs ? (scaling ? scaleStat(cs.accuracy,     enemy.level, scaledLevel) : cs.accuracy)     : null;

                  const threat = threatColor(displayAP, charStats?.protection ?? 0);

                  return (
                    <div
                      key={enemy.id}
                      className={cn(
                        "grid grid-cols-[1.5rem_1fr_3.5rem_4rem_4.5rem_4rem_4rem_4rem_4rem_4rem] items-center gap-2 px-4 py-2.5 border-b border-border/30 last:border-b-0 hover:bg-muted/10 transition-colors",
                        i % 2 === 0 ? "bg-background" : "bg-muted/5"
                      )}
                    >
                      {/* Threat dot */}
                      <span className={cn("size-1.5 rounded-full shrink-0 justify-self-center", threat)} />

                      {/* Name */}
                      <div className="flex items-center gap-2 min-w-0">
                        {enemy.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={enemy.image_url} alt="" className="size-5 object-contain shrink-0 opacity-80" />
                        )}
                        <span className="text-sm font-medium truncate">{enemy.name}</span>
                      </div>

                      {/* Level */}
                      <span className={cn(
                        "text-xs font-mono tabular-nums text-center",
                        scaling && scaledLevel !== enemy.level ? "text-primary font-semibold" : "text-muted-foreground"
                      )}>
                        {displayLevel}
                      </span>

                      {/* HP */}
                      <span className="text-xs font-mono tabular-nums text-center text-muted-foreground/80">
                        {displayHP.toLocaleString()}
                      </span>

                      {/* XP/kill */}
                      <span className="text-xs font-mono tabular-nums text-center text-foreground/70">
                        {displayXP}
                      </span>

                      {/* AP — red when above player Protection */}
                      <span className={cn(
                        "text-xs font-mono tabular-nums text-center",
                        displayAP === null ? "text-muted-foreground/25" :
                        charStats && displayAP > charStats.protection ? "text-red-400" :
                        charStats && displayAP > charStats.protection * 0.7 ? "text-amber-400" :
                        "text-muted-foreground/70"
                      )}>
                        {displayAP ?? "—"}
                      </span>

                      {/* Prot */}
                      <span className="text-xs font-mono tabular-nums text-center text-muted-foreground/70">
                        {displayProt ?? "—"}
                      </span>

                      {/* Agi */}
                      <span className="text-xs font-mono tabular-nums text-center text-muted-foreground/70">
                        {displayAgi ?? "—"}
                      </span>

                      {/* Acc */}
                      <span className="text-xs font-mono tabular-nums text-center text-muted-foreground/70">
                        {displayAcc ?? "—"}
                      </span>

                      {/* Loot chance */}
                      <span className="text-xs font-mono tabular-nums text-center text-muted-foreground/50">
                        {enemy.chance_of_loot}%
                      </span>
                    </div>
                  );
                })}

                {/* Zone footer */}
                {(xpPerHour !== null || eph !== null) && (
                  <div className="px-4 py-2.5 bg-muted/10 border-t border-border/40 flex items-center gap-6 flex-wrap">
                    {eph !== null && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/50">
                        <Zap className="size-2.5" />
                        ~{eph.toLocaleString()} enemies/hr
                      </div>
                    )}
                    {xpPerHour !== null && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        <TrendingUp className="size-2.5 text-primary/60" />
                        <span className="text-primary/80 font-medium">{xpPerHour.toLocaleString()}</span>
                        <span className="text-muted-foreground/50">XP/hr</span>
                        <span className="text-muted-foreground/35">({Math.round(avgXP)} avg/kill)</span>
                      </div>
                    )}
                    {scaling && mfBonus > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        <span className="text-emerald-400 font-medium">+{mfBonus}% MF</span>
                        <span className="text-muted-foreground/35">(L{Math.round(avgBaseLevel)}→{scaledLevel})</span>
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
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-red-500 inline-block" /> Enemy AP well above your Protection</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-amber-500 inline-block" /> Enemy AP slightly above your Protection</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500 inline-block" /> Your Protection absorbs most damage</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-muted-foreground/25 inline-block" /> Combat stats not yet recorded</span>
      </div>
    </div>
  );
}
