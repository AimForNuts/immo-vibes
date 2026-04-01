"use client";

import type React from "react";
import { cn } from "@/lib/utils";
import { QUALITY_COLORS } from "@/lib/game-constants";
import type { Filters } from "../types";

const ALL_QUALITIES = Object.keys(QUALITY_COLORS);

interface FilterBarProps {
  filters:          Filters;
  setFilters:       React.Dispatch<React.SetStateAction<Filters>>;
  availableTypes:   string[];
  hasActiveFilters: boolean;
  onReset:          () => void;
}

export function FilterBar({ filters, setFilters, availableTypes, hasActiveFilters, onReset }: FilterBarProps) {
  function toggleRarity(q: string) {
    setFilters((prev) => {
      const next = new Set(prev.rarities);
      if (next.has(q)) { next.delete(q); } else { next.add(q); }
      return { ...prev, rarities: next };
    });
  }

  function toggleType(t: string) {
    setFilters((prev) => {
      const next = new Set(prev.types);
      if (next.has(t)) { next.delete(t); } else { next.add(t); }
      return { ...prev, types: next };
    });
  }

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-4 space-y-4">
      {/* Tradeable */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Tradeable</p>
        <div className="flex gap-1.5">
          {(["all", "tradeable"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilters((p) => ({ ...p, tradeable: v }))}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-mono border transition-all",
                filters.tradeable === v
                  ? "border-amber-400/60 text-amber-400 bg-amber-400/10"
                  : "text-zinc-600 border-zinc-800 hover:text-zinc-400 hover:border-zinc-600"
              )}
            >
              {v === "all" ? "All" : "Tradeable"}
            </button>
          ))}
        </div>
      </div>

      {/* Rarity */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Rarity</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_QUALITIES.map((q) => (
            <button
              key={q}
              onClick={() => toggleRarity(q)}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-mono border transition-all",
                filters.rarities.has(q)
                  ? cn("border-current bg-current/10", QUALITY_COLORS[q])
                  : "text-zinc-600 border-zinc-800 hover:text-zinc-400 hover:border-zinc-600"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Vendor price */}
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Vendor Price</p>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Min"
              value={filters.vendorMin}
              onChange={(e) => setFilters((p) => ({ ...p, vendorMin: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded focus:outline-none focus:border-amber-400/50 text-zinc-200 placeholder:text-zinc-700"
            />
            <span className="text-zinc-700 text-xs shrink-0">–</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.vendorMax}
              onChange={(e) => setFilters((p) => ({ ...p, vendorMax: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded focus:outline-none focus:border-amber-400/50 text-zinc-200 placeholder:text-zinc-700"
            />
          </div>
        </div>

        {/* Market price */}
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Market Price</p>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Min"
              value={filters.marketMin}
              onChange={(e) => setFilters((p) => ({ ...p, marketMin: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded focus:outline-none focus:border-amber-400/50 text-zinc-200 placeholder:text-zinc-700"
            />
            <span className="text-zinc-700 text-xs shrink-0">–</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.marketMax}
              onChange={(e) => setFilters((p) => ({ ...p, marketMax: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded focus:outline-none focus:border-amber-400/50 text-zinc-200 placeholder:text-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* Item type filter (category tabs with multiple types) */}
      {availableTypes.length > 1 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Type</p>
          <div className="flex flex-wrap gap-1.5">
            {availableTypes.map((t) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-mono border transition-all",
                  filters.types.has(t)
                    ? "border-amber-400/60 text-amber-400 bg-amber-400/10"
                    : "text-zinc-600 border-zinc-800 hover:text-zinc-400 hover:border-zinc-600"
                )}
              >
                {t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
