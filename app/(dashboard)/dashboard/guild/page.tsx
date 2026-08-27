import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, Shield, ShieldAlert, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGuildActivity, getGuildMembers } from "@/lib/idlemmo";
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

function ErrorNotice({
  message,
  status,
}: {
  message: string;
  status?: number;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium text-destructive">{message}</p>
        {status ? <p className="text-xs text-muted-foreground">HTTP {status}</p> : null}
      </div>
    </div>
  );
}

export default async function GuildPage({ searchParams }: GuildPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const token = session.user.idlemmoToken;
  const { id } = await searchParams;
  const selectedGuild = getSelectedGuild(id);

  let result: Awaited<ReturnType<typeof getGuildActivity>> | null = null;
  let membersResult: Awaited<ReturnType<typeof getGuildMembers>> | null = null;

  if (token) {
    [result, membersResult] = await Promise.all([
      getGuildActivity(selectedGuild.id, token),
      getGuildMembers(selectedGuild.id, token),
    ]);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Guild</h1>
        <p className="text-sm text-muted-foreground">View activity and member data for the fixed YOU guilds.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {GUILDS.map((guild) => {
          const active = guild.id === selectedGuild.id;

          return (
            <Link key={guild.id} href={`/dashboard/guild?id=${guild.id}`}>
              <Card
                className={cn(
                  "relative h-full overflow-hidden transition-colors hover:border-primary/50",
                  active && "border-2 border-primary bg-primary/10 shadow-sm shadow-primary/15"
                )}
              >
                {active ? <div className="absolute inset-y-0 left-0 w-1.5 bg-primary" /> : null}
                <CardContent className="flex min-h-24 items-center gap-3 p-4 pl-5">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-md",
                      active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    )}
                  >
                    <Shield className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{guild.name}</p>
                    <p className="text-xs text-muted-foreground">Guild ID {guild.id}</p>
                  </div>
                  {active ? (
                    <Badge className="shrink-0 gap-1">
                      <Check className="size-3" />
                      Selected
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {!token ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Configure your IdleMMO API token in{" "}
              <Link href="/dashboard/settings" className="text-foreground underline underline-offset-4">
                Settings
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)]">
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
              {result?.ok ? (
                <pre className="max-h-[32rem] overflow-auto rounded-md border bg-muted/40 p-4 text-xs leading-relaxed">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              ) : (
                <ErrorNotice
                  message={result?.message ?? "Failed to load guild activity."}
                  status={result?.status}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4" />
                  Members
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  GET /v1/guild/{selectedGuild.id}/members
                </p>
              </div>
              <Badge variant={membersResult?.ok ? "default" : "outline"}>
                {membersResult?.ok ? `${membersResult.data.guild.member_count} members` : "Unavailable"}
              </Badge>
            </CardHeader>
            <CardContent>
              {membersResult?.ok ? (
                <div className="max-h-[32rem] overflow-auto rounded-md border">
                  {membersResult.data.members.map((member) => (
                    <div
                      key={member.hashed_id ?? member.name}
                      className="flex items-center gap-3 border-b p-3 last:border-b-0"
                    >
                      <div className="size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                        {member.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={member.avatar_url} alt={member.name} className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <Users className="size-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.position}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">{member.total_level.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">total level</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ErrorNotice
                  message={membersResult?.message ?? "Failed to load guild members."}
                  status={membersResult?.status}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
