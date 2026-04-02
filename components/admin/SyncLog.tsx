"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type LogEntry = {
  id: number;
  msg: string;
  kind: "info" | "success" | "error" | "cancel";
};

export function SyncLog({ logs }: { logs: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div
      ref={ref}
      className="mt-4 h-48 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs space-y-1"
    >
      {logs.map((e) => (
        <div
          key={e.id}
          className={cn(
            e.kind === "success" && "text-green-400",
            e.kind === "error"   && "text-red-400",
            e.kind === "cancel"  && "text-yellow-400",
            e.kind === "info"    && "text-muted-foreground"
          )}
        >
          {e.kind === "success" ? "✓" : e.kind === "error" ? "✗" : e.kind === "cancel" ? "⊘" : "→"} {e.msg}
        </div>
      ))}
    </div>
  );
}
