"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search, Mountain, FlaskConical, Sword, Hammer, Gem,
  Package, Coins, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKET_TABS } from "@/lib/market-config";
import { QUALITY_COLORS } from "@/lib/game-constants";
import type { ItemSearchResult } from "@/lib/idlemmo";

// ─── Quality glow (hover effect — concrete rgba values for inline styles) ────

const QUALITY_BORDER_COLOR: Record<string, string> = {
  STANDARD:  "rgba(161,161,170,0.5)",
  REFINED:   "rgba(74,222,128,0.5)",
  PREMIUM:   "rgba(96,165,250,0.5)",
  EPIC:      "rgba(192,132,252,0.6)",
  LEGENDARY: "rgba(250,204,21,0.6)",
  MYTHIC:    "rgba(248,113,113,0.6)",
};

const QUALITY_GLOW_COLOR: Record<string, string> = {
  STANDARD:  "rgba(161,161,170,0.12)",
  REFINED:   "rgba(74,222,128,0.15)",
  PREMIUM:   "rgba(96,165,250,0.15)",
  EPIC:      "rgba(192,132,252,0.18)",
  LEGENDARY: "rgba(250,204,21,0.18)",
  MYTHIC:    "rgba(248,113,113,0.18)",
};

// ─── Tab icon lookup ──────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, React.ElementType> = {
  all:          Search,
  resources:    Mountain,
  alchemy:      FlaskConical,
  gear:         Sword,
  tools:        Hammer,
  collectables: Gem,
};

// ─── Item card ────────────────────────────────────────────────────────────────

function ItemCard({ item }: { item: ItemSearchResult }) {
  const qualityTextClass  = QUALITY_COLORS[item.quality] ?? "text-zinc-400";
  const borderOnHover     = QUALITY_BORDER_COLOR[item.quality] ?? "rgba(113,113,122,0.5)";
  const glowOnHover       = QUALITY_GLOW_COLOR[item.quality] ?? "transparent";

  // Imperative DOM hover — avoids useState and per-card React re-renders
  function onEnter(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    el.style.borderColor = borderOnHover;
    el.style.boxShadow   = `0 0 20px -4px ${glowOnHover}`;
    el.style.transform   = "translateY(-2px)";
  }
  function onLeave(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    el.style.borderColor = "";
    el.style.boxShadow   = "";
    el.style.transform   = "";
  }

  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer"
      style={{ transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s" }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Item image / fallback */}
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
      <p className={cn("text-xs font-medium text-center leading-tight line-clamp-2 w-full", qualityTextClass)}>
        {item.name}
      </p>

      {/* Type */}
      <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium text-center">
        {item.type.replace(/_/g, "\u00a0")}
      </span>

      {/* Vendor price */}
      {item.vendor_price != null && item.vendor_price > 0 ? (
        <div className="flex items-center gap-1 text-xs text-amber-400 font-medium">
          <Coins className="size-3 shrink-0" />
          {item.vendor_price.toLocaleString()}
        </div>
      ) : (
        <span className="text-xs text-zinc-700">—</span>
      )}
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
      <div className="w-1/3 h-2.5 bg-zinc-800 rounded animate-pulse" />
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

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelFetchRef = useRef(false);

  // Cleanup on unmount — clear any pending search timer
  useEffect(() => {
    return () => { clearTimeout(searchTimerRef.current); };
  }, []);

  // ── Tab change: sequential type loading ──────────────────────────────────

  useEffect(() => {
    if (activeTab === "all") {
      setItems([]);
      setLoading(false);
      setLoadProgress(null);
      setError(null);
      return;
    }

    const tab = MARKET_TABS.find((t) => t.id === activeTab);
    if (!tab || tab.types.length === 0) return;

    setItems([]);
    setLoading(true);
    setLoadProgress({ current: 0, total: tab.types.length });
    setError(null);
    cancelFetchRef.current = false;

    (async () => {
      for (let i = 0; i < tab.types.length; i++) {
        if (cancelFetchRef.current) break;

        try {
          const res  = await fetch(`/api/market?type=${encodeURIComponent(tab.types[i])}&page=1`);
          const data = await res.json();
          if (!cancelFetchRef.current && Array.isArray(data.items) && data.items.length > 0) {
            setItems((prev) => [...prev, ...data.items]);
          }
        } catch {
          // Individual type failures are silently skipped
        }

        if (!cancelFetchRef.current) {
          setLoadProgress({ current: i + 1, total: tab.types.length });
        }

        // Brief pause between type calls to respect the IdleMMO rate limit
        if (i < tab.types.length - 1 && !cancelFetchRef.current) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }

      if (!cancelFetchRef.current) setLoading(false);
    })();

    return () => { cancelFetchRef.current = true; };
  }, [activeTab]);

  // ── Search input (All tab) ───────────────────────────────────────────────

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

  // ── Tab switch helper ────────────────────────────────────────────────────

  function switchTab(tabId: string) {
    cancelFetchRef.current = true;
    clearTimeout(searchTimerRef.current);
    setSearchQuery("");
    setActiveTab(tabId);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Market</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse items across all categories
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-zinc-800">
        <div className="flex overflow-x-auto">
          {MARKET_TABS.map((tab) => {
            const Icon     = TAB_ICONS[tab.id] ?? Search;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                  isActive
                    ? "border-amber-400 text-amber-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

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

      {/* Load progress bar */}
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

      {/* Error */}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Items grid — skeletons while loading first batch */}
      {loading && items.length === 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
          {items.map((item) => <ItemCard key={item.hashed_id} item={item} />)}
          {/* Trailing skeletons while more types stream in */}
          {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
        </div>
      ) : activeTab === "all" && !searchQuery ? (
        <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
          <Search className="size-10 opacity-30" />
          <p className="text-sm">Type a name to search all items</p>
        </div>
      ) : activeTab !== "all" && !loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
          <Package className="size-10 opacity-30" />
          <p className="text-sm">No items found</p>
        </div>
      ) : null}

      {/* Item count */}
      {!loading && items.length > 0 && (
        <p className="text-xs text-zinc-700 pb-2">{items.length} items</p>
      )}
    </div>
  );
}
