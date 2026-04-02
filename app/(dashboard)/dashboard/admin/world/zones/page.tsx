"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminTable, type ColumnDef, type FilterDef } from "@/components/admin/AdminTable";
import { Plus, X } from "lucide-react";

type ZoneRow = {
  id: number;
  name: string;
  levelMin: number;
  levelMax: number;
  enemyCount: number;
  worldBossCount: number;
  dungeonCount: number;
  resourceCount: number;
};

type AssocItem = { id?: number; hashedId?: string; name: string; level?: number };

type ZoneDetail = {
  id: number;
  name: string;
  levelMin: number;
  levelMax: number;
  enemies:     AssocItem[];
  worldBosses: AssocItem[];
  dungeons:    AssocItem[];
  resources:   AssocItem[];
};

const COLUMNS: ColumnDef<ZoneRow>[] = [
  { key: "name",      label: "Name",         render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "levels",    label: "Levels",       render: (r) => <span className="text-xs text-muted-foreground">{r.levelMin}–{r.levelMax}</span> },
  { key: "enemies",   label: "Enemies",      render: (r) => <span className="text-xs">{r.enemyCount}</span> },
  { key: "bosses",    label: "World Bosses", render: (r) => <span className="text-xs">{r.worldBossCount}</span> },
  { key: "dungeons",  label: "Dungeons",     render: (r) => <span className="text-xs">{r.dungeonCount}</span> },
  { key: "resources", label: "Resources",    render: (r) => <span className="text-xs">{r.resourceCount}</span> },
];

const FILTERS: FilterDef[] = [
  { key: "name", label: "Search zone…", type: "search" },
];

