"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminTable, type ColumnDef, type FilterDef } from "@/components/admin/AdminTable";
import { Plus, X } from "lucide-react";
import type { ZoneEnemy, ZoneDungeon, ZoneWorldBoss, ZoneSkillItem } from "@/lib/services/admin/zones.service";

type ZoneRow = {
  id: number;
  name: string;
  levelRequired: number;
  enemyCount: number;
  dungeonCount: number;
  worldBossCount: number;
  skillItemCount: number;
};

type ZoneDetail = {
  id: number;
  name: string;
  levelRequired: number;
  enemies: ZoneEnemy[];
  dungeons: ZoneDungeon[];
  worldBosses: ZoneWorldBoss[];
  skillItems: ZoneSkillItem[];
};

const COLUMNS: ColumnDef<ZoneRow>[] = [
  { key: "name",          label: "Name",         render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "levelRequired", label: "Level req.",   render: (r) => <span className="text-xs text-muted-foreground">{r.levelRequired}</span> },
  { key: "enemies",       label: "Enemies",      render: (r) => <span className="text-xs">{r.enemyCount}</span> },
  { key: "bosses",        label: "World Bosses", render: (r) => <span className="text-xs">{r.worldBossCount}</span> },
  { key: "dungeons",      label: "Dungeons",     render: (r) => <span className="text-xs">{r.dungeonCount}</span> },
  { key: "skillItems",    label: "Resources",    render: (r) => <span className="text-xs">{r.skillItemCount}</span> },
];

const FILTERS: FilterDef[] = [
  { key: "name", label: "Search zone…", type: "search" },
];

const SKILL_OPTIONS = ["woodcutting", "fishing", "mining"] as const;

