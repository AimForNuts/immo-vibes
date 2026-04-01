"use client";

import { useState } from "react";
import {
  Search, Mountain, FlaskConical, Sword, Hammer, Gem,
  Package, Loader2,
  SlidersHorizontal,
  ShoppingBag, Sparkles, BookOpen, Archive, Clock,
  AlertCircle,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKET_TABS, RESOURCE_CATEGORIES, MERCHANT_TYPE_LABELS } from "@/lib/market-config";
import { QUALITY_COLORS, QUALITY_ORDER, QUALITY_BORDER_CSS } from "@/lib/game-constants";
import { useSession } from "@/lib/auth-client";
import type { Filters } from "./types";
import { DEFAULT_FILTERS } from "./types";
import { useMarketItems } from "./hooks/useMarketItems";
import type { DateRange } from "./hooks/useMarketItems";
import { useItemDetail } from "./hooks/useItemDetail";
import { ItemCard, SkeletonCard } from "./components/ItemCard";
import { FilterBar } from "./components/FilterBar";
import { DetailPanel } from "./components/DetailPanel";

// ─── Constants ────────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, React.ElementType> = {
  all:             Search,
  resources:       Mountain,
  alchemy:         FlaskConical,
  gear:            Sword,
  tools:           Hammer,
  collectables:    Gem,
  merchants:       ShoppingBag,
  event:           Sparkles,
  recipes:         BookOpen,
  legacy:          Archive,
  recently_added:  Clock,
};

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  latest: "Latest batch",
  "30d":  "Last 30 days",
  "1y":   "Last year",
};

// ─── Loading status bar ───────────────────────────────────────────────────────

