"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { idleMmoQueue, type IdleMmoQueueStatus } from "@/lib/idlemmo-queue";

async function browserKeyId(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest.slice(0, 12)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function formatReset(resetAt: number) {
  if (!resetAt) return "--";
  const seconds = Math.max(0, Math.ceil((resetAt * 1000 - Date.now()) / 1000));
  return `${seconds}s`;
}

export function IdleMmoRateLimitIndicator({ token }: { token: string | null | undefined }) {
  const [status, setStatus] = useState<IdleMmoQueueStatus>(() => idleMmoQueue.getStatus());
  const [now, setNow] = useState(0);

  useEffect(() => idleMmoQueue.subscribe(setStatus), []);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      idleMmoQueue.setApiKey(null);
      return;
    }

    browserKeyId(token).then((keyId) => {
      if (!cancelled) idleMmoQueue.setApiKey(keyId);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const reset = useMemo(() => {
    void now;
    return formatReset(status.resetAt);
  }, [now, status.resetAt]);

  return (
    <div className="pointer-events-none fixed bottom-2 left-1/2 z-40 -translate-x-1/2 rounded-md border border-border/70 bg-background/90 px-3 py-1.5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
        <Activity className="size-3 text-primary/70" />
        <span>API {status.remaining ?? "?"}</span>
        <span>Reset {reset}</span>
        <span>Queue {status.queueSize}</span>
      </div>
    </div>
  );
}
