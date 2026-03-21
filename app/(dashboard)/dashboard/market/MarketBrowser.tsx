"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Mountain, FlaskConical, Sword, Hammer, Gem,
  Package, Coins, Loader2, X, SlidersHorizontal, ChevronRight,
  Skull, Swords, Globe, ShoppingBag, Sparkles, BookOpen, Archive,
  AlertCircle, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKET_TABS } from "@/lib/market-config";
import { QUALITY_COLORS } from "@/lib/game-constants";
import type { ItemInspect } from "@/lib/idlemmo";
import { idleMmoQueue, type IdleMmoQueueStatus } from "@/lib/idlemmo-queue";

/** Item shape returned by the DB-backed GET /api/market route. */
interface DbItem {
  hashed_id:       string;
  name:            string;
  type:            string;
  quality:         string;
  image_url:       string | null;
  vendor_price:    number | null;
  last_sold_price: number | null;
  last_sold_at:    string | null;
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

// ─── Quality decoration (inline styles — Tailwind can't build dynamic rgba) ──

const QUALITY_BORDER_COLOR: Record<string, string> = {
  STANDARD:  "rgba(244,244,245,0.4)",
  REFINED:   "rgba(96,165,250,0.55)",
  PREMIUM:   "rgba(74,222,128,0.55)",
  EPIC:      "rgba(192,132,252,0.6)",
  LEGENDARY: "rgba(251,146,60,0.6)",
  MYTHIC:    "rgba(232,121,249,0.65)",
  UNIQUE:    "rgba(167,139,250,0.55)",
};

const QUALITY_GLOW_COLOR: Record<string, string> = {
  STANDARD:  "rgba(244,244,245,0.08)",
  REFINED:   "rgba(96,165,250,0.14)",
  PREMIUM:   "rgba(74,222,128,0.14)",
  EPIC:      "rgba(192,132,252,0.16)",
  LEGENDARY: "rgba(251,146,60,0.16)",
  MYTHIC:    "rgba(232,121,249,0.18)",
  UNIQUE:    "rgba(167,139,250,0.14)",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, React.ElementType> = {
  all:          Search,
  resources:    Mountain,
  alchemy:      FlaskConical,
  gear:         Sword,
  tools:        Hammer,
  collectables: Gem,
  merchants:    ShoppingBag,
  event:        Sparkles,
  recipes:      BookOpen,
  legacy:       Archive,
};

const ALL_QUALITIES = Object.keys(QUALITY_COLORS);

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketPrice {
  price:    number | null;
  sold_at:  string | null;
  quantity: number | null;
}

interface Filters {
  rarities:  Set<string>;
  types:     Set<string>;
  vendorMin: string;
  vendorMax: string;
  marketMin: string;
  marketMax: string;
}

const DEFAULT_FILTERS: Filters = {
  rarities:  new Set(),
  types:     new Set(),
  vendorMin: "",
  vendorMax: "",
  marketMin: "",
  marketMax: "",
};

// ─── Loading status bar ───────────────────────────────────────────────────────

function LoadingStatus({ loading, status }: { loading: boolean; status: IdleMmoQueueStatus }) {
  const secsLeft = status.resetAt > 0
    ? Math.max(0, Math.ceil((status.resetAt * 1000 - Date.now()) / 1000))
    : 0;

  if (status.throttled) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-400/8 border border-amber-400/25 text-amber-400/90 text-sm">
        <Clock className="size-4 shrink-0" />
        <span>
          Rate limit reached — resuming{secsLeft > 0 ? ` in ${secsLeft}s` : " soon"}
        </span>
        <span className="ml-auto text-[11px] font-mono text-amber-400/50">
          {status.queueSize} queued
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin text-amber-400" />
        <span>Searching…</span>
        {status.remaining < 5 && (
          <span className="ml-auto text-[11px] font-mono text-zinc-600">
            {status.remaining} req left
          </span>
        )}
      </div>
    );
  }