export default function ZonesPage() {
  const [refreshKey, setRefreshKey]     = useState(0);
  const [editZone, setEditZone]         = useState<ZoneDetail | null>(null);
  const [isOpen, setIsOpen]             = useState(false);
  const [formName, setFormName]         = useState("");
  const [formLevel, setFormLevel]       = useState("");
  const [saving, setSaving]             = useState(false);

  // New-item form state per array type
  const [newEnemy,   setNewEnemy]   = useState({ id: "", name: "", level: "" });
  const [newBoss,    setNewBoss]    = useState({ id: "", name: "" });
  const [newDungeon, setNewDungeon] = useState({ id: "", name: "" });
  const [newSkill,   setNewSkill]   = useState({ item_hashed_id: "", skill: "woodcutting" as typeof SKILL_OPTIONS[number] });

  function openCreate() {
    setFormName(""); setFormLevel("");
    setEditZone(null); setIsOpen(true);
  }

  async function openEdit(row: ZoneRow) {
    const res = await fetch(`/api/admin/zones/${row.id}`);
    if (!res.ok) return;
    const detail = await res.json() as ZoneDetail;
    setFormName(detail.name);
    setFormLevel(String(detail.levelRequired));
    setEditZone(detail);
    setIsOpen(true);
  }

  async function patchZone(patch: Partial<Omit<ZoneDetail, "id">>) {
    if (!editZone) return;
    const res = await fetch(`/api/admin/zones/${editZone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json() as ZoneDetail;
      // Reconstruct full detail (API returns full zone from DB)
      setEditZone((prev) => prev ? { ...prev, ...updated } : null);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { name: formName, levelRequired: Number(formLevel) };
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
    if (!confirm("Delete this zone?")) return;
    await fetch(`/api/admin/zones/${id}`, { method: "DELETE" });
    setRefreshKey((k) => k + 1);
  }

  // ── Array helpers ────────────────────────────────────────────────────────────

  function addEnemy() {
    if (!editZone || !newEnemy.name) return;
    const entry: ZoneEnemy = { id: Number(newEnemy.id) || 0, name: newEnemy.name, level: Number(newEnemy.level) || 0, drops: [] };
    const updated = [...(editZone.enemies ?? []), entry];
    patchZone({ enemies: updated });
    setEditZone((z) => z ? { ...z, enemies: updated } : null);
    setNewEnemy({ id: "", name: "", level: "" });
  }

  function removeEnemy(idx: number) {
    if (!editZone) return;
    const updated = editZone.enemies.filter((_, i) => i !== idx);
    patchZone({ enemies: updated });
    setEditZone((z) => z ? { ...z, enemies: updated } : null);
  }

  function addBoss() {
    if (!editZone || !newBoss.name) return;
    const entry: ZoneWorldBoss = { id: Number(newBoss.id) || 0, name: newBoss.name, drops: [] };
    const updated = [...(editZone.worldBosses ?? []), entry];
    patchZone({ worldBosses: updated });
    setEditZone((z) => z ? { ...z, worldBosses: updated } : null);
    setNewBoss({ id: "", name: "" });
  }

  function removeBoss(idx: number) {
    if (!editZone) return;
    const updated = editZone.worldBosses.filter((_, i) => i !== idx);
    patchZone({ worldBosses: updated });
    setEditZone((z) => z ? { ...z, worldBosses: updated } : null);
  }

  function addDungeon() {
    if (!editZone || !newDungeon.name) return;
    const entry: ZoneDungeon = { id: Number(newDungeon.id) || 0, name: newDungeon.name, drops: [] };
    const updated = [...(editZone.dungeons ?? []), entry];
    patchZone({ dungeons: updated });
    setEditZone((z) => z ? { ...z, dungeons: updated } : null);
    setNewDungeon({ id: "", name: "" });
  }

  function removeDungeon(idx: number) {
    if (!editZone) return;
    const updated = editZone.dungeons.filter((_, i) => i !== idx);
    patchZone({ dungeons: updated });
    setEditZone((z) => z ? { ...z, dungeons: updated } : null);
  }

  function addSkillItem() {
    if (!editZone || !newSkill.item_hashed_id) return;
    const entry: ZoneSkillItem = { item_hashed_id: newSkill.item_hashed_id, skill: newSkill.skill };
    const updated = [...(editZone.skillItems ?? []), entry];
    patchZone({ skillItems: updated });
    setEditZone((z) => z ? { ...z, skillItems: updated } : null);
    setNewSkill({ item_hashed_id: "", skill: "woodcutting" });
  }

  function removeSkillItem(idx: number) {
    if (!editZone) return;
    const updated = editZone.skillItems.filter((_, i) => i !== idx);
    patchZone({ skillItems: updated });
    setEditZone((z) => z ? { ...z, skillItems: updated } : null);
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
        <p className="text-muted-foreground text-sm">Combat zones — enemies, world bosses, dungeons, and gatherable resources.</p>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editZone ? `Edit: ${editZone.name}` : "New Zone"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Core fields */}
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="zone-name">Name</Label>
                <Input id="zone-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Level req.</Label>
                <Input type="number" value={formLevel} onChange={(e) => setFormLevel(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !formName} size="sm">
                {saving ? "Saving…" : editZone ? "Update name/level" : "Create zone"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
            </div>

            {editZone && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                {/* Enemies */}
                <ArrayPanel label="Enemies" count={editZone.enemies.length}>
                  {editZone.enemies.map((e, i) => (
                    <ArrayRow key={i} label={`${e.name} (Lv${e.level})`} onRemove={() => removeEnemy(i)} />
                  ))}
                  <div className="flex gap-1 mt-2">
                    <Input placeholder="ID" value={newEnemy.id} onChange={(ev) => setNewEnemy((p) => ({ ...p, id: ev.target.value }))} className="h-7 text-xs w-16" />
                    <Input placeholder="Name" value={newEnemy.name} onChange={(ev) => setNewEnemy((p) => ({ ...p, name: ev.target.value }))} className="h-7 text-xs" />
                    <Input placeholder="Lv" value={newEnemy.level} onChange={(ev) => setNewEnemy((p) => ({ ...p, level: ev.target.value }))} className="h-7 text-xs w-14" />
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={addEnemy}><Plus className="size-3" /></Button>
                  </div>
                </ArrayPanel>

                {/* World Bosses */}
                <ArrayPanel label="World Bosses" count={editZone.worldBosses.length}>
                  {editZone.worldBosses.map((b, i) => (
                    <ArrayRow key={i} label={b.name} onRemove={() => removeBoss(i)} />
                  ))}
                  <div className="flex gap-1 mt-2">
                    <Input placeholder="ID" value={newBoss.id} onChange={(ev) => setNewBoss((p) => ({ ...p, id: ev.target.value }))} className="h-7 text-xs w-16" />
                    <Input placeholder="Name" value={newBoss.name} onChange={(ev) => setNewBoss((p) => ({ ...p, name: ev.target.value }))} className="h-7 text-xs" />
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={addBoss}><Plus className="size-3" /></Button>
                  </div>
                </ArrayPanel>

                {/* Dungeons */}
                <ArrayPanel label="Dungeons" count={editZone.dungeons.length}>
                  {editZone.dungeons.map((d, i) => (
                    <ArrayRow key={i} label={d.name} onRemove={() => removeDungeon(i)} />
                  ))}
                  <div className="flex gap-1 mt-2">
                    <Input placeholder="ID" value={newDungeon.id} onChange={(ev) => setNewDungeon((p) => ({ ...p, id: ev.target.value }))} className="h-7 text-xs w-16" />
                    <Input placeholder="Name" value={newDungeon.name} onChange={(ev) => setNewDungeon((p) => ({ ...p, name: ev.target.value }))} className="h-7 text-xs" />
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={addDungeon}><Plus className="size-3" /></Button>
                  </div>
                </ArrayPanel>

                {/* Skill Items */}
                <ArrayPanel label="Skill Resources" count={editZone.skillItems.length}>
                  {editZone.skillItems.map((s, i) => (
                    <ArrayRow key={i} label={`${s.item_hashed_id} (${s.skill})`} onRemove={() => removeSkillItem(i)} />
                  ))}
                  <div className="flex gap-1 mt-2">
                    <Input placeholder="hashed_id" value={newSkill.item_hashed_id} onChange={(ev) => setNewSkill((p) => ({ ...p, item_hashed_id: ev.target.value }))} className="h-7 text-xs" />
                    <select
                      value={newSkill.skill}
                      onChange={(ev) => setNewSkill((p) => ({ ...p, skill: ev.target.value as typeof SKILL_OPTIONS[number] }))}
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    >
                      {SKILL_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={addSkillItem}><Plus className="size-3" /></Button>
                  </div>
                </ArrayPanel>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArrayPanel({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
        {label} <span className="text-muted-foreground/50">({count})</span>
      </div>
      <div className="rounded-md border border-border/50 bg-muted/20 min-h-[40px] p-2 space-y-1">
        {children}
      </div>
    </div>
  );
}

function ArrayRow({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground/80 truncate">{label}</span>
      <button onClick={onRemove} className="ml-2 text-destructive hover:text-destructive/80 shrink-0">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
