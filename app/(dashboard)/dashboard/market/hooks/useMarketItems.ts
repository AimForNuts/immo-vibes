"use client";

import { useState, useEffect, useRef } from "react";
import type React from "react";
import type { DbItem } from "../types";

export type DateRange = "latest" | "30d" | "1y";

interface UseMarketItemsReturn {
  items:          DbItem[];
  loading:        boolean;
  loadProgress:   { current: number; total: number } | null;
  error:          string | null;
  activeTab:      string;
  searchQuery:    string;
  dateRange:      DateRange;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  switchTab:      (tabId: string, extraReset?: () => void) => void;
  handleSearchInput: (value: string) => void;
  setDateRange:   (range: DateRange) => void;
}

export function useMarketItems(): UseMarketItemsReturn {
  const [activeTab, setActiveTab]       = useState("all");
  const [items, setItems]               = useState<DbItem[]>([]);
  const [loading, setLoading]           = useState(false);
  const [loadProgress, setLoadProgress] = useState<{ current: number; total: number } | null>(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [error, setError]               = useState<string | null>(null);
  const [dateRange, setDateRange]       = useState<DateRange>("latest");

  const tabAbortRef    = useRef<AbortController | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Per-tab item cache so switching back is instant.
  // Key is `tabId` for regular tabs, `recently_added:${dateRange}` for the recently_added tab.
  const tabCacheRef  = useRef<Map<string, DbItem[]>>(new Map());
  const tabLoadedRef = useRef<Set<string>>(new Set());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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

    // Composite key: recently_added tab caches per dateRange so each range is independent
    const fetchKey = activeTab === "recently_added"
      ? `recently_added:${dateRange}`
      : activeTab;

    // Restore from cache if already fully loaded
    if (tabLoadedRef.current.has(fetchKey)) {
      setItems(tabCacheRef.current.get(fetchKey) ?? []);
      setLoading(false);
      setLoadProgress(null);
      return;
    }

    const capturedTab = activeTab;
    const capturedKey = fetchKey;
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
          const url = capturedTab === "recently_added"
            ? `/api/market?tab=recently_added&dateRange=${dateRange}&page=${page}`
            : `/api/market?tab=${encodeURIComponent(capturedTab)}&page=${page}`;

          const res  = await fetch(url, { signal: controller.signal });
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

      tabCacheRef.current.set(capturedKey, accumulated);
      tabLoadedRef.current.add(capturedKey);
      setLoading(false);
      setLoadProgress(null);
    })();

    return () => controller.abort();
  }, [activeTab, dateRange]); // dateRange only matters for recently_added; other tabs hit cache immediately

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

  function switchTab(tabId: string, extraReset?: () => void) {
    tabAbortRef.current?.abort();
    clearTimeout(searchTimerRef.current);
    searchAbortRef.current?.abort();
    setItems([]);
    setSearchQuery("");
    setLoading(tabId !== "all");
    setLoadProgress(null);
    setError(null);
    // Reset date range to "latest" when entering the recently_added tab
    if (tabId === "recently_added") setDateRange("latest");
    setActiveTab(tabId);
    if (extraReset) extraReset();
  }

  return {
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
  };
}

