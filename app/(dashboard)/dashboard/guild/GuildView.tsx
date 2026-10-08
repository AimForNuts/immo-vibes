"use client";

import Link from "next/link";
import { Check, ChevronDown, Clock, Package, Shield, ShieldAlert, Users } from "lucide-react";
import type { GuildActivityEntry } from "@/lib/idlemmo";
import { useGuildActivity } from "./hooks/useGuildActivity";
import { attachActivityToMembers } from "@/lib/domain/guild-activity";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GuildChallengeCostCalculator } from "./components/GuildChallengeCostCalculator";

const GUILDS = [
  { id: 4, name: "YOU" },
  { id: 697, name: "YOU Rising" },
  { id: 161, name: "YOU Unyielding" },
] as const;

type GuildViewProps = { keyId: string | null; guildId: number; };

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

export default function GuildView({ keyId, guildId }: GuildViewProps) {
  const selectedGuild = getSelectedGuild(String(guildId));
  const { snapshot, loading, error } = useGuildActivity(keyId, guildId);
  const membersWithActivity = attachActivityToMembers(snapshot?.members?.members ?? [], snapshot?.activity ?? []);

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

      {!keyId ? (
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
          <GuildChallengeCostCalculator />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4" />
                  Members
                </CardTitle>
              </div>
              <Badge variant={snapshot?.members ? "default" : "outline"}>
                {snapshot?.members ? `${snapshot.members.guild.member_count} members` : loading ? "Loading" : "Unavailable"}
              </Badge>
            </CardHeader>
            <CardContent>
              {error ? (
                <div role="status" className="fixed bottom-14 right-4 z-50 max-w-sm">
                  <ErrorNotice message={error} />
                </div>
              ) : null}
              {loading || snapshot?.nextPage !== null && snapshot?.members ? (
                <p role="status" className="mb-3 text-sm text-muted-foreground">
                  {snapshot?.members
                    ? loading ? "Loading activity history. Counts are incomplete." : "Activity history is incomplete."
                    : "Loading guild members..."}
                </p>
              ) : null}
              {snapshot?.members ? (
                <div className="rounded-md border">
                  {membersWithActivity.map((member) => (
                    <details key={member.hashed_id ?? member.name} className="group border-b last:border-b-0">
                      <summary className="grid cursor-pointer list-none gap-3 p-3 md:grid-cols-[minmax(13rem,1fr)_minmax(16rem,auto)_auto] md:items-center">
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

                        <div className="grid grid-cols-3 gap-2">
                          {member.activityGroups.map((group) => (
                            <div key={group.type} className="rounded-md bg-muted/35 px-3 py-2 text-center">
                              <p className="text-sm font-semibold">{group.entries.length}</p>
                              <p className="truncate text-xs text-muted-foreground">{group.label}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <Badge variant={member.activity.length > 0 ? "secondary" : "outline"}>
                            {member.activity.length} tracked
                          </Badge>
                          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                        </div>
                      </summary>

                      <div className="space-y-2 border-t bg-muted/10 px-3 py-3">
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
                    </details>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
