"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Save, Trash2, X } from "lucide-react";
import type { SavedPreset } from "../actions";

interface PresetManagerProps {
  presets:     SavedPreset[];
  characters:  { hashed_id: string; name: string }[];
  onLoad:      (preset: SavedPreset, side: "A" | "B") => void;
  onSave:      (side: "A" | "B", name: string) => Promise<void>;
  onUpdate:    (id: string, side: "A" | "B") => Promise<void>;
  onDelete:    (id: string) => Promise<void>;
}

export function PresetManager({
  presets,
  characters,
  onLoad,
  onSave,
  onUpdate,
  onDelete,
}: PresetManagerProps) {
  const [saveTarget,    setSaveTarget]    = useState<"A" | "B" | null>(null);
  const [presetName,    setPresetName]    = useState("");
  const [saving,        setSaving]        = useState(false);
  const [updateTarget,  setUpdateTarget]  = useState<string | null>(null);

  async function handleSave(side: "A" | "B") {
    if (!presetName.trim()) return;
    setSaving(true);
    await onSave(side, presetName.trim());
    setPresetName("");
    setSaveTarget(null);
    setSaving(false);
  }

  return (
    <>
      {/* Saved presets list */}
      {presets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saved Presets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const linkedChar = p.characterId ? characters.find((c) => c.hashed_id === p.characterId) : null;
              const isUpdating = updateTarget === p.id;
              return (
                <div key={p.id} className="flex items-center gap-1 border border-border rounded-md px-2 py-1 text-sm">
                  <span>{p.name}</span>
                  {linkedChar && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{linkedChar.name}</Badge>
                  )}
                  <button onClick={() => onLoad(p, "A")} className="text-xs text-muted-foreground hover:text-foreground px-1" title="Load into Set A">→A</button>
                  <button onClick={() => onLoad(p, "B")} className="text-xs text-muted-foreground hover:text-foreground px-1" title="Load into Set B">→B</button>
                  {isUpdating ? (
                    <>
                      <span className="text-xs text-muted-foreground">Update from:</span>
                      <button onClick={() => onUpdate(p.id, "A")} className="text-xs text-primary hover:underline px-0.5" title="Overwrite with Set A">A</button>
                      <button onClick={() => onUpdate(p.id, "B")} className="text-xs text-primary hover:underline px-0.5" title="Overwrite with Set B">B</button>
                      <button onClick={() => setUpdateTarget(null)} className="text-muted-foreground hover:text-foreground"><X className="size-3" /></button>
                    </>
                  ) : (
                    <button onClick={() => setUpdateTarget(p.id)} className="text-muted-foreground hover:text-foreground" title="Update preset"><Pencil className="size-3" /></button>
                  )}
                  <button onClick={() => onDelete(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Save controls */}
      <div className="flex flex-wrap items-center gap-2">
        {(["A", "B"] as const).map((side) => (
          <div key={side} className="flex items-center gap-2">
            {saveTarget === side ? (
              <>
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder={`Name for Set ${side}…`}
                  className="h-8 text-sm w-40"
                  onKeyDown={(e) => e.key === "Enter" && handleSave(side)}
                  autoFocus
                />
                <Button size="sm" className="h-8" disabled={saving} onClick={() => handleSave(side)}>
                  <Save className="size-3.5 mr-1" /> Save
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setSaveTarget(null)}>
                  <X className="size-3.5" />
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setSaveTarget(side); setPresetName(""); }}>
                <Save className="size-3.5 mr-1" /> Save Set {side}
              </Button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
