"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, TrendingUp, BookOpen } from "lucide-react";
import { AdminTable, type ColumnDef, type FilterDef } from "@/components/admin/AdminTable";
import { SyncLog, type LogEntry } from "@/components/admin/SyncLog";
import { MARKET_TABS } from "@/lib/market-config";
import { cn } from "@/lib/utils";

const ALL_TYPES = MARKET_TABS.flatMap((t) => t.types);

type ItemRow = {
  hashedId: string;
  name: string;
  type: string;
  quality: string | null;
  syncedAt: string | null;
};

const COLUMNS: ColumnDef<ItemRow>[] = [
  { key: "name",    label: "Name",    render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "type",    label: "Type",    render: (r) => <span className="text-muted-foreground text-xs">{r.type}</span> },
  { key: "quality", label: "Quality", render: (r) => <span className="text-xs">{r.quality ?? "—"}</span> },
  {
    key: "syncedAt",
    label: "Last Synced",
    render: (r) => (
      <span className="text-muted-foreground text-xs">
        {r.syncedAt ? new Date(r.syncedAt).toLocaleDateString() : "—"}
      </span>
    ),
  },
];

const FILTERS: FilterDef[] = [
  { key: "name",    label: "Search name…", type: "search" },
  {
    key: "type",
    label: "All types",
    type: "select",
    options: ALL_TYPES.map((t) => ({ value: t, label: t })),
  },
  {
    key: "quality",
    label: "All qualities",
    type: "select",
    options: ["Common", "Uncommon", "Rare", "Epic", "Legendary"].map((q) => ({ value: q, label: q })),
  },
];

let _logId = 0;

export default function ItemsPage() {
  const [busy, setBusy]             = useState(false);
  const [logs, setLogs]             = useState<LogEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const cancelRef                   = useRef(false);

  function addLog(msg: string, kind: LogEntry["kind"] = "info") {
    setLogs((prev) => [...prev, { id: _logId++, msg, kind }]);
  }

  async function runPaginatedSync(
    label: string,
    buildUrl: (page: number) => string
  ) {
    let page = 1, totalPages = 1;
    while (page <= totalPages && !cancelRef.current) {
      const res = await fetch(buildUrl(page), { method: "POST" });
      if (res.status === 429) {
        const data = await res.json();
        const waitMs = (data as { retryAfterMs?: number }).retryAfterMs ?? 60_000;
        addLog(`Rate limit — waiting ${Math.ceil(waitMs / 1000)}s…`, "info");
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      if (!res.ok) { addLog(`${label} page ${page} failed`, "error"); break; }
      const data = await res.json() as { totalPages?: number; synced?: number; populated?: number };
      totalPages = data.totalPages ?? 1;
      addLog(`${label} page ${page}/${totalPages} — ${data.synced ?? data.populated ?? 0} synced`, "success");
      page++;
    }
  }

  async function syncAllItems() {
    setBusy(true); cancelRef.current = false; setLogs([]);
    addLog("Starting item sync…");
    try {
      for (const type of ALL_TYPES) {
        if (cancelRef.current) break;
        await runPaginatedSync(`Items:${type}`, (p) => `/api/admin/sync-items?type=${encodeURIComponent(type)}&page=${p}`);
      }
      if (!cancelRef.current) addLog("Item sync complete", "success");
    } finally {
      setBusy(false);
      setRefreshKey((k) => k + 1);
    }
  }

  async function syncPrices() {
    setBusy(true); cancelRef.current = false; setLogs([]);
    addLog("Starting price sync…");
    try {
      for (const type of ALL_TYPES) {
        if (cancelRef.current) break;
        await runPaginatedSync(`Prices:${type}`, (p) => `/api/admin/sync-prices?type=${encodeURIComponent(type)}&page=${p}&pageSize=80`);
      }
      if (!cancelRef.current) addLog("Price sync complete", "success");
    } finally {
      setBusy(false);
    }
  }

  async function syncStats() {
    setBusy(true); cancelRef.current = false; setLogs([]);
    addLog("Starting stats sync…");
    try {
      for (const type of ALL_TYPES) {
        if (cancelRef.current) break;
        await runPaginatedSync(`Stats:${type}`, (p) => `/api/admin/sync-inspect?type=${encodeURIComponent(type)}&page=${p}&pageSize=40`);
      }
      if (!cancelRef.current) addLog("Stats sync complete", "success");
    } finally {
      setBusy(false);
    }
  }

  async function syncRecipes() {
    setBusy(true); cancelRef.current = false; setLogs([]);
    addLog("Starting recipe sync…");
    try {
      await runPaginatedSync("Recipes", (p) => `/api/admin/sync-recipes?page=${p}&pageSize=80`);
      if (!cancelRef.current) addLog("Recipe sync complete", "success");
    } finally {
      setBusy(false);
    }
  }

  const headerContent = (
    <div className="flex items-center gap-2">
      {busy && (
        <Button variant="outline" size="sm" className="h-8" onClick={() => { cancelRef.current = true; }}>
          Cancel
        </Button>
      )}
      <Button variant="outline" size="sm" disabled={busy} className="h-8 gap-1.5" onClick={syncStats}>
        <Sparkles className="size-3.5" /> Sync Stats
      </Button>
      <Button variant="outline" size="sm" disabled={busy} className="h-8 gap-1.5" onClick={syncPrices}>
        <TrendingUp className="size-3.5" /> Sync Prices
      </Button>
      <Button variant="outline" size="sm" disabled={busy} className="h-8 gap-1.5" onClick={syncRecipes}>
        <BookOpen className="size-3.5" /> Sync Recipes
      </Button>
      <Button size="sm" disabled={busy} className="h-8 gap-1.5" onClick={syncAllItems}>
        <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
        Sync All Items
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Items</h1>
        <p className="text-muted-foreground text-sm">Item catalog and sync management.</p>
      </div>
      <AdminTable<ItemRow>
        columns={COLUMNS}
        endpoint="/api/admin/items"
        filters={FILTERS}
        pageSize={50}
        refreshKey={refreshKey}
        headerContent={headerContent}
        emptyMessage="No items found."
      />
      <SyncLog logs={logs} />
    </div>
  );
}
