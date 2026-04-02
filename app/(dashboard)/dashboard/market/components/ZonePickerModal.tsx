"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import type { DbItem } from "../types";

interface Zone { id: number; name: string; }

interface ZonePickerModalProps {
  item:    DbItem;
  onClose: () => void;
}

export function ZonePickerModal({ item, onClose }: ZonePickerModalProps) {
  const [zones,    setZones]    = useState<Zone[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/zones?slim=true").then((r) => r.json()),
      fetch(`/api/items/${item.hashed_id}/zones`).then((r) => r.json()),
    ])
      .then(([zonesData, itemZonesData]: [{ zones: Zone[] }, { zone_ids: number[] }]) => {
        setZones(zonesData.zones);
        setSelected(new Set(itemZonesData.zone_ids));
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load zones.");
        setLoading(false);
      });
  }, [item.hashed_id]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${item.hashed_id}/zones`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone_ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error("Save failed");
      onClose();
    } catch {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-80 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100">Zone Availability</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 truncate">{item.name}</p>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
            {zones.map((zone) => (
              <label
                key={zone.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(zone.id)}
                  onChange={() => toggle(zone.id)}
                  className="accent-indigo-500 size-3.5"
                />
                <span className="text-sm text-zinc-200">{zone.name}</span>
              </label>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
