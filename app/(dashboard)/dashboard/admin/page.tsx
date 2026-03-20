"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, Loader, BookOpen, TrendingUp, Clock } from "lucide-react";
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
  state:    SyncState;
  synced?:  number;
  skipped?: number;
  total?:   number;
  error?:   string;
}

interface RecipeStatus {
  state:   SyncState;
  synced?: number;
  total?:  number;
  error?:  string;
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
    setPriceStatus(type, { state: "syncing" });
    try {
      const res  = await fetch(`/api/admin/sync-prices?type=${type}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setPriceStatus(type, { state: "error", error: data.error ?? "Failed" });
      else         setPriceStatus(type, { state: "done", synced: data.synced, skipped: data.skipped, total: data.total });
    } catch {
      setPriceStatus(type, { state: "error", error: "Network error" });
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
    for (const type of ALL_TYPES) await syncPricesForType(type);
    setRunning(false);
  }

  async function syncRecipes() {
    setRunning(true);
    setRecipeStatus({ state: "syncing" });
    try {
      const res  = await fetch("/api/admin/sync-recipes", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setRecipeStatus({ state: "error", error: data.error ?? "Failed" });
      else         setRecipeStatus({ state: "done", synced: data.synced, total: data.total });
    } catch {
      setRecipeStatus({ state: "error", error: "Network error" });
    } finally {
      setRunning(false);
    }
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

      {/* Recipe Sync */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="size-4" />
            Recipe Sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Fetches all RECIPE-type items and inspects each to persist the crafted item
            reference (<code className="text-xs">recipe_result_hashed_id</code>). Rate-limited
            — may take several minutes.
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon state={recipeStatus.state} />
              {recipeStatus.state === "idle"    && <span className="text-sm text-muted-foreground">Not started</span>}
              {recipeStatus.state === "syncing" && <span className="text-sm text-muted-foreground">Syncing…</span>}
              {recipeStatus.state === "done"    && (
                <span className="text-sm text-muted-foreground">
                  {recipeStatus.synced} / {recipeStatus.total} recipes synced
                </span>
              )}
              {recipeStatus.state === "error"   && <span className="text-sm text-destructive">{recipeStatus.error}</span>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={syncRecipes}
              disabled={recipeStatus.state === "syncing"}
              className="h-7 text-xs"
            >
              <RefreshCw className={`size-3 mr-1.5 ${recipeStatus.state === "syncing" ? "animate-spin" : ""}`} />
              Sync Recipes
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
            Prices are not synced by cron — use the <strong>Sync All Prices</strong> button above or the per-category
            price button to update last-sold data.
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
