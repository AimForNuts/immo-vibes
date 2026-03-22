"use client";

import { useState, useCallback } from "react";
import type { DbItem, FullItem, MarketPrice } from "../types";

interface UseItemDetailReturn {
  selectedItem:      DbItem | null;
  itemDetail:        FullItem | null | "loading";
  materialPrices:    Record<string, MarketPrice | null | undefined>;
  craftedByDetail:   FullItem | null | "loading" | undefined;
  craftedByItemData: DbItem | null | undefined;
  resultItemData:    DbItem | null | undefined;
  handleItemClick:   (item: DbItem) => void;
  clearSelection:    () => void;
}

export function useItemDetail(): UseItemDetailReturn {
  const [selectedItem, setSelectedItem]     = useState<DbItem | null>(null);
  const [itemDetail, setItemDetail]         = useState<FullItem | null | "loading">(null);
  const [materialPrices, setMaterialPrices] = useState<Record<string, MarketPrice | null | undefined>>({});
  // For non-recipe items: the recipe that crafts this item (if any)
  const [craftedByDetail, setCraftedByDetail]     = useState<FullItem | null | "loading" | undefined>(undefined);
  // For non-recipe items: the recipe scroll's own DB prices (vendor/market)
  const [craftedByItemData, setCraftedByItemData] = useState<DbItem | null | undefined>(undefined);
  // For recipe items: the produced item's DB data (prices, name)
  const [resultItemData, setResultItemData]       = useState<DbItem | null | undefined>(undefined);

  const handleItemClick = useCallback((item: DbItem) => {
    setSelectedItem(item);
    setItemDetail("loading");
    setMaterialPrices({});
    setCraftedByDetail(undefined);
    setCraftedByItemData(undefined);
    setResultItemData(undefined);

    // Fetch full item data from DB (stats, recipe, effects — all stored)
    fetch(`/api/market/item/${item.hashed_id}`)
      .then((r) => r.json())
      .then((data) => {
        const detail: FullItem | null = data.item ?? null;
        setItemDetail(detail);

        if (item.type === "RECIPE") {
          // For RECIPE items: fetch produced item's DB data
          const resultId = detail?.recipe?.result?.hashed_item_id;
          if (resultId) {
            fetch(`/api/market/item/${resultId}`)
              .then((r) => r.json())
              .then((d) => setResultItemData(d.item ?? null))
              .catch(() => setResultItemData(null));
          } else {
            setResultItemData(null);
          }

          // Fetch material prices
          if (detail?.recipe?.materials?.length) {
            const mats = detail.recipe.materials;
            setMaterialPrices(Object.fromEntries(mats.map((m) => [m.hashed_item_id, undefined])));
            for (const mat of mats) {
              fetch(`/api/market/price/${mat.hashed_item_id}?tier=0`)
                .then((r) => r.json())
                .then((pd) => setMaterialPrices((prev: Record<string, MarketPrice | null | undefined>) => ({
                  ...prev,
                  [mat.hashed_item_id]: { price: pd.price ?? null, sold_at: pd.sold_at ?? null, quantity: pd.quantity ?? null },
                })))
                .catch(() => setMaterialPrices((prev: Record<string, MarketPrice | null | undefined>) => ({ ...prev, [mat.hashed_item_id]: null })));
            }
          }
        } else {
          // For non-recipe items: find which recipe (if any) produces this item
          setCraftedByDetail("loading");
          fetch(`/api/market/crafted-by/${item.hashed_id}`)
            .then((r) => r.json())
            .then((d) => {
              const recipeRef = d.recipe as { hashed_id: string; name: string } | null;
              if (!recipeRef) { setCraftedByDetail(null); return; }

              // Fetch recipe scroll's DB prices (vendor/market)
              fetch(`/api/market/item/${recipeRef.hashed_id}`)
                .then((r) => r.json())
                .then((d) => setCraftedByItemData(d.item ?? null))
                .catch(() => setCraftedByItemData(null));

              // Fetch recipe scroll's full data (materials, skill level)
              fetch(`/api/market/item/${recipeRef.hashed_id}`)
                .then((r) => r.json())
                .then((d) => {
                  const recipeDetail: FullItem | null = d.item ?? null;
                  setCraftedByDetail(recipeDetail);

                  if (recipeDetail?.recipe?.materials?.length) {
                    const mats = recipeDetail.recipe.materials;
                    setMaterialPrices((prev: Record<string, MarketPrice | null | undefined>) => ({
                      ...prev,
                      ...Object.fromEntries(mats.map((m) => [m.hashed_item_id, undefined])),
                    }));
                    for (const mat of mats) {
                      fetch(`/api/market/price/${mat.hashed_item_id}?tier=0`)
                        .then((r) => r.json())
                        .then((pd) => setMaterialPrices((prev: Record<string, MarketPrice | null | undefined>) => ({
                          ...prev,
                          [mat.hashed_item_id]: { price: pd.price ?? null, sold_at: pd.sold_at ?? null, quantity: pd.quantity ?? null },
                        })))
                        .catch(() => setMaterialPrices((prev: Record<string, MarketPrice | null | undefined>) => ({ ...prev, [mat.hashed_item_id]: null })));
                    }
                  }
                })
                .catch(() => setCraftedByDetail(null));
            })
            .catch(() => setCraftedByDetail(null));
        }
      })
      .catch(() => setItemDetail(null));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
  }, []);

  return {
    selectedItem,
    itemDetail,
    materialPrices,
    craftedByDetail,
    craftedByItemData,
    resultItemData,
    handleItemClick,
    clearSelection,
  };
}