export default function ZonesPage() {
  const [refreshKey, setRefreshKey]     = useState(0);
  const [editZone, setEditZone]         = useState<ZoneDetail | null>(null);
  const [isOpen, setIsOpen]             = useState(false);
  const [formName, setFormName]         = useState("");
  const [formLevelMin, setFormLevelMin] = useState("");
  const [formLevelMax, setFormLevelMax] = useState("");
  const [saving, setSaving]             = useState(false);
  const [pickerSearch, setPickerSearch] = useState<Record<string, string>>({});
  const [pickerResults, setPickerResults] = useState<Record<string, AssocItem[]>>({});

  function openCreate() {
    setFormName(""); setFormLevelMin(""); setFormLevelMax("");
    setEditZone(null); setIsOpen(true);
  }

  async function openEdit(row: ZoneRow) {
    const res = await fetch(`/api/admin/zones/${row.id}`);
    if (!res.ok) return;
    const detail = await res.json() as ZoneDetail;
    setFormName(detail.name);
    setFormLevelMin(String(detail.levelMin));
    setFormLevelMax(String(detail.levelMax));
    setEditZone(detail);
    setIsOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { name: formName, levelMin: Number(formLevelMin), levelMax: Number(formLevelMax) };
      if (editZone) {
        await fetch(`/api/admin/zones/${editZone.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/admin/zones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setIsOpen(false);
      setRefreshKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this zone? Associated enemies and dungeons will be unlinked.")) return;
    await fetch(`/api/admin/zones/${id}`, { method: "DELETE" });
    setRefreshKey((k) => k + 1);
  }

  async function searchPicker(type: "enemies" | "world-bosses" | "dungeons" | "items", q: string) {
    setPickerSearch((p) => ({ ...p, [type]: q }));
    if (!q) { setPickerResults((p) => ({ ...p, [type]: [] })); return; }
    const endpoint = type === "items"
      ? `/api/admin/items?name=${encodeURIComponent(q)}&pageSize=10`
      : `/api/admin/${type}?name=${encodeURIComponent(q)}`;
    const res = await fetch(endpoint);
    if (!res.ok) return;
    const json = await res.json() as { data?: unknown[] };
    const results: AssocItem[] = type === "items"
      ? (json.data ?? []).map((r) => { const row = r as { hashedId: string; name: string }; return { hashedId: row.hashedId, name: row.name }; })
      : (json.data ?? []).map((r) => { const row = r as { id: number; name: string; level?: number }; return { id: row.id, name: row.name, level: row.level }; });
    setPickerResults((p) => ({ ...p, [type]: results }));
  }

  async function refreshEditZone(id: number) {
    const res = await fetch(`/api/admin/zones/${id}`);
    if (res.ok) setEditZone(await res.json() as ZoneDetail);
  }

  async function addAssoc(type: "enemies" | "world-bosses" | "dungeons" | "resources", item: AssocItem) {
    if (!editZone) return;
    const body =
      type === "enemies"      ? { enemyId: item.id } :
      type === "world-bosses" ? { bossId: item.id } :
      type === "dungeons"     ? { dungeonId: item.id } :
      { itemHashedId: item.hashedId };
    await fetch(`/api/admin/zones/${editZone.id}/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await refreshEditZone(editZone.id);
    setPickerResults((p) => ({ ...p, [type]: [] }));
    setPickerSearch((p) => ({ ...p, [type]: "" }));
  }

  async function removeAssoc(type: "enemies" | "world-bosses" | "dungeons" | "resources", item: AssocItem) {
    if (!editZone) return;
    const body =
      type === "enemies"      ? { enemyId: item.id } :
      type === "world-bosses" ? { bossId: item.id } :
      type === "dungeons"     ? { dungeonId: item.id } :
      { itemHashedId: item.hashedId };
    await fetch(`/api/admin/zones/${editZone.id}/${type}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await refreshEditZone(editZone.id);
  }

  function AssocPanel({
    label, items, pickerType, addType,
  }: {
    label: string;
    items: AssocItem[];
    pickerType: "enemies" | "world-bosses" | "dungeons" | "items";
    addType: "enemies" | "world-bosses" | "dungeons" | "resources";
  }) {
    return (
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
        <div className="rounded-md border border-border/50 bg-muted/20 divide-y divide-border/30 min-h-[40px]">
          {items.map((item) => (
            <div key={item.id ?? item.hashedId} className="flex items-center justify-between px-2.5 py-1.5 text-sm">
              <span className="text-foreground/80">
                {item.name}
                {item.level != null && <span className="ml-1 text-xs text-muted-foreground">Lv{item.level}</span>}
              </span>
              <button onClick={() => removeAssoc(addType, item)} className="text-destructive hover:text-destructive/80 ml-2">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        {editZone && (
          <div className="relative mt-1.5">
            <Input
              placeholder={`Add ${label.toLowerCase()}…`}
              value={pickerSearch[pickerType] ?? ""}
              onChange={(e) => searchPicker(pickerType, e.target.value)}
              className="h-7 text-xs"
            />
            {(pickerResults[pickerType] ?? []).length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                {(pickerResults[pickerType] ?? []).map((r) => (
                  <button
                    key={r.id ?? r.hashedId}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => addAssoc(addType, r)}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const headerContent = (
    <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
      <Plus className="size-3.5" /> New Zone
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Zones</h1>
        <p className="text-muted-foreground text-sm">Combat zones — manage enemies, world bosses, dungeons, and resources.</p>
      </div>

      <AdminTable<ZoneRow>
        columns={COLUMNS}
        endpoint="/api/admin/zones"
        filters={FILTERS}
        pageSize={25}
        refreshKey={refreshKey}
        headerContent={headerContent}
        renderActions={(row) => (
          <div className="flex items-center gap-3">
            <button className="text-primary text-sm hover:underline" onClick={() => openEdit(row)}>Edit</button>
            <button className="text-destructive text-sm hover:underline" onClick={() => handleDelete(row.id)}>Delete</button>
          </div>
        )}
        emptyMessage="No zones yet. Create one to get started."
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editZone ? `Edit: ${editZone.name}` : "New Zone"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-[200px_1fr] gap-6 mt-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="zone-name">Name</Label>
                <Input id="zone-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Min level</Label>
                  <Input type="number" value={formLevelMin} onChange={(e) => setFormLevelMin(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max level</Label>
                  <Input type="number" value={formLevelMax} onChange={(e) => setFormLevelMax(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving || !formName} size="sm">
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
              </div>
            </div>

            {editZone ? (
              <div className="grid grid-cols-2 gap-4">
                <AssocPanel label="Enemies"      items={editZone.enemies}     pickerType="enemies"      addType="enemies" />
                <AssocPanel label="World Bosses" items={editZone.worldBosses} pickerType="world-bosses" addType="world-bosses" />
                <AssocPanel label="Dungeons"     items={editZone.dungeons}    pickerType="dungeons"     addType="dungeons" />
                <AssocPanel label="Resources"    items={editZone.resources}   pickerType="items"        addType="resources" />
              </div>
            ) : (
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                Save the zone first to add associations.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
