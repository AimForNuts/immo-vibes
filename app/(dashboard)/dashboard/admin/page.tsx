"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, Loader } from "lucide-react";

const TYPES = [
  "SWORD", "DAGGER", "BOW", "SHIELD",
  "HELMET", "CHESTPLATE", "GREAVES", "GAUNTLETS", "BOOTS",
] as const;

type SyncState = "idle" | "syncing" | "done" | "error";

interface TypeStatus {
  state: SyncState;
  count?: number;
  error?: string;
}

export default function AdminPage() {
  const [statuses, setStatuses] = useState<Record<string, TypeStatus>>(
    Object.fromEntries(TYPES.map((t) => [t, { state: "idle" }]))
  );
  const [running, setRunning] = useState(false);

  function setStatus(type: string, update: TypeStatus) {
    setStatuses((prev) => ({ ...prev, [type]: update }));
  }

  async function syncAll() {
    setRunning(true);
    // Reset all to idle first
    setStatuses(Object.fromEntries(TYPES.map((t) => [t, { state: "idle" }])));

    for (const type of TYPES) {
      setStatus(type, { state: "syncing" });
      try {
        const res = await fetch(`/api/admin/sync-items?type=${type}`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus(type, { state: "error", error: data.error ?? "Failed" });
        } else {
          setStatus(type, { state: "done", count: data.synced });
        }
      } catch (e) {
        setStatus(type, { state: "error", error: "Network error" });
      }
    }

    setRunning(false);
  }

  async function syncOne(type: string) {
    setStatus(type, { state: "syncing" });
    try {
      const res = await fetch(`/api/admin/sync-items?type=${type}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(type, { state: "error", error: data.error ?? "Failed" });
      } else {
        setStatus(type, { state: "done", count: data.synced });
      }
    } catch {
      setStatus(type, { state: "error", error: "Network error" });
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground mt-1">Item catalog management.</p>
        </div>
        <Button onClick={syncAll} disabled={running}>
          <RefreshCw className={`size-4 mr-2 ${running ? "animate-spin" : ""}`} />
          Sync All
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item Catalog Sync</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {TYPES.map((type) => {
            const status = statuses[type];
            return (
              <div
                key={type}
                className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon state={status.state} />
                  <span className="text-sm font-medium">{type}</span>
                  {status.state === "done" && (
                    <span className="text-xs text-muted-foreground">
                      {status.count} items
                    </span>
                  )}
                  {status.state === "error" && (
                    <span className="text-xs text-destructive">{status.error}</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncOne(type)}
                  disabled={running || status.state === "syncing"}
                  className="h-7 text-xs"
                >
                  Sync
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ state }: { state: SyncState }) {
  if (state === "syncing") return <Loader className="size-4 text-muted-foreground animate-spin" />;
  if (state === "done") return <CheckCircle className="size-4 text-green-500" />;
  if (state === "error") return <XCircle className="size-4 text-destructive" />;
  return <div className="size-4 rounded-full border border-border" />;
}
