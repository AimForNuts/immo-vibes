"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skull } from "lucide-react";
import { AdminTable, type ColumnDef, type FilterDef } from "@/components/admin/AdminTable";
import { SyncLog, type LogEntry } from "@/components/admin/SyncLog";
import { cn } from "@/lib/utils";

type DungeonRow = {
  id: number;
  name: string;
  location: string | null;
  levelRequired: number;
  difficulty: number;
  syncedAt: string;
};

const COLUMNS: ColumnDef<DungeonRow>[] = [
  { key: "name",          label: "Name",       render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "location",      label: "Location",   render: (r) => <span className="text-muted-foreground text-xs">{r.location ?? "—"}</span> },
  { key: "levelRequired", label: "Level req.", render: (r) => <span className="text-xs">{r.levelRequired}</span> },
  { key: "difficulty",    label: "Difficulty", render: (r) => <span className="text-xs">{r.difficulty}</span> },
];

const FILTERS: FilterDef[] = [
  { key: "name",     label: "Search name…", type: "search" },
  { key: "minLevel", label: "Min level",    type: "search" },
];

let _logId = 0;

export default function DungeonsPage() {
  const [busy, setBusy]             = useState(false);
  const [logs, setLogs]             = useState<LogEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const cancelRef                   = useRef(false);

  function addLog(msg: string, kind: LogEntry["kind"] = "info") {
    setLogs((prev) => [...prev, { id: _logId++, msg, kind }]);
  }

  async function syncDungeons() {
    setBusy(true); cancelRef.current = false; setLogs([]);
    addLog("Syncing dungeons…");
    try {
      const res = await fetch("/api/admin/sync-dungeons", { method: "POST" });
      if (!res.ok) { addLog("Sync failed", "error"); return; }
      const data = await res.json() as { synced?: number };
      addLog(`Synced ${data.synced ?? 0} dungeons`, "success");
      setRefreshKey((k) => k + 1);
    } catch {
      addLog("Sync error", "error");
    } finally {
      setBusy(false);
    }
  }

  const headerContent = (
    <Button size="sm" disabled={busy} className="h-8 gap-1.5" onClick={syncDungeons}>
      <Skull className={cn("size-3.5", busy && "animate-pulse")} />
      Sync Dungeons
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dungeons</h1>
        <p className="text-muted-foreground text-sm">Dungeon catalog synced from IdleMMO.</p>
      </div>
      <AdminTable<DungeonRow>
        columns={COLUMNS}
        endpoint="/api/admin/dungeons"
        filters={FILTERS}
        pageSize={25}
        refreshKey={refreshKey}
        headerContent={headerContent}
        emptyMessage="No dungeons found. Run Sync Dungeons to populate."
      />
      <SyncLog logs={logs} />
    </div>
  );
}
