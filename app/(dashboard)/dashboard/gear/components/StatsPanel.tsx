"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import type { ComputedStats, SlotStatsMap, GearSet } from "../types";

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

interface StatsPanelProps {
  computed:     ComputedStats | null;
  charStats:    Record<string, number>;
  slotStatsA:   SlotStatsMap;
  slotStatsB:   SlotStatsMap;
  setA:         GearSet;
  setB:         GearSet;
  characters:   { hashed_id: string; name: string }[];
  characterId:  string;
  comparing:    boolean;
  onCompare:    () => void;
}

export function StatsPanel({
  computed,
  characters,
  characterId,
  comparing,
  onCompare,
}: StatsPanelProps) {
  const allStatKeys = computed
    ? Array.from(new Set([...Object.keys(computed.setA), ...Object.keys(computed.setB)])).sort()
    : [];

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={onCompare} disabled={comparing} className="gap-2">
          <Play className="size-4" />
          {comparing ? "Comparing…" : "Compare"}
        </Button>
      </div>

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
                      <td className={`py-2 text-right tabular-nums font-medium ${delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                        {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
                      </td>
                    </tr>
                  );
                })}
                {allStatKeys.length > 1 && (() => {
                  const sumA = allStatKeys.reduce((s, k) => s + (computed.setA[k] ?? 0), 0);
                  const sumB = allStatKeys.reduce((s, k) => s + (computed.setB[k] ?? 0), 0);
                  const d = sumB - sumA;
                  return (
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right tabular-nums">{sumA}</td>
                      <td className="py-2 text-right tabular-nums">{sumB}</td>
                      <td className={`py-2 text-right tabular-nums ${d > 0 ? "text-green-500" : d < 0 ? "text-red-500" : "text-muted-foreground"}`}>
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
    </>
  );
}
