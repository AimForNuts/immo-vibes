import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, ShieldAlert } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGuildActivity } from "@/lib/idlemmo";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const GUILDS = [
  { id: 4, name: "YOU" },
  { id: 697, name: "YOU Rising" },
  { id: 161, name: "YOU Unyielding" },
] as const;

type GuildPageProps = {
  searchParams: Promise<{ id?: string }>;
};

function getSelectedGuild(id: string | undefined) {
  const numericId = Number(id);
  return GUILDS.find((guild) => guild.id === numericId) ?? GUILDS[0];
}

export default async function GuildPage({ searchParams }: GuildPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const token = session.user.idlemmoToken;
  const { id } = await searchParams;
  const selectedGuild = getSelectedGuild(id);

  let result: Awaited<ReturnType<typeof getGuildActivity>> | null = null;

  if (token) {
    result = await getGuildActivity(selectedGuild.id, token);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Guild</h1>
        <p className="text-sm text-muted-foreground">
          View activity responses for the fixed YOU guilds.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {GUILDS.map((guild) => {
          const active = guild.id === selectedGuild.id;

          return (
            <Link key={guild.id} href={`/dashboard/guild?id=${guild.id}`}>
              <Card
                className={cn(
                  "h-full transition-colors hover:border-primary/50",
                  active && "border-primary bg-primary/5"
                )}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Shield className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{guild.name}</p>
                    <p className="text-xs text-muted-foreground">Guild ID {guild.id}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{selectedGuild.name} Activity</CardTitle>
            <p className="text-xs text-muted-foreground">
              GET /v1/guild/{selectedGuild.id}/activity
            </p>
          </div>
          <Badge variant={result?.ok ? "default" : "outline"}>
            {result?.ok ? "Loaded" : "Unavailable"}
          </Badge>
        </CardHeader>
        <CardContent>
          {!token ? (
            <p className="text-sm text-muted-foreground">
              Configure your IdleMMO API token in{" "}
              <Link href="/dashboard/settings" className="text-foreground underline underline-offset-4">
                Settings
              </Link>
              .
            </p>
          ) : result?.ok ? (
            <pre className="max-h-[32rem] overflow-auto rounded-md border bg-muted/40 p-4 text-xs leading-relaxed">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          ) : (
            <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">
                  {result?.message ?? "Failed to load guild activity."}
                </p>
                {result ? (
                  <p className="text-xs text-muted-foreground">HTTP {result.status}</p>
                ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
