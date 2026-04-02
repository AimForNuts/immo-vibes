"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminTable, type ColumnDef, type FilterDef } from "@/components/admin/AdminTable";

type CharacterRow = { id: number; hashedId: string; name: string; class: string };
type UserRow = {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  role: string;
  characters: CharacterRow[];
};

const COLUMNS: ColumnDef<UserRow>[] = [
  {
    key: "name",
    label: "User",
    render: (r) => (
      <span className="font-medium">
        {r.username ?? r.name}
        <span className="ml-2 text-xs text-muted-foreground rounded-full border border-border px-1.5 py-0.5">
          {r.characters.length} char{r.characters.length !== 1 ? "s" : ""}
        </span>
      </span>
    ),
  },
  { key: "email", label: "Email", render: (r) => <span className="text-sm text-muted-foreground">{r.email ?? "—"}</span> },
  { key: "role",  label: "Role",  render: (r) => <span className={`text-xs ${r.role === "admin" ? "text-primary" : "text-muted-foreground"}`}>{r.role}</span> },
];

const FILTERS: FilterDef[] = [
  { key: "search", label: "Search user or email…", type: "search" },
  {
    key: "role",
    label: "All roles",
    type: "select",
    options: [{ value: "admin", label: "Admin" }, { value: "user", label: "User" }],
  },
];

export default function UsersPage() {
  const [refreshKey, setRefreshKey]       = useState(0);
  const [editUser, setEditUser]           = useState<UserRow | null>(null);
  const [editEmail, setEditEmail]         = useState("");
  const [editPassword, setEditPassword]   = useState("");
  const [saving, setSaving]               = useState(false);
  const [saveMsg, setSaveMsg]             = useState<{ ok: boolean; text: string } | null>(null);

  function openEdit(u: UserRow) {
    setEditUser(u);
    setEditEmail(u.email ?? "");
    setEditPassword("");
    setSaveMsg(null);
  }

  async function handleSave() {
    if (!editUser) return;
    setSaving(true); setSaveMsg(null);
    try {
      const body: Record<string, string> = {};
      if (editEmail !== (editUser.email ?? "")) body.email = editEmail;
      if (editPassword) body.newPassword = editPassword;
      if (Object.keys(body).length === 0) { setSaveMsg({ ok: true, text: "Nothing changed." }); return; }

      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveMsg({ ok: true, text: "Saved." });
      setRefreshKey((k) => k + 1);
    } catch {
      setSaveMsg({ ok: false, text: "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user and all their characters? This cannot be undone.")) return;
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setRefreshKey((k) => k + 1);
  }

  async function handleDissociate(userId: string, characterId: number, searchKey: string) {
    if (!confirm("Remove this character from the user's account?")) return;
    await fetch(`/api/admin/users/${userId}/characters/${characterId}`, { method: "DELETE" });
    setRefreshKey((k) => k + 1);
    if (editUser?.id === userId) {
      const res = await fetch(`/api/admin/users?page=1&pageSize=1&search=${encodeURIComponent(searchKey)}`);
      const json = await res.json() as { data?: UserRow[] };
      if (json.data?.[0]) setEditUser(json.data[0]);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">User accounts and associated characters.</p>
      </div>

      <AdminTable<UserRow>
        columns={COLUMNS}
        endpoint="/api/admin/users"
        filters={FILTERS}
        pageSize={25}
        refreshKey={refreshKey}
        expandedKey="id"
        renderExpanded={(row) => (
          <div className="space-y-1">
            <div className="grid grid-cols-[140px_100px_1fr_80px] text-xs text-muted-foreground pb-1 border-b border-border/30">
              <span>Name</span><span>Class</span><span>Hashed ID</span><span className="text-right">Action</span>
            </div>
            {row.characters.length === 0 ? (
              <div className="text-xs text-muted-foreground py-1">No characters linked.</div>
            ) : (
              row.characters.map((c) => (
                <div key={c.id} className="grid grid-cols-[140px_100px_1fr_80px] text-sm items-center py-0.5">
                  <span className="font-medium text-sm">{c.name}</span>
                  <span className="text-muted-foreground text-xs">{c.class}</span>
                  <span className="font-mono text-xs text-muted-foreground/60">{c.hashedId}</span>
                  <button
                    className="text-right text-xs text-destructive hover:underline"
                    onClick={() => handleDissociate(row.id, c.id, row.email ?? row.name)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        renderActions={(row) => (
          <div className="flex items-center gap-3">
            <button className="text-primary text-sm hover:underline" onClick={() => openEdit(row)}>Edit</button>
            <button className="text-destructive text-sm hover:underline" onClick={() => handleDelete(row.id)}>Delete</button>
          </div>
        )}
        emptyMessage="No users found."
      />

      <Dialog open={editUser !== null} onOpenChange={(open) => !open && setEditUser(null)}>
        {editUser && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit User: {editUser.username ?? editUser.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  type="password"
                  placeholder="Leave blank to keep current"
                />
              </div>
              {saveMsg && (
                <p className={`text-xs ${saveMsg.ok ? "text-green-500" : "text-destructive"}`}>{saveMsg.text}</p>
              )}
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
