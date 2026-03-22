"use client";

import { Eraser, Pencil, Plus, X } from "lucide-react";
import { QUALITY_COLORS, SLOT_LABELS } from "@/lib/game-constants";
import type { GearSet, SlotKey, SlotSelection, SlotStatsMap, WeaponStyle } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSlots(style: WeaponStyle): SlotKey[] {
  const armor: SlotKey[] = ["helmet", "chestplate", "greaves", "gauntlets", "boots"];
  return style === "BOW" ? ["main_hand", ...armor] : ["main_hand", "off_hand", ...armor];
}

const STAT_LABELS_SHORT: Record<string, string> = {
  attack_power: "ATK", protection: "PROT", agility: "AGI", accuracy: "ACC",
  damage: "DMG", defence: "DEF",
};

function shortStatLabel(key: string) {
  return STAT_LABELS_SHORT[key] ?? key.replace(/_/g, " ").slice(0, 4).toUpperCase();
}

// ─── SlotCard ─────────────────────────────────────────────────────────────────

function SlotCard({
  slotKey, item, itemStats, isActive, onEdit, onTierChange, onRemove,
}: {
  slotKey: SlotKey;
  item: SlotSelection | null;
  itemStats: Record<string, number> | null;
  isActive: boolean;
  onEdit: () => void;
  onTierChange: (tier: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`border rounded-md px-3 py-2.5 transition-colors ${isActive ? "border-primary bg-primary/5" : "border-border"}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-24 shrink-0">{SLOT_LABELS[slotKey]}</span>

        {item ? (
          <>
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="size-5 object-contain shrink-0" />
            ) : (
              <div className="size-5 bg-muted rounded shrink-0" />
            )}
            <span className={`flex-1 text-sm font-medium truncate ${QUALITY_COLORS[item.quality] ?? ""}`}>
              {item.name}
            </span>
            <button onClick={onEdit} className="text-muted-foreground hover:text-foreground shrink-0">
              <Pencil className="size-3.5" />
            </button>
            <button onClick={onRemove} className="text-muted-foreground hover:text-destructive shrink-0">
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <button onClick={onEdit} className="flex-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
            <Plus className="size-3.5" /> Add item
          </button>
        )}
      </div>

      {/* Tier control */}
      {item && (
        <div className="flex items-center gap-2 mt-2 ml-[6.5rem]">
          <span className="text-xs text-muted-foreground">Tier</span>
          <input
            type="number"
            min={1}
            max={item.maxTier ?? undefined}
            value={item.tier}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1) onTierChange(v);
            }}
            className="w-10 h-6 text-xs text-center bg-background border border-border rounded px-1 tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {item.maxTier != null && (
            <>
              <span className="text-xs text-muted-foreground/50">/ {item.maxTier}</span>
              {item.tier < item.maxTier && (
                <button
                  onClick={() => onTierChange(item.maxTier!)}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  Max
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Per-item stats (shown after Compare) */}
      {item && itemStats && Object.keys(itemStats).length > 0 && (
        <div className="mt-2 ml-[6.5rem] flex flex-wrap gap-x-3 gap-y-0.5">
          {Object.entries(itemStats).map(([stat, value]) => (
            <span key={stat} className="text-[10px] font-mono text-muted-foreground">
              {shortStatLabel(stat)} <span className="text-foreground/70">+{value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GearSetPanel ─────────────────────────────────────────────────────────────

interface GearSetPanelProps {
  label:               string;
  set:                 GearSet;
  slotStats:           SlotStatsMap;
  onSlotClick:         (slot: SlotKey) => void;
  onTierChange:        (slot: SlotKey, tier: number) => void;
  onRemove:            (slot: SlotKey) => void;
  onWeaponStyleChange: (style: WeaponStyle) => void;
  onClear:             () => void;
  activePicker:        SlotKey | null;
}

export function GearSetPanel({
  label, set, slotStats, onSlotClick, onTierChange, onRemove, onWeaponStyleChange, onClear, activePicker,
}: GearSetPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Set {label}</h2>
        <button onClick={onClear} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" title="Clear all slots">
          <Eraser className="size-3.5" /> Clear
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-md w-fit text-xs">
        {(["SWORD_SHIELD", "DUAL_DAGGER", "BOW"] as WeaponStyle[]).map((style) => (
          <button
            key={style}
            onClick={() => onWeaponStyleChange(style)}
            className={`px-2.5 py-1 rounded transition-colors ${set.weaponStyle === style ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            {style === "SWORD_SHIELD" ? "Sword & Shield" : style === "DUAL_DAGGER" ? "Dual Dagger" : "Bow"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {getSlots(set.weaponStyle).map((slot) => (
          <SlotCard
            key={slot}
            slotKey={slot}
            item={set.slots[slot] ?? null}
            itemStats={slotStats[slot] ?? null}
            isActive={activePicker === slot}
            onEdit={() => onSlotClick(slot)}
            onTierChange={(tier) => onTierChange(slot, tier)}
            onRemove={() => onRemove(slot)}
          />
        ))}
      </div>
    </div>
  );
}
