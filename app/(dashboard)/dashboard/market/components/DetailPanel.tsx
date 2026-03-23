"use client";

import { X, Package, BookOpen, ChevronRight, Coins } from "lucide-react";
import { QUALITY_HEX, QUALITY_BORDER_CSS } from "@/lib/game-constants";
import { cn } from "@/lib/utils";
import type { DbItem, FullItem, MarketPrice } from "../types";

interface DetailPanelProps {
  item:              DbItem;
  detail:            FullItem | null | "loading";
  selectedTier:      number;
  tierMarketPrice:   MarketPrice | null | undefined;
  materialPrices:    Record<string, MarketPrice | null | undefined>;
  craftedByDetail:   FullItem | null | "loading" | undefined;
  craftedByItemData: DbItem | null | undefined;
  resultItemData:    DbItem | null | undefined;
  onClose:           () => void;
  onTierChange:      (tier: number) => void;
}

export function DetailPanel({
  item, detail, selectedTier, tierMarketPrice, materialPrices,
  craftedByDetail, craftedByItemData, resultItemData, onClose, onTierChange,
}: DetailPanelProps) {
  const qualityColor = QUALITY_HEX[item.quality]        ?? "#a1a1aa";
  const borderColor  = QUALITY_BORDER_CSS[item.quality] ?? "rgba(113,113,122,0.4)";

  const isLoading = detail === "loading";
  const d = detail !== "loading" ? detail : null;

  const maxTier = d?.max_tier ?? 1;

  function statLabel(key: string) {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** Compute the effective stat value at the currently selected tier. */
  function effectiveStat(key: string, base: number): number {
    if (selectedTier <= 1 || !d?.tier_modifiers) return base;
    return base + (selectedTier - 1) * (d.tier_modifiers[key] ?? 0);
  }

  return (
    <div
      className="flex flex-col h-full bg-zinc-950 border-l overflow-hidden"
      style={{ borderColor }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-zinc-800 shrink-0">
        <div className="size-14 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="size-12 object-contain" />
          ) : (
            <Package className="size-7 text-zinc-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: qualityColor }}>{item.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] font-mono border px-1.5 py-0.5 rounded" style={{ color: qualityColor, borderColor }}>
              {item.quality}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono uppercase">
              {item.type.replace(/_/g, " ")}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 p-0.5"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
            ))}
          </div>
        ) : (
          <>
            {/* Description */}
            {d?.description && (
              <p className="text-xs text-zinc-400 leading-relaxed italic border-l-2 border-zinc-700 pl-3">
                {d.description}
              </p>
            )}

            {/* Tier selector — only shown for upgradeable items */}
            {maxTier > 1 && (
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Tier</p>
                <select
                  value={selectedTier}
                  onChange={(e) => onTierChange(parseInt(e.target.value, 10))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-400/40 cursor-pointer"
                >
                  {Array.from({ length: maxTier }, (_, i) => i + 1).map((t) => (
                    <option key={t} value={t}>T{t}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Prices */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900 rounded-md p-3 border border-zinc-800">
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1">Vendor</p>
                {item.vendor_price ? (
                  <p className="text-sm font-mono text-zinc-300">{item.vendor_price.toLocaleString()}g</p>
                ) : (
                  <p className="text-xs text-zinc-700">—</p>
                )}
              </div>
              <div className="bg-zinc-900 rounded-md p-3 border border-zinc-800">
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1">
                  Market{maxTier > 1 ? ` · T${selectedTier}` : ""}
                </p>
                {tierMarketPrice === undefined ? (
                  <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                ) : tierMarketPrice?.price != null ? (
                  <div>
                    <p className="text-sm font-mono text-amber-400">{tierMarketPrice.price.toLocaleString()}g</p>
                    {tierMarketPrice.sold_at && (
                      <p className="text-[9px] text-zinc-600 mt-0.5">
                        {new Date(tierMarketPrice.sold_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-700">—</p>
                )}
              </div>
            </div>

            {/* Crafted By — shown for non-recipe items that have a recipe producing them */}
            {item.type !== "RECIPE" && craftedByDetail !== undefined && (
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Crafted By</p>
                {craftedByDetail === "loading" ? (
                  <div className="space-y-2">
                    <div className="h-3 w-2/3 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-zinc-800 rounded animate-pulse" />
                  </div>
                ) : craftedByDetail === null ? null : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3 space-y-2 border-l-2" style={{ borderLeftColor: "rgba(251,146,60,0.4)" }}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <BookOpen className="size-3 shrink-0 text-amber-400/60" />
                        <span className="text-zinc-200 truncate">{craftedByDetail.name}</span>
                      </div>
                      <span className="text-zinc-500 shrink-0 ml-2">
                        {craftedByDetail.recipe?.skill} Lv.{craftedByDetail.recipe?.level_required}
                      </span>
                    </div>
                    {/* Recipe scroll vendor + market price */}
                    {craftedByItemData !== undefined && (
                      <div className="flex items-center gap-3 text-[10px] font-mono">
                        {craftedByItemData === null ? null : (
                          <>
                            {craftedByItemData.vendor_price ? (
                              <span className="text-zinc-500 flex items-center gap-1">
                                <Coins className="size-2.5" />
                                {craftedByItemData.vendor_price.toLocaleString()}g
                              </span>
                            ) : null}
                            {craftedByItemData.last_sold_price != null ? (
                              <span className="text-amber-400/70 flex items-center gap-1">
                                <span>⚖</span>
                                {craftedByItemData.last_sold_price.toLocaleString()}g
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
                    {craftedByDetail.recipe?.materials && craftedByDetail.recipe.materials.length > 0 && (() => {
                      const mats = craftedByDetail.recipe!.materials;
                      const allLoaded = mats.every((m) => materialPrices[m.hashed_item_id] !== undefined);
                      const total = allLoaded
                        ? mats.reduce((sum, m) => sum + (materialPrices[m.hashed_item_id]?.price ?? 0) * m.quantity, 0)
                        : null;
                      return (
                        <div className="border-t border-zinc-800 pt-2 space-y-1.5">
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Materials</p>
                          {mats.map((mat) => {
                            const mp = materialPrices[mat.hashed_item_id];
                            return (
                              <div key={mat.hashed_item_id} className="flex items-center justify-between text-xs gap-2">
                                <span className="text-zinc-300 truncate">{mat.item_name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono text-zinc-500">×{mat.quantity}</span>
                                  {mp === undefined ? (
                                    <div className="h-3 w-10 bg-zinc-800 rounded animate-pulse" />
                                  ) : mp?.price != null ? (
                                    <span className="font-mono text-amber-400/70 text-[10px]">
                                      {(mp.price * mat.quantity).toLocaleString()}g
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                          {total !== null && total > 0 && (
                            <div className="flex items-center justify-between border-t border-zinc-800 pt-1.5 text-xs">
                              <span className="text-zinc-500">Total cost</span>
                              <span className="font-mono text-amber-400 font-semibold">{total.toLocaleString()}g</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {/* Recipe scroll drop locations */}
                    {craftedByDetail.where_to_find && (
                      (craftedByDetail.where_to_find.enemies?.length ?? 0) > 0 ||
                      (craftedByDetail.where_to_find.dungeons?.length ?? 0) > 0 ||
                      (craftedByDetail.where_to_find.world_bosses?.length ?? 0) > 0
                    ) && (
                      <div className="border-t border-zinc-800 pt-2 space-y-1.5">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Recipe drops from</p>
                        {(craftedByDetail.where_to_find!.enemies?.length ?? 0) > 0 && (
                          <div className="space-y-0.5">
                            {craftedByDetail.where_to_find!.enemies!.map((e) => (
                              <div key={e.id} className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400">{e.name}</span>
                                <span className="font-mono text-zinc-600">Lv.{e.level}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {(craftedByDetail.where_to_find!.dungeons?.length ?? 0) > 0 && (
                          <div className="space-y-0.5">
                            {craftedByDetail.where_to_find!.dungeons!.map((dungeon) => (
                              <div key={dungeon.id} className="text-xs text-zinc-400">{dungeon.name}</div>
                            ))}
                          </div>
                        )}
                        {(craftedByDetail.where_to_find!.world_bosses?.length ?? 0) > 0 && (
                          <div className="space-y-0.5">
                            {craftedByDetail.where_to_find!.world_bosses!.map((wb) => (
                              <div key={wb.id} className="text-xs text-zinc-400">{wb.name}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stats — values scale with selected tier */}
            {d?.base_stats && Object.keys(d.base_stats).length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
                  Stats{selectedTier > 1 ? ` · T${selectedTier}` : ""}
                </p>
                <div className="space-y-1">
                  {Object.entries(d.base_stats).map(([key, base]) => {
                    const val = effectiveStat(key, base);
                    const boosted = val !== base;
                    return (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">{statLabel(key)}</span>
                        <span className={cn("font-mono", boosted ? "text-amber-400" : "text-zinc-200")}>
                          +{val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Effects */}
            {d?.effects && d.effects.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Effects</p>
                <div className="space-y-1">
                  {d.effects.map((eff, i) => (
                    <div key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                      <ChevronRight className="size-3 shrink-0 text-zinc-600 mt-px" />
                      <span>
                        {eff.value_type === "percentage" ? `+${eff.value}%` : `+${eff.value}`}{" "}
                        {statLabel(eff.attribute)} ({eff.target})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {d?.requirements && Object.keys(d.requirements).length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Requirements</p>
                <div className="space-y-1">
                  {Object.entries(d.requirements).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{statLabel(key)}</span>
                      <span className="font-mono text-zinc-300">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipe */}
            {d?.recipe && (
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Recipe</p>
                <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Skill</span>
                    <span className="text-zinc-200">{d.recipe.skill} Lv.{d.recipe.level_required}</span>
                  </div>
                  {(() => {
                    const mats = d.recipe.materials;
                    const allLoaded = mats.every((m) => materialPrices[m.hashed_item_id] !== undefined);
                    const total = allLoaded
                      ? mats.reduce((sum, m) => sum + (materialPrices[m.hashed_item_id]?.price ?? 0) * m.quantity, 0)
                      : null;
                    return (
                      <div className="border-t border-zinc-800 pt-2 space-y-2">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Materials</p>
                        {mats.map((mat) => {
                          const mp = materialPrices[mat.hashed_item_id];
                          return (
                            <div key={mat.hashed_item_id} className="flex items-center justify-between text-xs gap-2">
                              <span className="text-zinc-300 truncate">{mat.item_name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-zinc-500">×{mat.quantity}</span>
                                {mp === undefined ? (
                                  <div className="h-3 w-10 bg-zinc-800 rounded animate-pulse" />
                                ) : mp?.price != null ? (
                                  <span className="font-mono text-amber-400/70 text-[10px]">
                                    {(mp.price * mat.quantity).toLocaleString()}g
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                        {total !== null && total > 0 && (
                          <div className="flex items-center justify-between border-t border-zinc-800 pt-1.5 text-xs">
                            <span className="text-zinc-500">Total cost</span>
                            <span className="font-mono text-amber-400 font-semibold">{total.toLocaleString()}g</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {d.recipe.result && (
                    <div className="border-t border-zinc-800 pt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Produces</span>
                        <span className="text-amber-400/80">{d.recipe.result.item_name}</span>
                      </div>
                      {resultItemData === undefined ? (
                        <div className="h-3 w-3/4 bg-zinc-800 rounded animate-pulse ml-auto" />
                      ) : resultItemData ? (
                        <div className="flex items-center justify-end gap-3 text-[10px] font-mono">
                          {resultItemData.vendor_price ? (
                            <span className="text-zinc-500 flex items-center gap-1">
                              <Coins className="size-2.5" />
                              {resultItemData.vendor_price.toLocaleString()}g
                            </span>
                          ) : null}
                          {resultItemData.last_sold_price != null ? (
                            <span className="text-amber-400/70 flex items-center gap-1">
                              <span>⚖</span>
                              {resultItemData.last_sold_price.toLocaleString()}g
                            </span>
                          ) : (
                            <span className="text-zinc-700">no market data</span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Where to Find */}
            {d?.where_to_find && (
              (d.where_to_find.enemies?.length ?? 0) > 0 ||
              (d.where_to_find.dungeons?.length ?? 0) > 0 ||
              (d.where_to_find.world_bosses?.length ?? 0) > 0
            ) && (
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Where to Find</p>
                <div className="space-y-2">
                  {(d.where_to_find.enemies?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Enemies</p>
                      <div className="space-y-0.5">
                        {d.where_to_find.enemies!.map((e) => (
                          <div key={e.id} className="flex items-center justify-between text-xs">
                            <span className="text-zinc-300">{e.name}</span>
                            <span className="font-mono text-zinc-600">Lv.{e.level}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(d.where_to_find.dungeons?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Dungeons</p>
                      <div className="space-y-0.5">
                        {d.where_to_find.dungeons!.map((dungeon) => (
                          <div key={dungeon.id} className="text-xs text-zinc-300">{dungeon.name}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(d.where_to_find.world_bosses?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">World Bosses</p>
                      <div className="space-y-0.5">
                        {d.where_to_find.world_bosses!.map((wb) => (
                          <div key={wb.id} className="text-xs text-zinc-300">{wb.name}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
