"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, CheckCircle, XCircle, Loader, TrendingUp,
  Sparkles, X, BookOpen, Clock, Skull,
} from "lucide-react";
import { MARKET_TABS } from "@/lib/market-config";
import { cn } from "@/lib/utils";

const TAB_GROUPS = MARKET_TABS.filter((t) => t.types.length > 0).map((t) => ({
  label: t.label,
  types: t.types,
}));

const ALL_TYPES = TAB_GROUPS.flatMap((g) => g.types);

type SyncState = "idle" | "syncing" | "done" | "error";

interface TypeStatus {
  state:  SyncState;
  count?: number;
  error?: string;
}

interface PagedStatus {
  state:       SyncState;
  synced?:     number;
  skipped?:    number;
  total?:      number;
  page?:       number;
  totalPages?: number;
  error?:      string;
}

interface LogEntry {
  id:   number;
  msg:  string;
  kind: "info" | "success" | "error" | "cancel";
}

let _logId = 0;

export default function AdminPage() {
  const [busy,       setBusy]       = useState(false);
  const [activeSync, setActiveSync] = useState<"items" | "prices" | "inspect" | "dungeons" | null>(null);
  const [dungeonsState, setDungeonsState] = useState<SyncState>("idle");

  const [statuses,        setStatuses]        = useState<Record<string, TypeStatus>>(
    Object.fromEntries(ALL_TYPES.map((t) => [t, { state: "idle" }]))
  );
  const [priceStatuses,   setPriceStatuses]   = useState<Record<string, PagedStatus>>(
    Object.fromEntries(ALL_TYPES.map((t) => [t, { state: "idle" }]))
  );
  const [inspectStatuses, setInspectStatuses] = useState<Record<string, PagedStatus>>(
    Object.fromEntries(ALL_TYPES.map((t) => [t, { state: "idle" }]))
  );

  const [logs, setLogs] = useState<LogEntry[]>([]);

  const cancelRef = useRef(false);
  const logRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  function addLog(msg: string, kind: LogEntry["kind"] = "info") {
    setLogs((prev) => [...prev, { id: _logId++, msg, kind }]);
  }

  function resetLog() { setLogs([]); }

  function setStatus(type: string, u: TypeStatus) {
    setStatuses((p) => ({ ...p, [type]: u }));
  }
  function setPriceStatus(type: string, u: PagedStatus) {
    setPriceStatuses((p) => ({ ...p, [type]: u }));
  }
  function setInspectStatus(type: string, u: PagedStatus) {
    setInspectStatuses((p) => ({ ...p, [type]: u }));
  }

  function cancel() {
    cancelRef.current = true;
    addLog("Cancelling…", "cancel");
  }

  // ── Single-type helpers ────────────────────────────────────────────────────

  async function syncType(type: string): Promise<boolean> {
    setStatus(type, { state: "syncing" });
    const MAX_RETRIES = 10;
    const rl = { remaining: null as number | null, resetAt: 0 };
    let page = 1, totalPages = 1, accSynced = 0, retries = 0;

    while (page <= totalPages) {
      if (cancelRef.current) { setStatus(type, { state: "idle" }); return false; }

      // Proactive: if we know remaining is low, wait before firing the next request
      if (rl.remaining !== null && rl.remaining <= 1) {
        const waitMs = Math.max(1000, rl.resetAt * 1000 - Date.now() + 500);
        addLog(`⏳ Rate limit low — waiting ${Math.ceil(waitMs / 1000)}s…`);
        await new Promise<void>((r) => setTimeout(r, waitMs));
      }

      try {
        addLog(`→ Items: ${type}${totalPages > 1 ? ` (${page}/${totalPages})` : ""}`);
        const res  = await fetch(`/api/admin/sync-items?type=${type}&page=${page}`, { method: "POST" });
        const data = await res.json();

        // Reactive: server hit a 429 — wait retryAfterMs then retry the same page
        if (res.status === 429) {
          retries++;
          if (retries > MAX_RETRIES) {
            setStatus(type, { state: "error", error: "rate limited (max retries)" });
            addLog(`✗ ${type}: rate limited (max retries)`, "error");
            return false;
          }
          const waitMs = typeof data.retryAfterMs === "number" ? data.retryAfterMs : 60000;
          addLog(`⏳ Rate limited — waiting ${Math.ceil(waitMs / 1000)}s… (attempt ${retries}/${MAX_RETRIES})`);
          await new Promise<void>((r) => setTimeout(r, waitMs));
          continue; // retry same page, do NOT increment
        }

        if (!res.ok) {
          setStatus(type, { state: "error", error: data.error ?? "Failed" });
          addLog(`✗ ${type}: ${data.error ?? "Failed"}`, "error");
          return false;
        }

        // Success: update rl state for proactive throttling on next iteration
        retries      = 0;
        rl.remaining = typeof data.remaining === "number" ? data.remaining : null;
        rl.resetAt   = typeof data.resetAt   === "number" ? data.resetAt   : 0;
        totalPages   = data.totalPages;
        accSynced   += data.synced;
        setStatus(type, { state: page < totalPages ? "syncing" : "done", count: accSynced });
        page++;
      } catch {
        setStatus(type, { state: "error", error: "Network error" });
        addLog(`✗ ${type}: network error`, "error");
        return false;
      }
    }

    addLog(`✓ ${type}: ${accSynced} items`, "success");
    return true;
  }

  async function syncPricesForType(type: string): Promise<boolean> {
    setPriceStatus(type, { state: "syncing", page: 1 });
    let page = 1, totalPages = 1, accSynced = 0, accSkipped = 0;
    while (page <= totalPages) {
      if (cancelRef.current) { setPriceStatus(type, { state: "idle" }); return false; }
      try {
        addLog(`→ Prices: ${type}${totalPages > 1 ? ` (${page}/${totalPages})` : ""}`);
        const res  = await fetch(`/api/admin/sync-prices?type=${type}&page=${page}&pageSize=80`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          setPriceStatus(type, { state: "error", error: data.error ?? "Failed" });
          addLog(`✗ ${type} prices: ${data.error ?? "Failed"}`, "error");
          return false;
        }
        totalPages  = data.totalPages;
        accSynced  += data.synced;
        accSkipped += data.skipped;
        setPriceStatus(type, {
          state: page < totalPages ? "syncing" : "done",
          synced: accSynced, skipped: accSkipped,
          total: data.total, page, totalPages,
        });
        page++;
      } catch {
        setPriceStatus(type, { state: "error", error: "Network error" });
        addLog(`✗ ${type} prices: network error`, "error");
        return false;
      }
    }
    addLog(`✓ ${type} prices: ${accSynced} synced, ${accSkipped} skipped`, "success");
    return true;
  }

  async function syncInspectForType(type: string): Promise<boolean> {
    setInspectStatus(type, { state: "syncing", page: 1 });
    let page = 1, totalPages = 1, accSynced = 0, accSkipped = 0;
    while (page <= totalPages) {
      if (cancelRef.current) { setInspectStatus(type, { state: "idle" }); return false; }
      try {
        addLog(`→ Stats: ${type}${totalPages > 1 ? ` (${page}/${totalPages})` : ""}`);
        const res  = await fetch(`/api/admin/sync-inspect?type=${type}&page=${page}&pageSize=40`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          setInspectStatus(type, { state: "error", error: data.error ?? "Failed" });
          addLog(`✗ ${type} stats: ${data.error ?? "Failed"}`, "error");
          return false;
        }
        totalPages  = data.totalPages;
        accSynced  += data.synced;
        accSkipped += data.skipped;
        setInspectStatus(type, {
          state: page < totalPages ? "syncing" : "done",
          synced: accSynced, skipped: accSkipped,
          total: data.total, page, totalPages,
        });
        page++;
      } catch {
        setInspectStatus(type, { state: "error", error: "Network error" });
        addLog(`✗ ${type} stats: network error`, "error");
        return false;
      }
    }
    addLog(`✓ ${type} stats: ${accSynced} synced, ${accSkipped} skipped`, "success");
    return true;
  }

  async function syncRecipes(): Promise<boolean> {
    addLog("→ Sync Recipes…");
    let page = 1, totalPages = 1, accPopulated = 0;
    while (page <= totalPages) {
      if (cancelRef.current) return false;
      try {
        const res  = await fetch(`/api/admin/sync-recipes?page=${page}&pageSize=80`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          addLog(`✗ Sync Recipes: ${data.error ?? "Failed"}`, "error");
          return false;
        }
        totalPages    = data.totalPages;
        accPopulated += data.populated ?? 0;
        page++;
      } catch {
        addLog("✗ Sync Recipes: network error", "error");
        return false;
      }
    }
    addLog(`✓ Sync Recipes: ${accPopulated} populated`, "success");
    return true;
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────

  async function syncAll() {
    cancelRef.current = false;
    setBusy(true);
    setActiveSync("items");
    resetLog();
    setStatuses(Object.fromEntries(ALL_TYPES.map((t) => [t, { state: "idle" }])));
    addLog("Starting full item catalog sync…");
    for (const type of ALL_TYPES) {
      if (cancelRef.current) { addLog("Cancelled.", "cancel"); break; }
      await syncType(type);
    }
    if (!cancelRef.current) addLog("Item sync complete.", "success");
    setActiveSync(null);
    setBusy(false);
  }

  async function syncAllPrices() {
    cancelRef.current = false;
    setBusy(true);
    setActiveSync("prices");
    resetLog();
    setPriceStatuses(Object.fromEntries(ALL_TYPES.map((t) => [t, { state: "idle" }])));
    addLog("Starting full price sync…");
    for (const type of ALL_TYPES) {
      if (cancelRef.current) { addLog("Cancelled.", "cancel"); break; }
      await syncPricesForType(type);
    }
    if (!cancelRef.current) {
      await syncRecipes();
      addLog("Price sync complete.", "success");
    }
    setActiveSync(null);
    setBusy(false);
  }

  async function syncAllInspect() {
    cancelRef.current = false;
    setBusy(true);
    setActiveSync("inspect");
    resetLog();
    setInspectStatuses(Object.fromEntries(ALL_TYPES.map((t) => [t, { state: "idle" }])));
    addLog("Starting full stats sync…");
    for (const type of ALL_TYPES) {
      if (cancelRef.current) { addLog("Cancelled.", "cancel"); break; }
      await syncInspectForType(type);
    }
    if (!cancelRef.current) addLog("Stats sync complete.", "success");
    setActiveSync(null);
    setBusy(false);
  }

  async function syncRecipesOnly() {
    cancelRef.current = false;
    setBusy(true);
    resetLog();
    await syncRecipes();
    setBusy(false);
  }

  async function syncDungeons() {
    cancelRef.current = false;
    setBusy(true);
    setActiveSync("dungeons");
    setDungeonsState("syncing");
    resetLog();
    addLog("→ Sync Dungeons…");
    try {
      const res  = await fetch("/api/admin/sync-dungeons", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setDungeonsState("error");
        addLog(`✗ Sync Dungeons: ${data.error ?? "Failed"}`, "error");
      } else {
        setDungeonsState("done");
        addLog(`✓ Sync Dungeons: ${data.synced} synced`, "success");
      }
    } catch {
      setDungeonsState("error");
      addLog("✗ Sync Dungeons: network error", "error");
    }
    setActiveSync(null);
    setBusy(false);
  }

  async function runSingle(fn: (type: string) => Promise<unknown>, type: string) {
    cancelRef.current = false;
    setBusy(true);
    resetLog();
    await fn(type);
    setBusy(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
            <p className="text-muted-foreground mt-1">Item catalog and market management.</p>
          </div>

          <div className="flex flex-wrap gap-2 justify-end shrink-0">
            {busy && (
              <Button variant="destructive" size="sm" onClick={cancel}>
                <X className="size-4 mr-1.5" />
                Cancel
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={syncDungeons} disabled={busy}>
              <Skull className={cn("size-4 mr-1.5", activeSync === "dungeons" && "animate-pulse")} />
              {dungeonsState === "done" ? "Dungeons ✓" : dungeonsState === "error" ? "Dungeons ✗" : "Sync Dungeons"}
            </Button>
            <Button variant="outline" size="sm" onClick={syncRecipesOnly} disabled={busy}>
              <BookOpen className="size-4 mr-1.5" />
              Sync Recipes
            </Button>
            <Button variant="outline" size="sm" onClick={syncAllInspect} disabled={busy}>
              <Sparkles className={cn("size-4 mr-1.5", activeSync === "inspect" && "animate-pulse")} />
              Sync Stats
            </Button>
            <Button variant="outline" size="sm" onClick={syncAllPrices} disabled={busy}>
              <TrendingUp className={cn("size-4 mr-1.5", activeSync === "prices" && "animate-pulse")} />
              Sync All Prices
            </Button>
            <Button size="sm" onClick={syncAll} disabled={busy}>
              <RefreshCw className={cn("size-4 mr-1.5", activeSync === "items" && "animate-spin")} />
              Sync All Items
            </Button>
          </div>
        </div>

        {/* Activity log */}
        {logs.length > 0 && (
          <div
            ref={logRef}
            className="mt-4 bg-zinc-950 border border-zinc-800 rounded-lg p-3 max-h-44 overflow-y-auto font-mono text-xs space-y-0.5"
          >
            {logs.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "leading-5",
                  entry.kind === "success" && "text-green-400",
                  entry.kind === "error"   && "text-red-400",
                  entry.kind === "cancel"  && "text-amber-400",
                  entry.kind === "info"    && "text-zinc-400",
                )}
              >
                {entry.msg}
              </div>
            ))}
            {busy && <div className="text-zinc-600 animate-pulse select-none">▌</div>}
          </div>
        )}
      </div>

      {/* Per-type cards grouped by market tab */}
      {TAB_GROUPS.map((group) => (
        <Card key={group.label}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{group.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-0">
            {group.types.map((type) => {
              const itemStatus    = statuses[type];
              const priceStatus   = priceStatuses[type];
              const inspectStatus = inspectStatuses[type];
              return (
                <div
                  key={type}
                  className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                >
                  {/* Left: item status + name + count */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StatusDot state={itemStatus.state} />
                    <span className="text-sm font-medium truncate">{type}</span>
                    {itemStatus.state === "done" && (
                      <span className="text-xs text-muted-foreground">{itemStatus.count}</span>
                    )}
                    {itemStatus.state === "error" && (
                      <span className="text-xs text-destructive truncate">{itemStatus.error}</span>
                    )}
                  </div>

                  {/* Right: small status icons + action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <SmallStatus state={inspectStatus.state} icon="sparkles" />
                    <SmallStatus state={priceStatus.state}   icon="trend" />

                    <Button
                      variant="ghost" size="sm"
                      onClick={() => runSingle(syncInspectForType, type)}
                      disabled={busy}
                      className="h-7 px-2 text-muted-foreground hover:text-foreground"
                      title="Sync stats"
                    >
                      <Sparkles className="size-3" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => runSingle(syncPricesForType, type)}
                      disabled={busy}
                      className="h-7 px-2 text-muted-foreground hover:text-foreground"
                      title="Sync prices"
                    >
                      <TrendingUp className="size-3" />
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => runSingle(syncType, type)}
                      disabled={busy}
                      className="h-7 text-xs"
                    >
                      Sync
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Cron info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4" />
            Nightly Cron
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Item catalog syncs automatically every day at{" "}
            <span className="font-mono text-foreground">00:00 UTC</span> via Vercel Cron (
            <code className="text-xs">POST /api/cron/sync-market</code>).
            Prices and stats require manual sync — use the buttons above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusDot({ state }: { state: SyncState }) {
  if (state === "syncing") return <Loader      className="size-3.5 text-muted-foreground animate-spin shrink-0" />;
  if (state === "done")    return <CheckCircle className="size-3.5 text-green-500 shrink-0" />;
  if (state === "error")   return <XCircle     className="size-3.5 text-destructive shrink-0" />;
  return <div className="size-3.5 rounded-full border border-border shrink-0" />;
}

function SmallStatus({ state, icon }: { state: SyncState; icon: "trend" | "sparkles" }) {
  const Icon = icon === "sparkles" ? Sparkles : TrendingUp;
  if (state === "syncing") return <Loader  className="size-3 text-muted-foreground animate-spin" />;
  if (state === "done")    return <Icon    className="size-3 text-green-500" />;
  if (state === "error")   return <XCircle className="size-3 text-destructive" />;
  return null;
}
