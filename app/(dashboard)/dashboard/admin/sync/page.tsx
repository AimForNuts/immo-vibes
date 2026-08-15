"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SyncLogRow = {
  id: string;
  job: string;
  status: "started" | "progress" | "success" | "failed" | "skipped" | string;
  message: string;
  details: Record<string, unknown> | null;
  userId: string | null;
  createdAt: string;
};

const JOBS = ["all", "items", "inspect", "prices", "recipes", "dungeons"] as const;

function statusClass(status: string) {
  if (status === "success") return "text-emerald-600 dark:text-emerald-400";
  if (status === "failed") return "text-destructive";
  if (status === "skipped") return "text-amber-600 dark:text-amber-400";
  if (status === "started") return "text-blue-600 dark:text-blue-400";
  return "text-muted-foreground";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckCircle2 className="size-4" />;
  if (status === "failed") return <AlertCircle className="size-4" />;
  if (status === "started") return <Clock className="size-4" />;
  return <Activity className="size-4" />;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export default function SyncStatusPage() {
  const [logs, setLogs] = useState<SyncLogRow[]>([]);
  const [job, setJob] = useState<(typeof JOBS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (job !== "all") params.set("job", job);
      const res = await fetch(`/api/admin/sync-logs?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load sync logs");
      const data = await res.json() as { logs: SyncLogRow[] };
      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sync logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [job]);

  useEffect(() => {
    loadLogs();
    const id = window.setInterval(loadLogs, 30_000);
    return () => window.clearInterval(id);
  }, [loadLogs]);

  const latestByJob = useMemo(() => {
    const map = new Map<string, SyncLogRow>();
    for (const log of logs) {
      if (!map.has(log.job)) map.set(log.job, log);
    }
    return Array.from(map.values());
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sync Status</h1>
          <p className="text-muted-foreground text-sm">Recent sync job events, failures, and partial progress.</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={loadLogs} disabled={loading}>
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {JOBS.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={job === option ? "default" : "outline"}
            className="h-8 capitalize"
            onClick={() => setJob(option)}
          >
            {option}
          </Button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {latestByJob.length > 0 && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {latestByJob.map((log) => (
            <div key={log.job} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold capitalize">{log.job}</div>
                <div className={cn("flex items-center gap-1.5 text-xs font-medium capitalize", statusClass(log.status))}>
                  <StatusIcon status={log.status} />
                  {log.status}
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{log.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatTime(log.createdAt)}</p>
            </div>
          ))}
        </section>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Time</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Job</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Message</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">Loading...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">No sync logs found.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t border-border/50">
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{formatTime(log.createdAt)}</td>
                  <td className="px-3 py-2.5 text-xs font-medium uppercase">{log.job}</td>
                  <td className={cn("px-3 py-2.5 text-xs font-medium capitalize", statusClass(log.status))}>{log.status}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{log.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