  return null;
}

// ─── Item card ────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item:     DbItem;
  selected: boolean;
  onClick:  () => void;
}

function ItemCard({ item, selected, onClick }: ItemCardProps) {
  const qualityText = QUALITY_COLORS[item.quality]       ?? "text-zinc-400";
  const borderHover = QUALITY_BORDER_COLOR[item.quality] ?? "rgba(113,113,122,0.5)";
  const glowHover   = QUALITY_GLOW_COLOR[item.quality]   ?? "transparent";

  function onEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (selected) return;
    const el = e.currentTarget;
    el.style.borderColor = borderHover;
    el.style.boxShadow   = `0 0 20px -4px ${glowHover}`;
    el.style.transform   = "translateY(-2px)";
  }
  function onLeave(e: React.MouseEvent<HTMLDivElement>) {
    if (selected) return;
    const el = e.currentTarget;
    el.style.borderColor = "";
    el.style.boxShadow   = "";
    el.style.transform   = "";
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn(
        "bg-zinc-900 border rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-amber-400/50",
        selected ? "border-amber-400/60 bg-zinc-800/80" : "border-zinc-800"
      )}
      style={{
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
        ...(selected ? { borderColor: borderHover, boxShadow: `0 0 20px -4px ${glowHover}` } : {}),
      }}
    >
      {/* Image */}
      <div className="size-12 rounded-md bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="size-10 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <Package className="size-6 text-zinc-600" />
        )}
      </div>

      {/* Name */}
      <p className={cn("text-xs font-medium text-center leading-tight line-clamp-2 w-full", qualityText)}>
        {item.name}
      </p>

      {/* Type */}
      <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium text-center">
        {item.type.replace(/_/g, "\u00a0")}
      </span>

      {/* Prices row */}
      <div className="w-full flex flex-col gap-0.5 mt-auto">
        {item.vendor_price != null && item.vendor_price > 0 ? (
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Coins className="size-2.5 shrink-0" />
            <span>{item.vendor_price.toLocaleString()}</span>
          </div>
        ) : null}

        {item.last_sold_price != null ? (
          <div className="flex items-center gap-1 text-[10px] text-amber-400/80">
            <span className="font-mono">⚖</span>
            <span>{item.last_sold_price.toLocaleString()}g</span>
          </div>
        ) : (
          <div className="text-[10px] text-zinc-700">no listings</div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col items-center gap-2">
      <div className="size-12 rounded-md bg-zinc-800 animate-pulse" />
      <div className="w-3/4 h-3 bg-zinc-800 rounded animate-pulse" />
      <div className="w-1/2 h-2.5 bg-zinc-800 rounded animate-pulse" />
      <div className="w-full h-2.5 bg-zinc-800 rounded animate-pulse" />
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters:          Filters;
  setFilters:       React.Dispatch<React.SetStateAction<Filters>>;
  availableTypes:   string[];
  hasActiveFilters: boolean;
  onReset:          () => void;
}

function FilterBar({ filters, setFilters, availableTypes, hasActiveFilters, onReset }: FilterBarProps) {
  function toggleRarity(q: string) {
    setFilters((prev) => {
      const next = new Set(prev.rarities);
      next.has(q) ? next.delete(q) : next.add(q);
      return { ...prev, rarities: next };
    });
  }

  function toggleType(t: string) {
    setFilters((prev) => {
      const next = new Set(prev.types);
      next.has(t) ? next.delete(t) : next.add(t);
      return { ...prev, types: next };
    });
  }

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-4 space-y-4">
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

// ─── Item detail panel ────────────────────────────────────────────────────────

interface DetailPanelProps {
  item:              DbItem;
  detail:            ItemInspect | null | "loading";
  materialPrices:    Record<string, MarketPrice | null | undefined>;
  craftedByDetail:   ItemInspect | null | "loading" | undefined;
  craftedByItemData: DbItem | null | undefined;
  resultItemData:    DbItem | null | undefined;
  onClose:           () => void;
}

function DetailPanel({ item, detail, materialPrices, craftedByDetail, craftedByItemData, resultItemData, onClose }: DetailPanelProps) {
  const qualityText = QUALITY_COLORS[item.quality] ?? "text-zinc-400";
  const borderColor = QUALITY_BORDER_COLOR[item.quality] ?? "rgba(113,113,122,0.4)";

  const isLoading = detail === "loading";
  const d = detail !== "loading" ? detail : null;

  function statLabel(key: string) {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div
      className="flex flex-col h-full bg-zinc-950 border-l overflow-hidden"
      style={{ borderColor }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-zinc-800 shrink-0">
        <div className="size-14 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="size-12 object-contain" />
          ) : (
            <Package className="size-7 text-zinc-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold leading-tight", qualityText)}>{item.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={cn("text-[10px] font-mono border px-1.5 py-0.5 rounded", qualityText)} style={{ borderColor }}>
              {item.quality}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono uppercase">
              {item.type.replace(/_/g, " ")}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 p-0.5"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
            ))}
          </div>
        ) : (
          <>
            {/* Description */}
            {d?.description && (
              <p className="text-xs text-zinc-400 leading-relaxed italic border-l-2 border-zinc-700 pl-3">
                {d.description}
              </p>
            )}

            {/* Prices */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900 rounded-md p-3 border border-zinc-800">
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1">Vendor</p>
                {item.vendor_price ? (
                  <p className="text-sm font-mono text-zinc-300">{item.vendor_price.toLocaleString()}g</p>
                ) : (
                  <p className="text-xs text-zinc-700">—</p>
                )}
              </div>
              <div className="bg-zinc-900 rounded-md p-3 border border-zinc-800">
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1">Market</p>
                {item.last_sold_price != null ? (
                  <div>
                    <p className="text-sm font-mono text-amber-400">{item.last_sold_price.toLocaleString()}g</p>
                    {item.last_sold_at && (
                      <p className="text-[9px] text-zinc-600 mt-0.5">
                        {new Date(item.last_sold_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-700">—</p>
                )}
              </div>
            </div>

            {/* Crafted By — shown for non-recipe items that have a recipe producing them */}
            {item.type !== "RECIPE" && craftedByDetail !== undefined && (
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Crafted By</p>
                {craftedByDetail === "loading" ? (
                  <div className="space-y-2">
                    <div className="h-3 w-2/3 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-zinc-800 rounded animate-pulse" />
                  </div>
                ) : craftedByDetail === null ? null : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3 space-y-2 border-l-2" style={{ borderLeftColor: "rgba(251,146,60,0.4)" }}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <BookOpen className="size-3 shrink-0 text-amber-400/60" />
                        <span className="text-zinc-200 truncate">{craftedByDetail.name}</span>
                      </div>
                      <span className="text-zinc-500 shrink-0 ml-2">
                        {craftedByDetail.recipe?.skill} Lv.{craftedByDetail.recipe?.level_required}
                      </span>
                    </div>
                    {/* Recipe scroll vendor + market price */}
                    {craftedByItemData !== undefined && (
                      <div className="flex items-center gap-3 text-[10px] font-mono">
                        {craftedByItemData === null ? null : (
                          <>
                            {craftedByItemData.vendor_price ? (
                              <span className="text-zinc-500 flex items-center gap-1">
                                <Coins className="size-2.5" />
                                {craftedByItemData.vendor_price.toLocaleString()}g
                              </span>
                            ) : null}
                            {craftedByItemData.last_sold_price != null ? (
                              <span className="text-amber-400/70 flex items-center gap-1">
                                <span>⚖</span>
                                {craftedByItemData.last_sold_price.toLocaleString()}g
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
                    {craftedByDetail.recipe?.materials && craftedByDetail.recipe.materials.length > 0 && (
                      <div className="border-t border-zinc-800 pt-2 space-y-1.5">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Materials</p>
                        {craftedByDetail.recipe.materials.map((mat) => {
                          const mp = materialPrices[mat.hashed_item_id];
                          return (
                            <div key={mat.hashed_item_id} className="flex items-center justify-between text-xs gap-2">
                              <span className="text-zinc-300 truncate">{mat.item_name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-zinc-500">×{mat.quantity}</span>
                                {mp === undefined ? (
                                  <div className="h-3 w-10 bg-zinc-800 rounded animate-pulse" />
                                ) : mp?.price != null ? (
                                  <span className="font-mono text-amber-400/70 text-[10px]">
                                    {(mp.price * mat.quantity).toLocaleString()}g
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            {d?.stats && Object.keys(d.stats).length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Stats</p>
                <div className="space-y-1">
                  {Object.entries(d.stats).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{statLabel(key)}</span>
                      <span className="font-mono text-zinc-200">+{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Effects */}
            {d?.effects && d.effects.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Effects</p>
                <div className="space-y-1">
                  {d.effects.map((eff, i) => (
                    <div key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                      <ChevronRight className="size-3 shrink-0 text-zinc-600 mt-px" />
                      <span>
                        {eff.value_type === "percentage" ? `+${eff.value}%` : `+${eff.value}`}{" "}
                        {statLabel(eff.attribute)} ({eff.target})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {d?.requirements && Object.keys(d.requirements).length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Requirements</p>
                <div className="space-y-1">
                  {Object.entries(d.requirements).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{statLabel(key)}</span>
                      <span className="font-mono text-zinc-300">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipe */}
            {d?.recipe && (
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Recipe</p>
                <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Skill</span>
                    <span className="text-zinc-200">{d.recipe.skill} Lv.{d.recipe.level_required}</span>
                  </div>
                  <div className="border-t border-zinc-800 pt-2 space-y-2">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Materials</p>
                    {d.recipe.materials.map((mat) => {
                      const mp = materialPrices[mat.hashed_item_id];
                      return (
                        <div key={mat.hashed_item_id} className="flex items-center justify-between text-xs gap-2">
                          <span className="text-zinc-300 truncate">{mat.item_name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-zinc-500">×{mat.quantity}</span>
                            {mp === undefined ? (
                              <div className="h-3 w-10 bg-zinc-800 rounded animate-pulse" />
                            ) : mp?.price != null ? (
                              <span className="font-mono text-amber-400/70 text-[10px]">
                                {(mp.price * mat.quantity).toLocaleString()}g
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {d.recipe.result && (
                    <div className="border-t border-zinc-800 pt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Produces</span>
                        <span className="text-amber-400/80">{d.recipe.result.item_name}</span>
                      </div>
                      {resultItemData === undefined ? (
                        <div className="h-3 w-3/4 bg-zinc-800 rounded animate-pulse ml-auto" />
                      ) : resultItemData ? (
                        <div className="flex items-center justify-end gap-3 text-[10px] font-mono">
                          {resultItemData.vendor_price ? (
                            <span className="text-zinc-500 flex items-center gap-1">
                              <Coins className="size-2.5" />
                              {resultItemData.vendor_price.toLocaleString()}g
                            </span>
                          ) : null}
                          {resultItemData.last_sold_price != null ? (
                            <span className="text-amber-400/70 flex items-center gap-1">
                              <span>⚖</span>
                              {resultItemData.last_sold_price.toLocaleString()}g
                            </span>
                          ) : (
                            <span className="text-zinc-700">no market data</span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Where to find */}
            {d?.where_to_find && (
              (() => {
                const wtf = d.where_to_find;
                const hasData = (wtf.enemies?.length ?? 0) + (wtf.dungeons?.length ?? 0) + (wtf.world_bosses?.length ?? 0) > 0;
                if (!hasData) return null;
                return (
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Where to Find</p>
                    <div className="space-y-2">
                      {wtf.enemies?.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10px] text-zinc-600 uppercase tracking-wider">
                            <Skull className="size-3" /> Enemies
                          </div>
                          {wtf.enemies.slice(0, 5).map((e) => (
                            <div key={e.id} className="text-xs text-zinc-400 pl-4 flex justify-between">
                              <span>{e.name}</span>
                              <span className="text-zinc-600 font-mono">Lv.{e.level}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {wtf.dungeons?.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10px] text-zinc-600 uppercase tracking-wider">
                            <Swords className="size-3" /> Dungeons
                          </div>
                          {wtf.dungeons.map((d) => (
                            <div key={d.id} className="text-xs text-zinc-400 pl-4">{d.name}</div>
                          ))}
                        </div>
                      )}
                      {wtf.world_bosses?.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10px] text-zinc-600 uppercase tracking-wider">
                            <Globe className="size-3" /> World Bosses
                          </div>
                          {wtf.world_bosses.map((wb) => (
                            <div key={wb.id} className="text-xs text-zinc-400 pl-4">{wb.name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Tier info */}
            {d && d.max_tier > 1 && (
              <div className="border-t border-zinc-800 pt-3">
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                  Upgradeable · Max Tier {d.max_tier}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MarketBrowser() {
  const [activeTab, setActiveTab]     = useState("all");
  const [items, setItems]             = useState<DbItem[]>([]);
  const [loading, setLoading]         = useState(false);
  const [loadProgress, setLoadProgress] = useState<{ current: number; total: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError]             = useState<string | null>(null);

  // Queue status for the inspect rate-limit indicator
  const [queueStatus, setQueueStatus] = useState<IdleMmoQueueStatus>({
    remaining: 20, resetAt: 0, queueSize: 0, throttled: false,
  });

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters]         = useState<Filters>(DEFAULT_FILTERS);

  // Selected item detail panel
  const [selectedItem, setSelectedItem]     = useState<DbItem | null>(null);
  const [itemDetail, setItemDetail]         = useState<ItemInspect | null | "loading">(null);
  const [materialPrices, setMaterialPrices] = useState<Record<string, MarketPrice | null | undefined>>({});
  // For non-recipe items: the recipe that crafts this item (if any)
  const [craftedByDetail, setCraftedByDetail]     = useState<ItemInspect | null | "loading" | undefined>(undefined);
  // For non-recipe items: the recipe scroll's own DB prices (vendor/market)
  const [craftedByItemData, setCraftedByItemData] = useState<DbItem | null | undefined>(undefined);
  // For recipe items: the produced item's DB data (prices, name)
  const [resultItemData, setResultItemData]       = useState<DbItem | null | undefined>(undefined);

  const tabAbortRef    = useRef<AbortController | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Per-tab item cache so switching back is instant
  const tabCacheRef   = useRef<Map<string, DbItem[]>>(new Map());
  const tabLoadedRef  = useRef<Set<string>>(new Set());

  // Subscribe to queue status for the inspect indicator + cleanup on unmount
  useEffect(() => {
    idleMmoQueue.onStatusChange = setQueueStatus;
    return () => {
      idleMmoQueue.onStatusChange = null;
      clearTimeout(searchTimerRef.current);
      tabAbortRef.current?.abort();
      searchAbortRef.current?.abort();
    };
  }, []);

  // ── Tab loading (DB — instant, paginate all pages) ───────────────────────

  useEffect(() => {
    if (activeTab === "all") {
      setItems([]);
      setLoading(false);
      setLoadProgress(null);
      setError(null);
      return;
    }

    // Restore from cache if already fully loaded
    if (tabLoadedRef.current.has(activeTab)) {
      setItems(tabCacheRef.current.get(activeTab) ?? []);
      setLoading(false);
      setLoadProgress(null);
      return;
    }

    const capturedTab = activeTab;
    const controller  = new AbortController();
    tabAbortRef.current = controller;

    setItems([]);
    setLoading(true);
    setLoadProgress({ current: 0, total: 1 });
    setError(null);

    (async () => {
      const accumulated: DbItem[] = [];
      let page = 1;

      while (true) {
        try {
          const res  = await fetch(
            `/api/market?tab=${encodeURIComponent(capturedTab)}&page=${page}`,
            { signal: controller.signal }
          );
          const data = await res.json();
          if (!res.ok) { setError(data.error ?? "Failed to load"); break; }

          const batch: DbItem[] = data.items ?? [];
          accumulated.push(...batch);
          setItems([...accumulated]);

          const pagination = data.pagination;
          setLoadProgress({ current: pagination.current_page, total: pagination.last_page });

          if (!pagination || pagination.current_page >= pagination.last_page) break;
          page++;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          break;
        }
      }

      tabCacheRef.current.set(capturedTab, accumulated);
      tabLoadedRef.current.add(capturedTab);
      setLoading(false);
      setLoadProgress(null);
    })();

    return () => controller.abort();
  }, [activeTab]);

  // ── "All" tab search (DB — no rate limit) ────────────────────────────────

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    searchAbortRef.current?.abort();
    setError(null);

    if (!value.trim()) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      try {
        const res  = await fetch(
          `/api/market?query=${encodeURIComponent(value)}&page=1`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Search failed"); setItems([]); }
        else          setItems(data.items ?? []);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError("Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  // ── Tab switch ──────────────────────────────────────────────────────────

  function switchTab(tabId: string) {
    tabAbortRef.current?.abort();
    clearTimeout(searchTimerRef.current);
    searchAbortRef.current?.abort();
    idleMmoQueue.cancelByTag("inspect");
    setItems([]);
    setSearchQuery("");
    setFilters(DEFAULT_FILTERS);
    setSelectedItem(null);
    setMaterialPrices({});
    setCraftedByDetail(undefined);
    setCraftedByItemData(undefined);
    setResultItemData(undefined);
    setLoading(tabId !== "all");
    setLoadProgress(null);
    setError(null);
    setActiveTab(tabId);
  }

  // ── Item click → detail panel ───────────────────────────────────────────

  const handleItemClick = useCallback((item: DbItem) => {
    idleMmoQueue.cancelByTag("inspect");
    setSelectedItem(item);
    setItemDetail("loading");
    setMaterialPrices({});
    setCraftedByDetail(undefined);
    setCraftedByItemData(undefined);
    setResultItemData(undefined);

    // Fetch inspect data (stats, recipe, effects — not stored in DB)
    idleMmoQueue.fetch(`/api/idlemmo/item/${item.hashed_id}`, "inspect")
      .then((r) => r.json())
      .then((data) => {
        const detail: ItemInspect | null = data.item ?? null;
        setItemDetail(detail);

        if (item.type === "RECIPE") {
          // For RECIPE items: fetch produced item's DB prices
          const resultId = detail?.recipe?.result?.hashed_item_id;
          if (resultId) {
            fetch(`/api/market/item/${resultId}`)
              .then((r) => r.json())
              .then((d) => setResultItemData(d.item ?? null))
              .catch(() => setResultItemData(null));
          } else {
            setResultItemData(null);
          }
        } else {
          // For non-recipe items: find which recipe (if any) produces this item
          setCraftedByDetail("loading");
          fetch(`/api/market/crafted-by/${item.hashed_id}`)
            .then((r) => r.json())
            .then((d) => {
              const recipeRef = d.recipe as { hashed_id: string; name: string } | null;
              if (!recipeRef) { setCraftedByDetail(null); return; }

              // Fetch recipe scroll's own DB prices (vendor/market)
              fetch(`/api/market/item/${recipeRef.hashed_id}`)
                .then((r) => r.json())
                .then((d) => setCraftedByItemData(d.item ?? null))
                .catch(() => setCraftedByItemData(null));

              // Inspect the recipe item to get its materials
              return idleMmoQueue.fetch(`/api/idlemmo/item/${recipeRef.hashed_id}`, "inspect")
                .then((r) => r.json())
                .then((inspectData) => {
                  const recipeDetail: ItemInspect | null = inspectData.item ?? null;
                  setCraftedByDetail(recipeDetail);

                  // Fetch material prices (merged into shared materialPrices state)
                  if (recipeDetail?.recipe?.materials?.length) {
                    const mats = recipeDetail.recipe.materials;
                    setMaterialPrices((prev) => ({
                      ...prev,
                      ...Object.fromEntries(mats.map((m) => [m.hashed_item_id, undefined])),
                    }));
                    for (const mat of mats) {
                      idleMmoQueue.fetch(`/api/market/price/${mat.hashed_item_id}?tier=0`, "inspect")
                        .then((r) => r.json())
                        .then((pd) => setMaterialPrices((prev) => ({
                          ...prev,
                          [mat.hashed_item_id]: { price: pd.price ?? null, sold_at: pd.sold_at ?? null, quantity: pd.quantity ?? null },
                        })))
                        .catch((e: unknown) => {
                          if (isAbortError(e)) return;
                          setMaterialPrices((prev) => ({ ...prev, [mat.hashed_item_id]: null }));
                        });
                    }
                  }
                });
            })
            .catch((e: unknown) => {
              if (isAbortError(e)) return;
              setCraftedByDetail(null);
            });
        }

        // Fetch market prices for recipe materials (when item is a RECIPE scroll)
        if (detail?.recipe?.materials?.length) {
          const mats = detail.recipe.materials;
          setMaterialPrices((prev) => ({
            ...prev,
            ...Object.fromEntries(mats.map((m) => [m.hashed_item_id, undefined])),
          }));
          for (const mat of mats) {
            idleMmoQueue.fetch(`/api/market/price/${mat.hashed_item_id}?tier=0`, "inspect")
              .then((r) => r.json())
              .then((pd) => setMaterialPrices((prev) => ({
                ...prev,
                [mat.hashed_item_id]: { price: pd.price ?? null, sold_at: pd.sold_at ?? null, quantity: pd.quantity ?? null },
              })))
              .catch((e: unknown) => {
                if (isAbortError(e)) return;
                setMaterialPrices((prev) => ({ ...prev, [mat.hashed_item_id]: null }));
              });
          }
        }
      })
      .catch((e: unknown) => {
        if (isAbortError(e)) return;
        setItemDetail(null);
      });
  }, []);

  // ── Client-side filters ─────────────────────────────────────────────────

  const isAllTab = activeTab === "all";

  const filteredItems = items.filter((item) => {
    if (filters.rarities.size > 0 && !filters.rarities.has(item.quality)) return false;
    if (filters.types.size > 0    && !filters.types.has(item.type))        return false;

    // Name filter applies on category tabs (search bar = client-side filter there)
    if (!isAllTab && searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    const vp = item.vendor_price ?? 0;
    if (filters.vendorMin !== "" && vp < Number(filters.vendorMin)) return false;
    if (filters.vendorMax !== "" && vp > Number(filters.vendorMax)) return false;

    const mp = item.last_sold_price;
    if (filters.marketMin !== "" && mp !== null && mp < Number(filters.marketMin)) return false;
    if (filters.marketMax !== "" && mp !== null && mp > Number(filters.marketMax)) return false;

    return true;
  });

  const activeFilterCount = [
    filters.rarities.size > 0,
    filters.types.size > 0,
    filters.vendorMin !== "" || filters.vendorMax !== "",
    filters.marketMin !== "" || filters.marketMax !== "",
  ].filter(Boolean).length;

  const tab = MARKET_TABS.find((t) => t.id === activeTab);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-0 h-full min-h-0" style={{ minHeight: "calc(100vh - 7rem)" }}>

      {/* ── Left: main content ───────────────────────────────────────────── */}
      <div className={cn("flex flex-col gap-4 flex-1 min-w-0 transition-all duration-200", selectedItem ? "mr-0" : "")}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Market</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Browse categories or search all items</p>
          </div>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors border",
              showFilters
                ? "bg-amber-400/10 border-amber-400/30 text-amber-400"
                : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
            )}
          >
            <SlidersHorizontal className="size-3.5 shrink-0" />
            Filters
            {activeFilterCount > 0 && (
              <span className="size-4 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-bold flex items-center justify-center shrink-0">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab bar */}
        <div className="border-b border-zinc-800">
          <div className="flex overflow-x-auto">
            {MARKET_TABS.map((t) => {
              const Icon     = TAB_ICONS[t.id] ?? Search;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => switchTab(t.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                    isActive
                      ? "border-amber-400 text-amber-400"
                      : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            availableTypes={tab?.types ?? []}
            hasActiveFilters={activeFilterCount > 0}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
        )}

        {/* Search / name filter */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder={isAllTab ? "Search all items by name…" : `Filter ${tab?.label ?? ""} by name…`}
            value={searchQuery}
            onChange={(e) => isAllTab ? handleSearchInput(e.target.value) : setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 transition-colors"
          />
          {(loading || queueStatus.throttled) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {queueStatus.throttled
                ? <AlertCircle className="size-4 text-amber-400" />
                : <Loader2 className="size-4 text-amber-400 animate-spin" />
              }
            </div>
          )}
        </div>

        {/* Tab load progress */}
        {loadProgress && loadProgress.total > 1 && loading && (
          <div className="flex items-center gap-3 max-w-md">
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${(loadProgress.current / loadProgress.total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-zinc-600 shrink-0 font-mono">
              {loadProgress.current}/{loadProgress.total}
            </span>
          </div>
        )}

        {/* Loading / throttle status (All-tab search only) */}
        {isAllTab && <LoadingStatus loading={loading} status={queueStatus} />}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Grid */}
        {loading && items.length === 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredItems.length > 0 ? (
          <>
            <div className={cn(
              "grid gap-3",
              selectedItem
                ? "grid-cols-[repeat(auto-fill,minmax(110px,1fr))]"
                : "grid-cols-[repeat(auto-fill,minmax(130px,1fr))]"
            )}>
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.hashed_id}
                  item={item}
                  selected={selectedItem?.hashed_id === item.hashed_id}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
            {!loading && (
              <p className="text-xs text-zinc-700 pb-2">
                {filteredItems.length}{items.length !== filteredItems.length ? ` of ${items.length}` : ""} items
              </p>
            )}
          </>
        ) : !loading && isAllTab && !searchQuery ? (
          <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
            <Search className="size-10 opacity-30" />
            <p className="text-sm">Search all items by name</p>
          </div>
        ) : !loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
            <Package className="size-10 opacity-30" />
            <p className="text-sm">{isAllTab ? "No items found" : "No items synced yet — use Admin → Sync Items"}</p>
          </div>
        ) : null}
      </div>

      {/* ── Right: detail panel ──────────────────────────────────────────── */}
      {selectedItem && (
        <div className="w-80 shrink-0 ml-4 sticky top-0 self-start" style={{ maxHeight: "calc(100vh - 7rem)" }}>
          <DetailPanel
            item={selectedItem}
            detail={itemDetail}
            materialPrices={materialPrices}
            craftedByDetail={craftedByDetail}
            craftedByItemData={craftedByItemData}
            resultItemData={resultItemData}
            onClose={() => setSelectedItem(null)}
          />
        </div>
      )}
    </div>
  );
}
