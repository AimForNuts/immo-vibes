"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { updateDisplayName } from "@/app/actions/account";
import { changePassword, signOut } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  currentName: string;
}

export function SettingsAccountForm({ currentName }: Props) {
  const t = useTranslations("settings");
  const router = useRouter();

  // Name
  const [name, setName] = useState(currentName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Password
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setNameSaving(true);
    setNameMsg(null);
    try {
      await updateDisplayName(name);
      setNameMsg({ ok: true, text: t("saved") });
      router.refresh();
    } catch (err) {
      setNameMsg({ ok: false, text: err instanceof Error ? err.message : t("errors.generic") });
    } finally {
      setNameSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPwdSaving(true);
    setPwdMsg(null);
    try {
      const { error } = await changePassword({
        currentPassword: currentPwd,
        newPassword: newPwd,
        revokeOtherSessions: true,
      });
      if (error) throw new Error(error.message ?? t("saveFailed"));
      // Sign out — changing password revokes all sessions
      await signOut();
      router.push("/");
    } catch (err) {
      setPwdMsg({ ok: false, text: err instanceof Error ? err.message : t("saveFailed") });
      setPwdSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Display name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("account")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNameSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {nameMsg && (
              <p className={`text-sm ${nameMsg.ok ? "text-emerald-500" : "text-destructive"}`}>
                {nameMsg.text}
              </p>
            )}
            <Button type="submit" disabled={nameSaving} className="w-fit">
              {nameSaving ? t("saving") : t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("password")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-amber-500 mb-4">{t("authChangeWarning")}</p>
          <form onSubmit={handlePasswordSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPwd">{t("currentPassword")}</Label>
              <Input
                id="currentPwd"
                type="password"
                autoComplete="current-password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPwd">{t("newPassword")}</Label>
              <Input
                id="newPwd"
                type="password"
                autoComplete="new-password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                minLength={8}
                required
              />
            </div>
            {pwdMsg && (
              <p className={`text-sm ${pwdMsg.ok ? "text-emerald-500" : "text-destructive"}`}>
                {pwdMsg.text}
              </p>
            )}
            <Button type="submit" disabled={pwdSaving} className="w-fit">
              {pwdSaving ? t("saving") : t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
