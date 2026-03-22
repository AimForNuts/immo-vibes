"use client";

import { useState, useEffect } from "react";
import type React from "react";
import type { CatalogItem, SlotKey, WeaponStyle } from "../types";

function getSlotType(style: WeaponStyle, slot: SlotKey): string {
  if (slot === "helmet") return "HELMET";
  if (slot === "chestplate") return "CHESTPLATE";
  if (slot === "greaves") return "GREAVES";
  if (slot === "gauntlets") return "GAUNTLETS";
  if (slot === "boots") return "BOOTS";
  if (slot === "off_hand") return style === "DUAL_DAGGER" ? "DAGGER" : "SHIELD";
  if (style === "DUAL_DAGGER") return "DAGGER";
  if (style === "BOW") return "BOW";
  return "SWORD";
}

interface Picker {
  side: "A" | "B";
  slot: SlotKey;
}

interface UseItemSearchReturn {
  results:       CatalogItem[];
  searching:     boolean;
  query:         string;
  setQuery:      React.Dispatch<React.SetStateAction<string>>;
  qualityFilter: string;
  setQualityFilter: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Debounced item search for the picker modal. Fetches `/api/items` filtered
 * by slot type (derived from weapon style + slot key) and optional quality.
 *
 * @param picker        - Current picker state (side + slot), or null when closed
 * @param weaponStyleA  - Weapon style of Set A (needed to derive slot type)
 * @param weaponStyleB  - Weapon style of Set B (needed to derive slot type)
 * @param onResults     - Callback called with fetched items to update localItemsMap
 * @returns `{ results, searching, query, setQuery, qualityFilter, setQualityFilter }`
 */
export function useItemSearch(
  picker: Picker | null,
  weaponStyleA: WeaponStyle,
  weaponStyleB: WeaponStyle,
  onResults: (items: CatalogItem[]) => void
): UseItemSearchReturn {
  const [query, setQuery]               = useState("");
  const [qualityFilter, setQualityFilter] = useState<string>("");
  const [results, setResults]           = useState<CatalogItem[]>([]);
  const [searching, setSearching]       = useState(false);

  useEffect(() => {
    if (!picker) { setResults([]); setQuery(""); setQualityFilter(""); return; }
  }, [picker]);

  useEffect(() => {
    if (!picker) return;
    const type = getSlotType(
      picker.side === "A" ? weaponStyleA : weaponStyleB,
      picker.slot
    );
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ type, q: query });
        if (qualityFilter) params.set("quality", qualityFilter);
        const res = await fetch(`/api/items?${params}`);
        const data = await res.json();
        const fetched: CatalogItem[] = (data.items ?? []).map(
          (i: { hashedId: string; name: string; quality: string; imageUrl: string | null }) => ({
            hashedId: i.hashedId,
            name: i.name,
            quality: i.quality,
            imageUrl: i.imageUrl,
          })
        );
        setResults(fetched);
        onResults(fetched);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, qualityFilter, picker, weaponStyleA, weaponStyleB, onResults]);

  return { results, searching, query, setQuery, qualityFilter, setQualityFilter };
}
