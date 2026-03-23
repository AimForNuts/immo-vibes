"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function SyncPetButton({ characterId }: { characterId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setState("loading");
    setMessage(null);

    try {
      const res = await fetch(`/api/characters/${characterId}/sync-pet`, { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        setState("error");
        setMessage(body.error ?? "Sync failed");
      } else {
        setState("success");
        setMessage(`Synced: ${body.pet.name} Lv.${body.pet.level}`);
        // Reload to reflect updated pet data from DB
        window.location.reload();
      }
    } catch {
      setState("error");
      setMessage("Network error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleSync}
        disabled={state === "loading"}
        className="gap-1.5"
      >
        <RefreshCw className={`size-3.5 ${state === "loading" ? "animate-spin" : ""}`} />
        Sync Current Pet
      </Button>
      {message && (
        <span className={`text-xs ${state === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {message}
        </span>
      )}
    </div>
  );
}
