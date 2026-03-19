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

  const currentToken = session.user.idlemmoToken ?? "";
  const currentCharacterId = session.user.idlemmoCharacterId ?? "";
  const currentName = session.user.name ?? session.user.username ?? "";

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
                Found in your IdleMMO account settings. Leave blank to remove.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="characterId">{t("characterId")}</Label>
              <Input
                id="characterId"
                name="characterId"
                type="text"
                defaultValue={currentCharacterId}
                placeholder="e.g. c1234567890"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Enable <strong>Show Hashed IDs</strong> in your IdleMMO account settings,
                then copy the hashed ID from any character&apos;s profile page.
              </p>
            </div>
            <Button type="submit" className="w-fit">
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