function LoadingStatus({ loading }: { loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin text-amber-400" />
        <span>Searching…</span>
      </div>
    );
  }

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MarketBrowser() {
  // Filters
  const [showFilters,        setShowFilters]        = useState(false);
  const [filters,            setFilters]            = useState<Filters>(DEFAULT_FILTERS);
  const [collapsedQualities, setCollapsedQualities] = useState<Set<string>>(new Set());
  const [recipeSkill,        setRecipeSkill]        = useState<"Alchemy" | "Forge" | null>(null);

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const {
    items,
    loading,
    loadProgress,
    error,
    activeTab,
    searchQuery,
    dateRange,
    setSearchQuery,
    switchTab,
    handleSearchInput,
    setDateRange,
  } = useMarketItems();

  const {
    selectedItem,
    selectedTier,
    tierMarketPrice,
    itemDetail,
    materialPrices,
    craftedByDetail,
    craftedByItemData,
    resultItemData,
    zones,
    displayStorePrice,
    handleItemClick,
    handleTierChange,
    handleStorePriceSave,
    clearSelection,
  } = useItemDetail();

  // ── Client-side filters ─────────────────────────────────────────────────

  const isAllTab           = activeTab === "all";
  const isRecentlyAddedTab = activeTab === "recently_added";

  const filteredItems = items.filter((item) => {
    if (filters.tradeable === "tradeable" && item.is_tradeable === false) return false;
    if (activeTab === "recipes" && recipeSkill !== null && item.recipe_skill !== recipeSkill) return false;
    if (filters.rarities.size > 0 && !filters.rarities.has(item.quality)) return false;
    if (filters.types.size > 0    && !filters.types.has(item.type))        return false;

    // Name filter applies on category tabs and recently_added (client-side)
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
    filters.tradeable !== "tradeable",
    filters.rarities.size > 0,
    filters.types.size > 0,
    filters.vendorMin !== "" || filters.vendorMax !== "",
    filters.marketMin !== "" || filters.marketMax !== "",
  ].filter(Boolean).length;

  const tab = MARKET_TABS.find((t) => t.id === activeTab);

  const gridClass = cn(
    "grid gap-3",
    selectedItem
      ? "grid-cols-[repeat(auto-fill,minmax(110px,1fr))]"
      : "grid-cols-[repeat(auto-fill,minmax(130px,1fr))]"
  );

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
                  onClick={() => switchTab(t.id, () => {
                    setFilters(DEFAULT_FILTERS);
                    clearSelection();
                    setCollapsedQualities(new Set());
                    setRecipeSkill(null);
                  })}
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

        {/* Date range pills — only on Recently Added tab */}
        {isRecentlyAddedTab && (
          <div className="flex gap-2">
            {(["latest", "30d", "1y"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                  dateRange === range
                    ? "bg-amber-400/10 border-amber-400/30 text-amber-400"
                    : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                )}
              >
                {DATE_RANGE_LABELS[range]}
              </button>
            ))}
          </div>
        )}

        {/* Recipe sub-tab pills — Brewing / Forging */}
        {activeTab === "recipes" && (
          <div className="flex gap-2">
            {([null, "Alchemy", "Forge"] as const).map((skill) => (
              <button
                key={skill ?? "all"}
                onClick={() => setRecipeSkill(skill)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                  recipeSkill === skill
                    ? "bg-amber-400/10 border-amber-400/30 text-amber-400"
                    : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                )}
              >
                {skill === null ? "All Recipes" : skill === "Alchemy" ? "Brewing" : "Forging"}
              </button>
            ))}
          </div>
        )}

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
            placeholder={
              isAllTab            ? "Search all items by name…"          :
              isRecentlyAddedTab  ? "Filter recently added by name…"     :
                                    `Filter ${tab?.label ?? ""} by name…`
            }
            value={searchQuery}
            onChange={(e) => isAllTab ? handleSearchInput(e.target.value) : setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 transition-colors"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="size-4 text-amber-400 animate-spin" />
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

        {/* Loading status (All-tab search only) */}
        {isAllTab && <LoadingStatus loading={loading} />}

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
            {isAllTab || isRecentlyAddedTab ? (
              // All-tab search and Recently Added: flat grid
              <div className={gridClass}>
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.hashed_id}
                    item={item}
                    selected={selectedItem?.hashed_id === item.hashed_id}
                    onClick={() => handleItemClick(item)}
                  />
                ))}
              </div>
            ) : activeTab === "resources" ? (
              // Resources: group by category
              <div className="space-y-8">
                {RESOURCE_CATEGORIES
                  .map(({ label, types }) => ({
                    label,
                    catItems: filteredItems.filter((i) => types.includes(i.type)),
                  }))
                  .filter(({ catItems }) => catItems.length > 0)
                  .map(({ label, catItems }) => (
                    <div key={label}>
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">{label}</p>
                      <div className={gridClass}>
                        {catItems.map((item) => (
                          <ItemCard
                            key={item.hashed_id}
                            item={item}
                            selected={selectedItem?.hashed_id === item.hashed_id}
                            onClick={() => handleItemClick(item)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : activeTab === "merchants" ? (
              // Merchants: group by item type
              <div className="space-y-8">
                {Object.entries(MERCHANT_TYPE_LABELS)
                  .map(([type, typeLabel]) => ({
                    typeLabel,
                    typeItems: filteredItems.filter((i) => i.type === type),
                  }))
                  .filter(({ typeItems }) => typeItems.length > 0)
                  .map(({ typeLabel, typeItems }) => (
                    <div key={typeLabel}>
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">{typeLabel}</p>
                      <div className={gridClass}>
                        {typeItems.map((item) => (
                          <ItemCard
                            key={item.hashed_id}
                            item={item}
                            selected={selectedItem?.hashed_id === item.hashed_id}
                            onClick={() => handleItemClick(item)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              // All other category tabs: group by quality tier
              <div className="space-y-8">
                {QUALITY_ORDER
                  .map((q) => ({ quality: q, qItems: filteredItems.filter((i) => i.quality === q) }))
                  .filter(({ qItems }) => qItems.length > 0)
                  .map(({ quality, qItems }) => {
                    const groupByType = quality === "LEGENDARY" || quality === "MYTHIC";

                    // Sort by vendor_price asc (null last)
                    const sortByPrice = (arr: typeof qItems) =>
                      [...arr].sort((a, b) => {
                        if (a.vendor_price == null && b.vendor_price == null) return 0;
                        if (a.vendor_price == null) return 1;
                        if (b.vendor_price == null) return -1;
                        return a.vendor_price - b.vendor_price;
                      });

                    const isCollapsed = collapsedQualities.has(quality);

                    return (
                      <div key={quality}>
                        {/* Quality section header — click to toggle */}
                        <button
                          type="button"
                          onClick={() => setCollapsedQualities((prev) => {
                            const next = new Set(prev);
                            if (next.has(quality)) next.delete(quality);
                            else next.add(quality);
                            return next;
                          })}
                          className="flex items-center gap-3 mb-3 w-full text-left group"
                        >
                          {isCollapsed
                            ? <ChevronRight className={cn("size-3 shrink-0", QUALITY_COLORS[quality])} />
                            : <ChevronDown  className={cn("size-3 shrink-0", QUALITY_COLORS[quality])} />
                          }
                          <span className={cn("text-xs font-bold uppercase tracking-widest", QUALITY_COLORS[quality])}>
                            {quality.charAt(0) + quality.slice(1).toLowerCase()}
                          </span>
                          <div
                            className="flex-1 h-px opacity-25"
                            style={{ backgroundColor: QUALITY_BORDER_CSS[quality] ?? "rgba(113,113,122,0.4)" }}
                          />
                          <span className="text-[10px] text-zinc-700 font-mono">{qItems.length}</span>
                        </button>

                        {!isCollapsed && (groupByType ? (
                          // LEGENDARY + MYTHIC: sub-group by type, each sorted by vendor price
                          <div className="space-y-5">
                            {Object.entries(
                              qItems.reduce<Record<string, typeof qItems>>((acc, item) => {
                                (acc[item.type] ??= []).push(item);
                                return acc;
                              }, {})
                            )
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([type, typeItems]) => (
                                <div key={type}>
                                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">
                                    {type.replace(/_/g, "\u00a0")}
                                  </p>
                                  <div className={gridClass}>
                                    {sortByPrice(typeItems).map((item) => (
                                      <ItemCard
                                        key={item.hashed_id}
                                        item={item}
                                        selected={selectedItem?.hashed_id === item.hashed_id}
                                        onClick={() => handleItemClick(item)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          // Other qualities: flat grid sorted by vendor price
                          <div className={gridClass}>
                            {sortByPrice(qItems).map((item) => (
                              <ItemCard
                                key={item.hashed_id}
                                item={item}
                                selected={selectedItem?.hashed_id === item.hashed_id}
                                onClick={() => handleItemClick(item)}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  })
                }
              </div>
            )}
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
        ) : !loading && items.length > 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
            <Package className="size-10 opacity-30" />
            <p className="text-sm">No items match the current filters</p>
          </div>
        ) : !loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
            <Package className="size-10 opacity-30" />
            <p className="text-sm">No items available in this category</p>
          </div>
        ) : null}
      </div>

      {/* ── Right: detail panel ──────────────────────────────────────────── */}
      {selectedItem && (
        <div className="w-80 shrink-0 ml-4 sticky top-0 self-start" style={{ maxHeight: "calc(100vh - 7rem)" }}>
          <DetailPanel
            item={selectedItem}
            detail={itemDetail}
            selectedTier={selectedTier}
            tierMarketPrice={tierMarketPrice}
            materialPrices={materialPrices}
            craftedByDetail={craftedByDetail}
            craftedByItemData={craftedByItemData}
            resultItemData={resultItemData}
            zones={zones}
            isAdmin={isAdmin}
            displayStorePrice={displayStorePrice}
            onStorePriceSave={handleStorePriceSave}
            onClose={clearSelection}
            onTierChange={handleTierChange}
          />
        </div>
      )}
    </div>
  );
}
