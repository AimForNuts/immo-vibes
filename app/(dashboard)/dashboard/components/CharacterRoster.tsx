"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, MapPin, Crown, RefreshCw } from "lucide-react";
import type { CachedCharacter } from "@/lib/services/character-cache";

const STATUS_CONFIG = {
  ONLINE:  { dot: "bg-emerald-500", ring: "shadow-[0_0_8px_#10b981]", text: "text-emerald-400",  label: "online"  },
  IDLING:  { dot: "bg-amber-400",   ring: "shadow-[0_0_8px_#fbbf24]", text: "text-amber-400",    label: "idling"  },
  OFFLINE: { dot: "bg-zinc-600",    ring: "",                          text: "text-zinc-500",     label: "offline" },
} as const;

interface CharacterRosterProps {
  initialRoster:  CachedCharacter[];
  initialIsStale: boolean;
  titleLabel:     string;
  countLabel:     (n: number) => string;
  columnLabels:   { name: string; class: string; level: string; location: string; status: string };
  statusLabels:   { online: string; idling: string; offline: string };
}

export function CharacterRoster({
  initialRoster,
  initialIsStale,
  titleLabel,
  countLabel,
  columnLabels,
  statusLabels,
}: CharacterRosterProps) {
  const [roster,    setRoster]    = useState(initialRoster);
  const [syncing,   setSyncing]   = useState(false);
  const [syncDone,  setSyncDone]  = useState(false);

  useEffect(() => {
    if (!initialIsStale) return;

    setSyncing(true);
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data: CachedCharacter[]) => {
        if (Array.isArray(data) && data.length > 0) setRoster(data);
        setSyncing(false);
        setSyncDone(true);
        // Fade the "done" indicator out after 2s
        setTimeout(() => setSyncDone(false), 2000);
      })
      .catch(() => setSyncing(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel = (key: string | null) => {
    if (!key || !(key in STATUS_CONFIG)) return null;
    const cfg = STATUS_CONFIG[key as keyof typeof STATUS_CONFIG];
    return { ...cfg, text: statusLabels[cfg.label] };
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold tracking-tight">{titleLabel}</h2>
        <div className="flex items-center gap-2">
          {syncing && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400/70 animate-pulse">
              <RefreshCw className="size-2.5 animate-spin" />
              syncing
            </span>
          )}
          {syncDone && (
            <span className="text-[10px] font-mono text-emerald-400/70 transition-opacity">
              ✓ updated
            </span>
          )}
          <span className="text-xs font-mono text-muted-foreground">
            {countLabel(roster.length)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-lg border border-border overflow-hidden transition-all duration-500"
        style={{ filter: syncing ? "blur(1.5px)" : "none", opacity: syncing ? 0.6 : 1 }}
      >
        {/* Column headers */}
        <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 border-b border-border/60">
          <div className="w-4" />
          <div className="w-7" />
          <div className="w-40 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{columnLabels.name}</div>
          <div className="w-24 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{columnLabels.class}</div>
          <div className="w-20 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{columnLabels.level}</div>
          <div className="w-40 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{columnLabels.location}</div>
          <div className="ml-auto text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{columnLabels.status}</div>
        </div>

        {roster.length > 0 ? (
          roster.map((char, i) => {
            const status = statusLabel(char.currentStatus);
            return (
              <Link
                key={char.hashedId}
                href={`/dashboard/characters/${char.hashedId}`}
                className="group flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/50 transition-colors"
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <div className="w-4 flex justify-center shrink-0">
                  <span className={`size-2 rounded-full ${status ? `${status.dot} ${status.ring}` : "bg-zinc-700"}`} />
                </div>

                <div className="size-7 rounded bg-muted shrink-0 flex items-center justify-center overflow-hidden">
                  {char.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={char.imageUrl} alt={char.name} className="size-full object-cover" />
                  ) : (
                    <User className="size-3.5 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex items-center gap-1.5 min-w-0 w-40 shrink-0">
                  <span className="text-sm font-semibold truncate">{char.name}</span>
                  {char.isPrimary && <Crown className="size-3 text-amber-400 shrink-0" />}
                </div>

                <div className="w-24 shrink-0">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{char.class}</span>
                </div>

                <div className="w-20 shrink-0">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Lv&nbsp;<span className="text-foreground font-bold">{char.totalLevel}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 w-40 shrink-0 min-w-0">
                  {char.locationName ? (
                    <>
                      <MapPin className="size-3 text-muted-foreground/50 shrink-0" />
                      <span className="text-[11px] text-muted-foreground truncate">{char.locationName}</span>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/30 font-mono">—</span>
                  )}
                </div>

                <div className="ml-auto shrink-0">
                  {status ? (
                    <span className={`text-[11px] font-mono ${status.text}`}>{statusLabels[status.label]}</span>
                  ) : (
                    <span className="text-[11px] font-mono text-muted-foreground/30">—</span>
                  )}
                </div>
              </Link>
            );
          })
        ) : syncing ? (
          /* Empty cache + first load: show skeleton rows */
          <div className="divide-y divide-border/40">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="w-4 flex justify-center shrink-0">
                  <div className="size-2 rounded-full bg-zinc-700 animate-pulse" />
                </div>
                <div className="size-7 rounded bg-zinc-800 animate-pulse shrink-0" />
                <div className="h-3 w-28 bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse ml-4" />
                <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse ml-4" />
                <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse ml-4" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground px-4 py-6">No characters found.</p>
        )}
      </div>
    </div>
  );
}
