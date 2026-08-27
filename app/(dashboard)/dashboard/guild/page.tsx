import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, Clock, Package, Shield, ShieldAlert, Users } from "lucide-react";
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
  searchParams: Promise<{ id?: string; player?: string }>;
};

function getSelectedGuild(id: string | undefined) {
  const numericId = Number(id);
  return GUILDS.find((guild) => guild.id === numericId) ?? GUILDS[0];
}

function getMemberKey(member: { hashed_id?: string; name: string }) {
  return member.hashed_id ?? member.name.toLowerCase();
}

function formatActivityType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const { id, player } = await searchParams;
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
  const selectedMember =
    membersWithActivity.find((member) => getMemberKey(member) === player) ?? membersWithActivity[0];

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
                <div className="grid gap-4 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
                  <div className="max-h-[38rem] overflow-auto rounded-md border">
                    {membersWithActivity.map((member) => {
                      const memberKey = getMemberKey(member);
                      const active = selectedMember ? memberKey === getMemberKey(selectedMember) : false;

                      return (
                        <Link
                          key={memberKey}
                          href={`/dashboard/guild?id=${selectedGuild.id}&player=${encodeURIComponent(memberKey)}`}
                          className={cn(
                            "flex items-center gap-3 border-b p-3 transition-colors last:border-b-0 hover:bg-accent",
                            active && "bg-primary/10 text-primary"
                          )}
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
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">{member.name}</p>
                              {active ? <Check className="size-3.5 shrink-0" /> : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{member.position}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold">{member.activity.length}</p>
                            <p className="text-xs text-muted-foreground">actions</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="rounded-md border">
                    {selectedMember ? (
                      <>
                        <div className="flex items-center gap-3 border-b p-4">
                          <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                            {selectedMember.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={selectedMember.avatar_url}
                                alt={selectedMember.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-muted-foreground">
                                <Users className="size-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold">{selectedMember.name}</p>
                              <Badge variant="outline" className="text-[0.65rem]">
                                {selectedMember.position}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {selectedMember.total_level.toLocaleString()} total level
                            </p>
                          </div>
                          <Badge variant="secondary">{selectedMember.activity.length} actions</Badge>
                        </div>

                        <div className="max-h-[32rem] overflow-auto p-3">
                          {selectedMember.activity.length > 0 ? (
                            <div className="space-y-2">
                              {selectedMember.activity.map((activity) => {
                                const asset = activity.item ?? activity.guild_item;

                                return (
                                  <div key={activity.id} className="flex gap-3 rounded-md bg-muted/35 p-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background">
                                      <ActivityIcon activity={activity} />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary" className="text-[0.65rem]">
                                          {formatActivityType(activity.type)}
                                        </Badge>
                                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                          <Clock className="size-3" />
                                          {activity.created_ago}
                                        </span>
                                      </div>
                                      <p className="text-sm">{activity.text}</p>
                                      {asset ? (
                                        <p className="truncate text-xs text-muted-foreground">
                                          {asset.name}
                                          {activity.value ? ` x ${activity.value.toLocaleString()}` : ""}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="rounded-md bg-muted/35 p-3 text-sm text-muted-foreground">
                              No recent activity returned for this member.
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground">No members returned for this guild.</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
