"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, Loader, TrendingUp, Clock, BookOpen } from "lucide-react";
import { MARKET_TABS } from "@/lib/market-config";

// Build tab-grouped type list from MARKET_TABS (excludes "all" tab which has no types)
const TAB_GROUPS = MARKET_TABS.filter((t) => t.types.length > 0).map((t) => ({
  label: t.label,
  types: t.types,
}));

// Flat list of all syncable types (for "Sync All")
const ALL_TYPES = TAB_GROUPS.flatMap((g) => g.types);

type SyncState = "idle" | "syncing" | "done" | "error";

interface TypeStatus {
  state:  SyncState;
  count?: number;
  error?: string;
}

interface PriceStatus {
  state:       SyncState;
  synced?:     number;
  skipped?:    number;
  total?:      number;
  page?:       number;
  totalPages?: number;
  error?:      string;
}

interface RecipeStatus {
  state:       SyncState;
  populated?:  number;
  noData?:     number;
  errors?:     number;
  total?:      number;
  page?:       number;
  totalPages?: number;
  error?:      string;
}

export default function AdminPage() {
  const [statuses, setStatuses] = useState<Record<string, TypeStatus>>(
    Object.fromEntries(ALL_TYPES.map((t) => [t, { state: "idle" }]))
  );
  const [priceStatuses, setPriceStatuses] = useState<Record<string, PriceStatus>>(
    Object.fromEntries(ALL_TYPES.map((t) => [t, { state: "idle" }]))
  );
  const [recipeStatus, setRecipeStatus] = useState<RecipeStatus>({ state: "idle" });
  const [running, setRunning] = useState(false);

  function setStatus(type: string, update: TypeStatus) {
    setStatuses((prev) => ({ ...prev, [type]: update }));
  }

  function setPriceStatus(type: string, update: PriceStatus) {
    setPriceStatuses((prev) => ({ ...prev, [type]: update }));
  }

  async function syncType(type: string) {
    setStatus(type, { state: "syncing" });
    try {
      const res  = await fetch(`/api/admin/sync-items?type=${type}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setStatus(type, { state: "error", error: data.error ?? "Failed" });
      else         setStatus(type, { state: "done", count: data.synced });
    } catch {
      setStatus(type, { state: "error", error: "Network error" });
    }
  }

  async function syncPricesForType(type: string) {
    setPriceStatus(type, { state: "syncing", page: 1 });
    let page       = 1;
    let totalPages = 1;
    let accSynced  = 0;
    let accSkipped = 0;

    while (page <= totalPages) {
      try {
        const res  = await fetch(`/api/admin/sync-prices?type=${type}&page=${page}&pageSize=80`, { method: "POST" });
        const data = await res.json();

        if (!res.ok) {
          setPriceStatus(type, { state: "error", error: data.error ?? "Failed" });
          return;
        }

        totalPages  = data.totalPages;
        accSynced  += data.synced;
        accSkipped += data.skipped;

        setPriceStatus(type, {
          state:      page < totalPages ? "syncing" : "done",
          synced:     accSynced,
          skipped:    accSkipped,
          total:      data.total,
          page,
          totalPages,
        });

        page++;
      } catch {
        setPriceStatus(type, { state: "error", error: "Network error" });
        return;
      }
    }
  }

  async function syncRecipes() {
    setRecipeStatus({ state: "syncing", page: 1 });
    let page         = 1;
    let totalPages   = 1;
    let accPopulated = 0;
    let accNoData    = 0;
    let accErrors    = 0;

    while (page <= totalPages) {
      try {
        const res  = await fetch(`/api/admin/sync-recipes?page=${page}&pageSize=80`, { method: "POST" });
        const data = await res.json();

        if (!res.ok) {
          setRecipeStatus({ state: "error", error: data.error ?? "Failed" });
          return;
        }

        totalPages    = data.totalPages;
        accPopulated += data.populated;
        accNoData    += data.noData ?? 0;
        accErrors    += data.errors ?? 0;

        setRecipeStatus({
          state:     page < totalPages ? "syncing" : "done",
          populated: accPopulated,
          noData:    accNoData,
          errors:    accErrors,
          total:     data.total,
          page,
          totalPages,
        });

        page++;
      } catch {
        setRecipeStatus({ state: "error", error: "Network error" });
        return;
      }
    }
  }

  async function syncAll() {
    setRunning(true);
    setStatuses(Object.fromEntries(ALL_TYPES.map((t) => [t, { state: "idle" }])));
    for (const type of ALL_TYPES) await syncType(type);
    setRunning(false);
  }

  async function syncAllPrices() {
    setRunning(true);
    setPriceStatuses(Object.fromEntries(ALL_TYPES.map((t) => [t, { state: "idle" }])));
    setRecipeStatus({ state: "idle" });
    for (const type of ALL_TYPES) await syncPricesForType(type);
    await syncRecipes();
    setRunning(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground mt-1">Item catalog and market price management.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncAllPrices} disabled={running}>
            <TrendingUp className={`size-4 mr-2 ${running ? "animate-pulse" : ""}`} />
            Sync All Prices
          </Button>
          <Button onClick={syncAll} disabled={running}>
            <RefreshCw className={`size-4 mr-2 ${running ? "animate-spin" : ""}`} />
            Sync All Items
          </Button>
        </div>
      </div>

      {/* Item Catalog Sync — grouped by market tab */}
      {TAB_GROUPS.map((group) => (
        <Card key={group.label}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{group.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {group.types.map((type) => {
              const itemStatus  = statuses[type];
              const priceStatus = priceStatuses[type];
              return (
                <div
                  key={type}
                  className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon state={itemStatus.state} />
                    <span className="text-sm font-medium truncate">{type}</span>
                    {itemStatus.state === "done" && (
                      <span className="text-xs text-muted-foreground shrink-0">{itemStatus.count} items</span>
                    )}
                    {itemStatus.state === "error" && (
                      <span className="text-xs text-destructive shrink-0">{itemStatus.error}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {/* Price sync status */}
                    <div className="flex items-center gap-1.5">
                      <PriceStatusIcon state={priceStatus.state} />
                      {priceStatus.state === "syncing" && priceStatus.totalPages && priceStatus.totalPages > 1 && (
                        <span className="text-xs text-muted-foreground">
                          page {priceStatus.page}/{priceStatus.totalPages}
                        </span>
                      )}
                      {priceStatus.state === "done" && (
                        <span className="text-xs text-muted-foreground">
                          {priceStatus.synced}/{priceStatus.total}
                        </span>
                      )}
                      {priceStatus.state === "error" && (
                        <span className="text-xs text-destructive">{priceStatus.error}</span>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => syncPricesForType(type)}
                      disabled={running || priceStatus.state === "syncing"}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                      title="Sync prices"
                    >
                      <TrendingUp className="size-3" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncType(type)}
                      disabled={running || itemStatus.state === "syncing"}
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

      {/* Recipe ID Sync */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="size-4" />
            Recipe IDs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RecipeStatusIcon state={recipeStatus.state} />
              <div className="text-sm">
                {recipeStatus.state === "idle" && (
                  <span className="text-muted-foreground">Populates <code className="text-xs">recipe_result_hashed_id</code> for all RECIPE items</span>
                )}
                {recipeStatus.state === "syncing" && (
                  <span className="text-muted-foreground">
                    {recipeStatus.totalPages && recipeStatus.totalPages > 1
                      ? `Page ${recipeStatus.page}/${recipeStatus.totalPages} — ${recipeStatus.populated ?? 0} populated`
                      : "Populating…"}
                  </span>
                )}
                {recipeStatus.state === "done" && recipeStatus.total === 0 && (
                  <span className="text-muted-foreground">All recipe IDs already populated</span>
                )}
                {recipeStatus.state === "done" && (recipeStatus.total ?? 0) > 0 && (
                  <span>
                    {recipeStatus.populated} populated
                    {(recipeStatus.noData ?? 0) > 0 && <span className="text-muted-foreground"> · {recipeStatus.noData} no data</span>}
                    {(recipeStatus.errors ?? 0) > 0 && <span className="text-destructive"> · {recipeStatus.errors} errors</span>}
                  </span>
                )}
                {recipeStatus.state === "error" && (
                  <span className="text-destructive">{recipeStatus.error}</span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={syncRecipes}
              disabled={running || recipeStatus.state === "syncing"}
              className="h-7 text-xs shrink-0"
            >
              Sync Recipe IDs
            </Button>
          </div>
        </CardContent>
      </Card>

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
            Item catalog syncs automatically every day at <span className="font-mono text-foreground">00:00 UTC</span> via
            Vercel Cron (<code className="text-xs">POST /api/cron/sync-market</code>).
            Prices are not synced by cron — use <strong>Sync All Prices</strong> above.
            Large types are synced in pages of 80 items to stay within Vercel&apos;s execution limit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ state }: { state: SyncState }) {
  if (state === "syncing") return <Loader className="size-4 text-muted-foreground animate-spin" />;
  if (state === "done")    return <CheckCircle className="size-4 text-green-500" />;
  if (state === "error")   return <XCircle className="size-4 text-destructive" />;
  return <div className="size-4 rounded-full border border-border" />;
}

function PriceStatusIcon({ state }: { state: SyncState }) {
  if (state === "syncing") return <Loader className="size-3 text-muted-foreground animate-spin" />;
  if (state === "done")    return <TrendingUp className="size-3 text-green-500" />;
  if (state === "error")   return <XCircle className="size-3 text-destructive" />;
  return null;
}

function RecipeStatusIcon({ state }: { state: SyncState }) {
  if (state === "syncing") return <Loader className="size-4 text-muted-foreground animate-spin" />;
  if (state === "done")    return <CheckCircle className="size-4 text-green-500" />;
  if (state === "error")   return <XCircle className="size-4 text-destructive" />;
  return <div className="size-4 rounded-full border border-border" />;
}
