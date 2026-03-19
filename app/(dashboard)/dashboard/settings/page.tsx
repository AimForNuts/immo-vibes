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

async function saveToken(formData: FormData) {
  "use server";
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const token = (formData.get("token") as string).trim();
  await db
    .update(user)
    .set({ idlemmoToken: token || null })
    .where(eq(user.id, session.user.id));
}

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const currentToken = session.user.idlemmoToken ?? "";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">IdleMMO API Token</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveToken} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="token">API Token</Label>
              <Input
                id="token"
                name="token"
                type="password"
                defaultValue={currentToken}
                placeholder="Paste your IdleMMO API token here"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Found in your IdleMMO account settings. Leave blank to remove.
              </p>
            </div>
            <Button type="submit" className="w-fit">
              Save token
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="text-sm">
            <span className="text-muted-foreground">Username: </span>
            {session.user.username ?? session.user.name}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
