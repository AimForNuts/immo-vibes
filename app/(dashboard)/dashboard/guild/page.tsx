import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown, Clock, Package, Shield, ShieldAlert, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGuildActivity, getGuildMembers, type GuildActivityEntry } from "@/lib/idlemmo";
import { attachActivityToMembers } from "@/lib/domain/guild-activity";
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

function ActivityIcon({ activity }: { activity: GuildActivityEntry }) {
  const asset = activity.item ?? activity.guild_item;

  if (asset?.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={asset.image_url} alt={asset.name} className="size-full object-cover" />
    );
  }

  return <Package className="size-4 text-muted-foreground" />;
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

  const membersWithActivity = result?.ok && membersResult?.ok
    ? attachActivityToMembers(membersResult.data.members, result.data.activity)
    : [];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Guild</h1>
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
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4" />
                  Members
                </CardTitle>
              </div>
              <Badge variant={membersResult?.ok ? "default" : "outline"}>
                {membersResult?.ok ? `${membersResult.data.guild.member_count} members` : "Unavailable"}
              </Badge>
            </CardHeader>
            <CardContent>
              {!membersResult?.ok ? (
                <ErrorNotice
                  message={membersResult?.message ?? "Failed to load guild members."}
                  status={membersResult?.status}
                />
              ) : !result?.ok ? (
                <ErrorNotice
                  message={result?.message ?? "Failed to load guild activity."}
                  status={result?.status}
                />
              ) : (
                <div className="rounded-md border">
                  {membersWithActivity.map((member) => (
                    <div key={member.hashed_id ?? member.name} className="border-b last:border-b-0">
                      <div className="grid gap-3 p-3 md:grid-cols-[minmax(14rem,1fr)_auto_auto] md:items-center">
                        <div className="flex min-w-0 items-center gap-3">
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
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold">{member.name}</p>
                              <Badge variant="outline" className="text-[0.65rem]">
                                {member.position}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {member.total_level.toLocaleString()} total level
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 md:min-w-96">
                          {member.activityGroups.map((group) => (
                            <div key={group.type} className="rounded-md bg-muted/35 px-3 py-2 text-center">
                              <p className="text-sm font-semibold">{group.entries.length}</p>
                              <p className="truncate text-xs text-muted-foreground">{group.label}</p>
                            </div>
                          ))}
                        </div>

                        <Badge variant={member.activity.length > 0 ? "secondary" : "outline"}>
                          {member.activity.length} tracked
                        </Badge>
                      </div>

                      <div className="space-y-2 px-3 pb-3">
                        {member.activityGroups.map((group) => (
                          <details key={group.type} className="group rounded-md border bg-muted/20">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm">
                              <span className="font-medium">{group.label}</span>
                              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                {group.entries.length} entries
                                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                              </span>
                            </summary>

                            <div className="space-y-2 border-t p-3">
                              {group.entries.length > 0 ? (
                                group.entries.map((activity) => {
                                  const asset = activity.item ?? activity.guild_item;

                                  return (
                                    <div key={activity.id} className="flex gap-3 rounded-md bg-background p-3">
                                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                                        <ActivityIcon activity={activity} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-sm">{activity.text}</p>
                                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="size-3" />
                                            {activity.created_ago}
                                          </span>
                                        </div>
                                        {asset ? (
                                          <p className="truncate text-xs text-muted-foreground">
                                            {asset.name}
                                            {activity.value ? ` x ${activity.value.toLocaleString()}` : ""}
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-sm text-muted-foreground">No recent entries.</p>
                              )}
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
