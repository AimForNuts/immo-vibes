import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

async function saveSettings(formData: FormData) {
  "use server";
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const token = (formData.get("token") as string).trim();
  const characterId = (formData.get("characterId") as string).trim();

  await db
    .update(user)
    .set({
      idlemmoToken: token || null,
      idlemmoCharacterId: characterId || null,
    })
    .where(eq(user.id, session.user.id));
}

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const currentToken = session.user.idlemmoToken ?? "";
  const currentCharacterId = session.user.idlemmoCharacterId ?? "";

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">IdleMMO Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveSettings} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="token">API Token</Label>
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
              <Label htmlFor="characterId">Primary Character ID</Label>
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
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            <span className="text-muted-foreground">Username: </span>
            {session.user.username ?? session.user.name}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
