import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SettingsAccountForm } from "@/components/settings-account-form";
import { saveIdleMMOSettings } from "@/app/actions/account";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const currentToken       = session.user.idlemmoToken ?? "";
  const currentCharacterId = session.user.idlemmoCharacterId ?? "";
  const currentName        = session.user.name ?? session.user.username ?? "";

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Account — name & password (client component) */}
      <SettingsAccountForm currentName={currentName} />

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("language")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{t("languageDescription")}</p>
          <LocaleSwitcher />
        </CardContent>
      </Card>

      {/* IdleMMO connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("idlemmo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveIdleMMOSettings} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="token">{t("apiToken")}</Label>
              <Input
                id="token"
                name="token"
                type="password"
                defaultValue={currentToken}
                placeholder="Paste your IdleMMO API token"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Found in your IdleMMO account settings. Leave blank to disconnect.
              </p>
            </div>

            {/* Read-only: primary character resolved from token */}
            {currentCharacterId && (
              <div className="flex flex-col gap-1.5">
                <Label>{t("characterId")}</Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted border border-border text-sm font-mono text-muted-foreground select-all">
                  {currentCharacterId}
                </div>
                <p className="text-xs text-muted-foreground">
                  Resolved automatically from your API token. Re-save the token to refresh.
                </p>
              </div>
            )}

            <Button type="submit" className="w-fit">
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
