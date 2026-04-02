"use client";

import { Package, Coins, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUALITY_HEX, QUALITY_BORDER_CSS, QUALITY_GLOW_CSS } from "@/lib/game-constants";
import type { DbItem } from "../types";

// ─── Item card ────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item:     DbItem;
  selected: boolean;
  onClick:  () => void;
}

export function ItemCard({ item, selected, onClick }: ItemCardProps) {
  const qualityColor = QUALITY_HEX[item.quality]        ?? "#a1a1aa";
  const borderHover  = QUALITY_BORDER_CSS[item.quality] ?? "rgba(113,113,122,0.5)";
  const glowHover    = QUALITY_GLOW_CSS[item.quality]   ?? "transparent";

  function onEnter(e: React.MouseEvent<HTMLDivElement>) {
    if (selected) return;
    const el = e.currentTarget;
    el.style.borderColor = borderHover;
    el.style.boxShadow   = `0 0 20px -4px ${glowHover}`;
    el.style.transform   = "translateY(-2px)";
  }
  function onLeave(e: React.MouseEvent<HTMLDivElement>) {
    if (selected) return;
    const el = e.currentTarget;
    el.style.borderColor = "";
    el.style.boxShadow   = "";
    el.style.transform   = "";
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn(
        "bg-zinc-900 border rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-amber-400/50",
        selected ? "border-amber-400/60 bg-zinc-800/80" : "border-zinc-800"
      )}
      style={{
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
        ...(selected ? { borderColor: borderHover, boxShadow: `0 0 20px -4px ${glowHover}` } : {}),
      }}
    >
      {/* Image */}
      <div className="size-12 rounded-md bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="size-10 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <Package className="size-6 text-zinc-600" />
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-medium text-center leading-tight line-clamp-2 w-full" style={{ color: qualityColor }}>
        {item.name}
      </p>

      {/* Type */}
      <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium text-center">
        {item.type.replace(/_/g, "\u00a0")}
      </span>

      {/* Prices row */}
      <div className="w-full flex flex-col gap-0.5 mt-auto">
        {item.vendor_price != null && item.vendor_price > 0 ? (
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Coins className="size-2.5 shrink-0" />
            <span>{item.vendor_price.toLocaleString()}</span>
          </div>
        ) : null}

        {item.last_sold_price != null ? (
          <div className="flex items-center gap-1 text-[10px] text-amber-400/80">
            <span className="font-mono">⚖</span>
            <span>{item.last_sold_price.toLocaleString()}g</span>
          </div>
        ) : (
          <div className="text-[10px] text-zinc-700">no listings</div>
        )}

        {item.store_price != null && item.store_price > 0 ? (
          <div className="flex items-center gap-1 text-[10px] text-sky-400/70">
            <ShoppingBag className="size-2.5 shrink-0" />
            <span>{item.store_price.toLocaleString()}g</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col items-center gap-2">
      <div className="size-12 rounded-md bg-zinc-800 animate-pulse" />
      <div className="w-3/4 h-3 bg-zinc-800 rounded animate-pulse" />
      <div className="w-1/2 h-2.5 bg-zinc-800 rounded animate-pulse" />
      <div className="w-full h-2.5 bg-zinc-800 rounded animate-pulse" />
    </div>
  );
}
