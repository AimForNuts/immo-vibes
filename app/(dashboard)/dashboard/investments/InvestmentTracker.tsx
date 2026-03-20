"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Plus, X, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUALITY_COLORS, QUALITY_BORDER_COLORS } from "@/lib/game-constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrackedItem {
  id: string;
  itemHashedId: string;
  itemName: string;
  itemQuality: string;
  itemType: string;
  imageUrl: string | null;
  tier: number;
  createdAt: string;
}

interface SearchResult {
  hashed_id: string;
  name: string;
  quality: string;
  type: string;
  image_url: string | null;
  vendor_price: number | null;
}

interface PriceEntry {
  price: number;
  quantity: number;
  fetchedAt: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvestmentTracker() {
  // Tracked items state
  const [tracked, setTracked] = useState<TrackedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search/add state
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [tier, setTier] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Price history: undefined = not fetched yet, null = fetched but no data
  const [priceHistory, setPriceHistory] = useState<Record<string, PriceEntry | null | undefined>>({});
  // Track in-flight fetches to prevent duplicate requests during rapid state changes
  const fetchingRef = useRef<Set<string>>(new Set());

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Load tracked items ────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/investments")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.items)) setTracked(data.items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Load price history for each tracked item ──────────────────────────────

  useEffect(() => {
    tracked.forEach((item) => {
      if (priceHistory[item.id] !== undefined || fetchingRef.current.has(item.id)) return;
      fetchingRef.current.add(item.id);
      fetch(`/api/investments/${item.id}/history`)
        .then((r) => r.json())
        .then((data) => {
          const latest = Array.isArray(data.history) && data.history.length > 0
            ? data.history[0]
            : null;
          setPriceHistory((prev) => ({ ...prev, [item.id]: latest }));
        })
        .catch(() => {
          setPriceHistory((prev) => ({ ...prev, [item.id]: null }));
        })
        .finally(() => {
          fetchingRef.current.delete(item.id);
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracked]);

  // ── Debounced search ──────────────────────────────────────────────────────

  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/market?query=${encodeURIComponent(query)}&page=1`);
        const data = await r.json();
        setResults(data.items ?? []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [query]);

  // ── Close dropdown on outside click ──────────────────────────────────────

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  function pickItem(item: SearchResult) {
    setSelected(item);
    setQuery(item.name);
    setShowDropdown(false);
    setTier(1);
    setAddError(null);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setAdding(true);
    setAddError(null);
    try {
      const r = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemHashedId: selected.hashed_id,
          itemName: selected.name,
          itemQuality: selected.quality,
          itemType: selected.type,
          imageUrl: selected.image_url,
          tier,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setAddError(data.error ?? "Failed to add item.");
        return;
      }
      if (data.item) {
        setTracked((prev) => [...prev, data.item]);
        setSelected(null);
        setQuery("");
        setResults([]);
      }
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function removeItem(id: string) {
    await fetch(`/api/investments/${id}`, { method: "DELETE" });
    setTracked((prev) => prev.filter((i) => i.id !== id));
    setPriceHistory((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function formatPrice(n: number) {
    return n.toLocaleString("en-US") + "g";
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="flex items-end justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Investments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track item prices across the IdleMMO market.
          </p>
        </div>
        <span className="text-xs font-mono text-amber-500/50 pb-0.5 select-none">
          ECONOMY · PRICE WATCH
        </span>
      </div>

      {/* ── Section 1: Tracked Items ──────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-amber-500/70 uppercase tracking-widest shrink-0">
            Tracked Items
          </span>
          <div className="h-px flex-1 bg-border/40" />
          {tracked.length > 0 && (
            <span className="text-xs font-mono text-muted-foreground/40">
              {tracked.length} item{tracked.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Add item form */}
        <form onSubmit={handleAddSubmit} className="flex gap-2 items-start">
          <div className="relative flex-1" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
                placeholder="Search item by name…"
                className="w-full pl-9 pr-9 py-2 text-sm bg-zinc-900 border border-border rounded-md focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 placeholder:text-muted-foreground/40"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-amber-500/60 animate-spin" />
              )}
            </div>

            {showDropdown && results.length > 0 && (
              <div className="absolute z-50 top-full mt-1 w-full bg-zinc-900 border border-border rounded-md shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                {results.slice(0, 10).map((item) => (
                  <button
                    key={item.hashed_id}
                    type="button"
                    onClick={() => pickItem(item)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 transition-colors text-left border-b border-border/30 last:border-0"
                  >
                    <div className="size-7 rounded bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center border border-border/50">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.name} className="size-full object-contain p-0.5" />
                      ) : (
                        <Package className="size-3.5 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{item.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("text-xs font-mono", QUALITY_COLORS[item.quality] ?? "text-zinc-400")}>
                          {item.quality}
                        </span>
                        <span className="text-muted-foreground/30 text-xs">·</span>
                        <span className="text-xs text-muted-foreground/50 font-mono">{item.type}</span>
                      </div>
                    </div>
                    {item.vendor_price != null && (
                      <span className="text-xs font-mono text-amber-400/70 shrink-0">
                        {item.vendor_price.toLocaleString("en-US")}g
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="text-xs text-muted-foreground font-mono">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(Number(e.target.value))}
                className="bg-zinc-900 border border-border rounded px-2 py-2 text-sm font-mono focus:outline-none focus:border-amber-500/50"
              >
                {[1, 2, 3, 4, 5, 6].map((t) => (
                  <option key={t} value={t}>T{t}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={!selected || adding}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors shrink-0",
              selected
                ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50"
                : "bg-muted/20 border border-border text-muted-foreground/30 cursor-not-allowed"
            )}
          >
            <Plus className="size-3.5" />
            {adding ? "Adding…" : "Track"}
          </button>
        </form>

        {addError && (
          <p className="text-xs text-red-400 font-mono">{addError}</p>
        )}

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs font-mono text-muted-foreground/40">Loading…</p>
            </div>
          ) : tracked.length === 0 ? (
            <div className="p-10 text-center space-y-1">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/30">No items tracked</p>
              <p className="text-sm text-muted-foreground/40">Search above to start watching prices.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-zinc-900/60">
                  <th className="px-4 py-2.5 text-left text-xs font-mono text-muted-foreground/50 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-2.5 text-left text-xs font-mono text-muted-foreground/50 uppercase tracking-wider hidden sm:table-cell">Quality</th>
                  <th className="px-4 py-2.5 text-left text-xs font-mono text-muted-foreground/50 uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="px-4 py-2.5 text-center text-xs font-mono text-muted-foreground/50 uppercase tracking-wider">Tier</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {tracked.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-l-2 bg-zinc-950/20 hover:bg-zinc-900/40 transition-colors",
                      QUALITY_BORDER_COLORS[item.itemQuality] ?? "border-l-zinc-700"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center border border-border/40">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt={item.itemName} className="size-full object-contain p-0.5" />
                          ) : (
                            <Package className="size-3.5 text-muted-foreground/30" />
                          )}
                        </div>
                        <span className="font-medium">{item.itemName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={cn("text-xs font-mono", QUALITY_COLORS[item.itemQuality] ?? "text-zinc-400")}>
                        {item.itemQuality}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs font-mono text-muted-foreground/60">{item.itemType}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-mono bg-zinc-800 border border-border/50 px-1.5 py-0.5 rounded">
                        T{item.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground/30 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <X className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Section 2: Recent Market Data ─────────────────────────────────── */}
      {tracked.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-amber-500/70 uppercase tracking-widest shrink-0">
              Recent Market Data
            </span>
            <div className="h-px flex-1 bg-border/40" />
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-zinc-900/60">
                  <th className="px-4 py-2.5 text-left text-xs font-mono text-muted-foreground/50 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-2.5 text-right text-xs font-mono text-muted-foreground/50 uppercase tracking-wider">Latest Listing</th>
                  <th className="px-4 py-2.5 text-right text-xs font-mono text-muted-foreground/50 uppercase tracking-wider hidden sm:table-cell">Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-mono text-muted-foreground/50 uppercase tracking-wider hidden md:table-cell">Fetched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {tracked.map((item) => {
                  const hist = priceHistory[item.id];
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "border-l-2 bg-zinc-950/20 hover:bg-zinc-900/40 transition-colors",
                        QUALITY_BORDER_COLORS[item.itemQuality] ?? "border-l-zinc-700"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-6 rounded bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center border border-border/40">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.itemName} className="size-full object-contain" />
                            ) : (
                              <Package className="size-3 text-muted-foreground/30" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm leading-none">{item.itemName}</div>
                            <div className="text-xs font-mono text-muted-foreground/40 mt-0.5">T{item.tier}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hist === undefined ? (
                          <span className="text-xs font-mono text-muted-foreground/30 animate-pulse">…</span>
                        ) : hist === null ? (
                          <span className="text-xs font-mono text-muted-foreground/30">—</span>
                        ) : (
                          <span className="text-sm font-mono text-amber-400">{formatPrice(hist.price)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        {hist != null && (
                          <span className="text-xs font-mono text-muted-foreground/60">×{hist.quantity}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        {hist?.fetchedAt && (
                          <span className="text-xs font-mono text-muted-foreground/40">
                            {formatDate(hist.fetchedAt)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
