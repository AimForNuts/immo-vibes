"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PetStatsFormProps {
  characterId: string;
  initial: {
    attackPower: number;
    protection: number;
    agility: number;
    accuracy: number | null;
    maxStamina: number | null;
    movementSpeed: number | null;
    criticalChance: number | null;
    criticalDamage: number | null;
  };
}

const FIELDS: Array<{
  key: keyof PetStatsFormProps["initial"];
  label: string;
  decimal?: boolean;
}> = [
  { key: "attackPower",    label: "Attack Power"    },
  { key: "protection",     label: "Protection"      },
  { key: "agility",        label: "Agility"         },
  { key: "accuracy",       label: "Accuracy"        },
  { key: "maxStamina",     label: "Max Stamina"     },
  { key: "movementSpeed",  label: "Movement Speed", decimal: true },
  { key: "criticalChance", label: "Critical Chance" },
  { key: "criticalDamage", label: "Critical Damage" },
];

export function PetStatsForm({ characterId, initial }: PetStatsFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = initial[f.key];
      init[f.key] = v !== null && v !== undefined ? String(v) : "";
    }
    return init;
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function parseValue(key: string, decimal?: boolean): number | null {
    const raw = values[key].trim();
    if (raw === "") return null;
    const n = decimal ? parseFloat(raw) : parseInt(raw, 10);
    return isNaN(n) ? null : n;
  }

  async function handleSave() {
    setState("saving");
    setErrorMsg(null);

    const body: Record<string, number | null> = {};
    for (const f of FIELDS) {
      body[f.key] = parseValue(f.key, f.decimal);
    }

    try {
      const res = await fetch(`/api/characters/${characterId}/pet-stats`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setState("error");
        setErrorMsg(data.error ?? "Save failed");
      } else {
        setState("saved");
        setTimeout(() => setState("idle"), 2000);
      }
    } catch {
      setState("error");
      setErrorMsg("Network error");
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Input
              type="number"
              step={f.decimal ? "0.1" : "1"}
              min="0"
              placeholder="—"
              value={values[f.key]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
              }
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={state === "saving"}
        >
          {state === "saving" ? "Saving…" : "Save Stats"}
        </Button>
        {state === "saved" && (
          <span className="text-xs text-muted-foreground">Saved</span>
        )}
        {state === "error" && (
          <span className="text-xs text-destructive">{errorMsg}</span>
        )}
      </div>
    </div>
  );
}
