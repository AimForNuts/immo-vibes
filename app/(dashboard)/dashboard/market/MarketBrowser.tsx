"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Mountain, FlaskConical, Sword, Hammer, Gem,
  Package, Coins, Loader2, X, SlidersHorizontal, ChevronRight,
  Skull, Swords, Globe, ShoppingBag, Sparkles, BookOpen, Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKET_TABS } from "@/lib/market-config";
import { QUALITY_COLORS } from "@/lib/game-constants";
import type { ItemSearchResult, ItemInspect } from "@/lib/idlemmo";

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
  name:      string;
  vendorMin: string;
  vendorMax: string;
  marketMin: string;
  marketMax: string;
}

const DEFAULT_FILTERS: Filters = {
  rarities:  new Set(),
  types:     new Set(),
  name:      "",
  vendorMin: "",
  vendorMax: "",
  marketMin: "",
  marketMax: "",
};

// ─── Item card ────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item:        ItemSearchResult;
  marketPrice: MarketPrice | null | undefined; // undefined = loading, null = no data
  selected:    boolean;
  onClick:     () => void;
}

function ItemCard({ item, marketPrice, selected, onClick }: ItemCardProps) {
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

        {marketPrice === undefined ? (
          <div className="h-3 w-14 bg-zinc-800 rounded animate-pulse" />
        ) : marketPrice?.price != null ? (
          <div className="flex items-center gap-1 text-[10px] text-amber-400/80">
            <span className="font-mono">⚖</span>
            <span>{marketPrice.price.toLocaleString()}g</span>
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
  isAllTab:         boolean;
  hasActiveFilters: boolean;
  onReset:          () => void;
}

function FilterBar({ filters, setFilters, availableTypes, isAllTab, hasActiveFilters, onReset }: FilterBarProps) {
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

      {/* Name search (category tabs only) */}
      {!isAllTab && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Name</p>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-zinc-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by name…"
              value={filters.name}
              onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded focus:outline-none focus:border-amber-400/50 text-zinc-200 placeholder:text-zinc-700"
            />
          </div>
        </div>
      )}

      {/* Item type (category tabs with multiple types) */}
      {!isAllTab && availableTypes.length > 1 && (
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
  item:                 ItemSearchResult;
  detail:               ItemInspect | null | "loading";
  marketPrice:          MarketPrice | null | "loading";
  /** Market prices for recipe materials; keyed by hashed_item_id. undefined = loading */
  materialPrices:       Record<string, MarketPrice | null | undefined>;
  showsRecipes:         boolean;
  onClose:              () => void;
}

function DetailPanel({ item, detail, marketPrice, materialPrices, showsRecipes, onClose }: DetailPanelProps) {
  const qualityText = QUALITY_COLORS[item.quality] ?? "text-zinc-400";
  const borderColor = QUALITY_BORDER_COLOR[item.quality] ?? "rgba(113,113,122,0.4)";

  const isLoading = detail === "loading";
  const d  = detail !== "loading" ? detail : null;
  const mp = marketPrice !== "loading" ? marketPrice : null;

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
                {marketPrice === "loading" ? (
                  <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                ) : mp?.price != null ? (
                  <div>
                    <p className="text-sm font-mono text-amber-400">{mp.price.toLocaleString()}g</p>
                    {mp.sold_at && (
                      <p className="text-[9px] text-zinc-600 mt-0.5">
                        {new Date(mp.sold_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-700">—</p>
                )}
              </div>
            </div>

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

            {/* Recipe — shown for alchemy/gear/tools tabs */}
            {showsRecipes && d?.recipe && (
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
                    <div className="border-t border-zinc-800 pt-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Produces</span>
                      <span className="text-amber-400/80">{d.recipe.result.item_name}</span>
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
  const [activeTab, setActiveTab]       = useState("all");
  const [items, setItems]               = useState<ItemSearchResult[]>([]);
  const [loading, setLoading]           = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const [loadProgress, setLoadProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError]               = useState<string | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters]         = useState<Filters>(DEFAULT_FILTERS);

  // Market prices: undefined = not fetched yet, null = fetched but no data
  // Persists across tab switches — no need to re-fetch prices we already have.
  const [marketPrices, setMarketPrices] = useState<Record<string, MarketPrice | null | undefined>>({});

  // Selected item detail panel
  const [selectedItem, setSelectedItem]       = useState<ItemSearchResult | null>(null);
  const [itemDetail, setItemDetail]           = useState<ItemInspect | null | "loading">(null);
  const [itemMarketPrice, setItemMarketPrice] = useState<MarketPrice | null | "loading">(null);
  // Market prices for recipe materials in the detail panel
  const [materialPrices, setMaterialPrices]   = useState<Record<string, MarketPrice | null | undefined>>({});

  const searchTimerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelFetchRef   = useRef(false);
  const cancelPriceRef   = useRef(false);
  const priceFetchingRef = useRef<Set<string>>(new Set());

  /**
   * Tab item cache — persists loaded items per tab so switching back is instant.
   * Tabs that were cancelled mid-load are NOT in tabLoadedRef, so they refetch.
   */
  const tabItemsCache = useRef<Map<string, ItemSearchResult[]>>(new Map());
  const tabLoadedRef  = useRef<Set<string>>(new Set());

  // Cleanup search timer on unmount
  useEffect(() => {
    return () => { clearTimeout(searchTimerRef.current); };
  }, []);

  // ── Tab loading ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab === "all") {
      setItems([]);
      setLoading(false);
      setLoadProgress(null);
      setError(null);
      return;
    }

    // Restore from cache if fully loaded before
    if (tabLoadedRef.current.has(activeTab)) {
      const cached = tabItemsCache.current.get(activeTab) ?? [];
      setItems(cached);
      setLoading(false);
      setLoadProgress(null);
      return;
    }

    const tab = MARKET_TABS.find((t) => t.id === activeTab);
    if (!tab || tab.types.length === 0) return;

    setItems([]);
    setLoading(true);
    setLoadProgress({ current: 0, total: tab.types.length });
    setError(null);
    cancelFetchRef.current = false;

    const accumulated: ItemSearchResult[] = [];

    (async () => {
      for (let i = 0; i < tab.types.length; i++) {
        if (cancelFetchRef.current) break;
        try {
          const res  = await fetch(`/api/market?type=${encodeURIComponent(tab.types[i])}&page=1`);
          const data = await res.json();
          if (!cancelFetchRef.current && Array.isArray(data.items) && data.items.length > 0) {
            accumulated.push(...data.items);
            setItems((prev) => [...prev, ...data.items]);
          }
        } catch { /* individual type failures silently skipped */ }

        if (!cancelFetchRef.current) {
          setLoadProgress({ current: i + 1, total: tab.types.length });
        }
        if (i < tab.types.length - 1 && !cancelFetchRef.current) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }

      if (!cancelFetchRef.current) {
        // Full load complete — save to cache
        tabItemsCache.current.set(activeTab, accumulated);
        tabLoadedRef.current.add(activeTab);
        setLoading(false);
      }
      // If cancelled, we do NOT add to tabLoadedRef, so the tab will refetch next visit
    })();

    return () => { cancelFetchRef.current = true; };
  }, [activeTab]);

  // ── Batch-fetch market prices when items load ───────────────────────────────

  useEffect(() => {
    if (items.length === 0) return;
    cancelPriceRef.current = false;

    const toFetch = items.filter(
      (i) => marketPrices[i.hashed_id] === undefined && !priceFetchingRef.current.has(i.hashed_id)
    );
    if (toFetch.length === 0) return;

    const BATCH = 5;
    const DELAY = 400;

    (async () => {
      for (let i = 0; i < toFetch.length; i += BATCH) {
        if (cancelPriceRef.current) break;
        const batch = toFetch.slice(i, i + BATCH);
        batch.forEach((item) => priceFetchingRef.current.add(item.hashed_id));

        await Promise.all(batch.map(async (item) => {
          try {
            const r    = await fetch(`/api/market/price/${item.hashed_id}?tier=0`);
            const data = await r.json();
            if (!cancelPriceRef.current) {
              setMarketPrices((prev) => ({
                ...prev,
                [item.hashed_id]: {
                  price:    data.price    ?? null,
                  sold_at:  data.sold_at  ?? null,
                  quantity: data.quantity ?? null,
                },
              }));
            }
          } catch {
            if (!cancelPriceRef.current) {
              setMarketPrices((prev) => ({ ...prev, [item.hashed_id]: null }));
            }
          } finally {
            priceFetchingRef.current.delete(item.hashed_id);
          }
        }));

        if (i + BATCH < toFetch.length && !cancelPriceRef.current) {
          await new Promise((r) => setTimeout(r, DELAY));
        }
      }
    })();

    return () => { cancelPriceRef.current = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // ── All-tab search ──────────────────────────────────────────────────────────

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    setError(null);

    if (!value.trim()) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/market?query=${encodeURIComponent(value)}&page=1`);
        const data = await res.json();
        setItems(data.items ?? []);
      } catch {
        setError("Failed to search. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  // ── Tab switch ──────────────────────────────────────────────────────────────

  function switchTab(tabId: string) {
    cancelFetchRef.current = true;
    cancelPriceRef.current = true;
    clearTimeout(searchTimerRef.current);
    setSearchQuery("");
    setFilters(DEFAULT_FILTERS);
    // Do NOT clear marketPrices — keep accumulated prices across all tabs
    priceFetchingRef.current.clear();
    setSelectedItem(null);
    setMaterialPrices({});
    setActiveTab(tabId);
  }

  // ── Item click → detail panel ───────────────────────────────────────────────

  const handleItemClick = useCallback((item: ItemSearchResult) => {
    setSelectedItem(item);
    setItemDetail("loading");
    setItemMarketPrice("loading");
    setMaterialPrices({});

    // Fetch inspect data (includes recipe, stats, effects, where_to_find)
    fetch(`/api/idlemmo/item/${item.hashed_id}`)
      .then((r) => r.json())
      .then((data) => {
        const detail: ItemInspect | null = data.item ?? null;
        setItemDetail(detail);

        // If item has a recipe, fetch market prices for each material
        if (detail?.recipe?.materials?.length) {
          const mats = detail.recipe.materials;
          // Pre-seed with undefined (loading state)
          setMaterialPrices(Object.fromEntries(mats.map((m) => [m.hashed_item_id, undefined])));

          for (const mat of mats) {
            fetch(`/api/market/price/${mat.hashed_item_id}?tier=0`)
              .then((r) => r.json())
              .then((d) => setMaterialPrices((prev) => ({
                ...prev,
                [mat.hashed_item_id]: { price: d.price ?? null, sold_at: d.sold_at ?? null, quantity: d.quantity ?? null },
              })))
              .catch(() => setMaterialPrices((prev) => ({ ...prev, [mat.hashed_item_id]: null })));
          }
        }
      })
      .catch(() => setItemDetail(null));

    // Use already-loaded market price if available, else fetch fresh
    const cached = marketPrices[item.hashed_id];
    if (cached !== undefined) {
      setItemMarketPrice(cached);
    } else {
      fetch(`/api/market/price/${item.hashed_id}?tier=0`)
        .then((r) => r.json())
        .then((data) => setItemMarketPrice({
          price:    data.price    ?? null,
          sold_at:  data.sold_at  ?? null,
          quantity: data.quantity ?? null,
        }))
        .catch(() => setItemMarketPrice(null));
    }
  }, [marketPrices]);

  // ── Apply client-side filters ───────────────────────────────────────────────

  const filteredItems = items.filter((item) => {
    if (filters.rarities.size > 0 && !filters.rarities.has(item.quality)) return false;
    if (filters.types.size > 0    && !filters.types.has(item.type))        return false;
    if (filters.name && !item.name.toLowerCase().includes(filters.name.toLowerCase())) return false;

    const vp = item.vendor_price ?? 0;
    if (filters.vendorMin !== "" && vp < Number(filters.vendorMin)) return false;
    if (filters.vendorMax !== "" && vp > Number(filters.vendorMax)) return false;

    const mp = marketPrices[item.hashed_id]?.price ?? null;
    if (filters.marketMin !== "" && mp !== null && mp < Number(filters.marketMin)) return false;
    if (filters.marketMax !== "" && mp !== null && mp > Number(filters.marketMax)) return false;

    return true;
  });

  const activeFilterCount = [
    filters.rarities.size > 0,
    filters.types.size > 0,
    filters.name !== "",
    filters.vendorMin !== "" || filters.vendorMax !== "",
    filters.marketMin !== "" || filters.marketMax !== "",
  ].filter(Boolean).length;

  const tab = MARKET_TABS.find((t) => t.id === activeTab);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-0 h-full min-h-0" style={{ minHeight: "calc(100vh - 7rem)" }}>

      {/* ── Left: main content ───────────────────────────────────────────── */}
      <div className={cn("flex flex-col gap-4 flex-1 min-w-0 transition-all duration-200", selectedItem ? "mr-0" : "")}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Market</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Browse items across all categories</p>
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
            isAllTab={activeTab === "all"}
            hasActiveFilters={activeFilterCount > 0}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
        )}

        {/* All tab: search input */}
        {activeTab === "all" && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search items by name…"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 transition-colors"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-amber-400 animate-spin" />
            )}
          </div>
        )}

        {/* Progress bar */}
        {loadProgress && loading && loadProgress.total > 1 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${(loadProgress.current / loadProgress.total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-zinc-600 shrink-0">
              {loadProgress.current}/{loadProgress.total} types
            </span>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

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
                  marketPrice={marketPrices[item.hashed_id]}
                  selected={selectedItem?.hashed_id === item.hashed_id}
                  onClick={() => handleItemClick(item)}
                />
              ))}
              {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
            </div>
            {!loading && (
              <p className="text-xs text-zinc-700 pb-2">
                {filteredItems.length}{items.length !== filteredItems.length ? ` of ${items.length}` : ""} items
              </p>
            )}
          </>
        ) : activeTab === "all" && !searchQuery ? (
          <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
            <Search className="size-10 opacity-30" />
            <p className="text-sm">Type a name to search all items</p>
          </div>
        ) : !loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
            <Package className="size-10 opacity-30" />
            <p className="text-sm">No items found</p>
          </div>
        ) : null}
      </div>

      {/* ── Right: detail panel ──────────────────────────────────────────── */}
      {selectedItem && (
        <div className="w-80 shrink-0 ml-4 sticky top-0 self-start" style={{ maxHeight: "calc(100vh - 7rem)" }}>
          <DetailPanel
            item={selectedItem}
            detail={itemDetail}
            marketPrice={itemMarketPrice}
            materialPrices={materialPrices}
            showsRecipes={tab?.showsRecipes ?? false}
            onClose={() => setSelectedItem(null)}
          />
        </div>
      )}
    </div>
  );
}
