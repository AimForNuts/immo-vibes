"use client";

import { useEffect, useState } from "react";
import { idleMmoQueue } from "@/lib/idlemmo-queue";
import { loadGuildActivity, type GuildSnapshot } from "@/lib/services/guild-activity-client";

export function useGuildActivity(keyId: string | null, guildId: number) {
  const [state, setState] = useState<{
    keyId: string | null;
    guildId: number;
    snapshot: GuildSnapshot | null;
    loading: boolean;
    error: string | null;
  }>({ keyId, guildId, snapshot: null, loading: !!keyId, error: null });

  useEffect(() => {
    if (!keyId) return;
    const scope = `guild:${crypto.randomUUID()}`;
    const controller = new AbortController();
    let started = false;
    const unsubscribe = idleMmoQueue.subscribe((status) => {
      if (status.keyId !== keyId) {
        if (started && !controller.signal.aborted) {
          controller.abort();
          idleMmoQueue.cancelByTag(scope);
          setState({ keyId: null, guildId, snapshot: null, loading: false, error: null });
        }
        return;
      }
      if (started || controller.signal.aborted) return;
      started = true;
      void loadGuildActivity(keyId, guildId, scope, controller.signal, (snapshot) => {
        setState({ keyId, guildId, snapshot, loading: true, error: null });
      }).then(() => {
        if (!controller.signal.aborted) setState((current) => ({ ...current, loading: false }));
      }).catch((error: unknown) => {
        if (!controller.signal.aborted && !(error instanceof DOMException && error.name === "AbortError")) {
          setState((current) => ({ ...current, loading: false,
            error: error instanceof Error ? error.message : "Guild data could not be refreshed." }));
        }
      });
    });
    return () => {
      unsubscribe();
      controller.abort();
      idleMmoQueue.cancelByTag(scope);
    };
  }, [keyId, guildId]);

  return state.keyId === keyId && state.guildId === guildId ? state :
    { snapshot: null, loading: !!keyId, error: null };
}
