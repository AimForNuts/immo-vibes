"use client";

import { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { QUALITY_COLORS, SLOT_LABELS } from "@/lib/game-constants";
import { useItemSearch } from "../hooks/useItemSearch";
import type { CatalogItem, SlotKey, WeaponStyle } from "../types";

const QUALITIES = ["STANDARD", "REFINED", "PREMIUM", "EPIC", "LEGENDARY", "MYTHIC"] as const;

interface Picker {
  side: "A" | "B";
  slot: SlotKey;
}

interface ItemPickerModalProps {
  picker:       Picker;
  weaponStyleA: WeaponStyle;
  weaponStyleB: WeaponStyle;
  onSelect:     (item: CatalogItem) => void;
  onClose:      () => void;
  onResults:    (items: CatalogItem[]) => void;
}

export function ItemPickerModal({
  picker,
  weaponStyleA,
  weaponStyleB,
  onSelect,
  onClose,
  onResults,
}: ItemPickerModalProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  const { results, searching, query, setQuery, qualityFilter, setQualityFilter } =
    useItemSearch(picker, weaponStyleA, weaponStyleB, onResults);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  return (
    <Card className="border-primary/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">
          Pick {SLOT_LABELS[picker.slot]} for Set {picker.side}
        </CardTitle>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="h-8 text-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setQualityFilter("")}
            className={`px-2 py-0.5 rounded text-xs border transition-colors ${qualityFilter === "" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            All
          </button>
          {QUALITIES.map((q) => (
            <button
              key={q}
              onClick={() => setQualityFilter(qualityFilter === q ? "" : q)}
              className={`px-2 py-0.5 rounded text-xs border transition-colors ${qualityFilter === q ? "border-current font-medium " + QUALITY_COLORS[q] : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {q.charAt(0) + q.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5">
          {searching && <p className="text-xs text-muted-foreground py-3 text-center">Searching…</p>}
          {!searching && results.length === 0 && (
            <p className="text-xs text-muted-foreground py-3 text-center">
              {query || qualityFilter ? "No items found." : "Start typing or pick a quality."}
            </p>
          )}
          {!searching && results.map((item) => (
            <button
              key={item.hashedId}
              onClick={() => onSelect(item)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent text-left transition-colors"
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="size-6 object-contain shrink-0" />
              ) : (
                <div className="size-6 bg-muted rounded shrink-0" />
              )}
              <span className="flex-1 truncate">{item.name}</span>
              <span className={`text-xs shrink-0 ${QUALITY_COLORS[item.quality] ?? "text-muted-foreground"}`}>
                {item.quality.charAt(0) + item.quality.slice(1).toLowerCase()}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
