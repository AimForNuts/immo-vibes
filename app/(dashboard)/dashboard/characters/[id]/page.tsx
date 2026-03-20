import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCharacterInfo } from "@/lib/idlemmo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Swords, Users } from "lucide-react";
import { STATUS_DOT_COLOR, STATUS_LABEL_KEY } from "@/lib/game-constants";

const guildPositionLabel: Record<string, string> = {
  LEADER: "Leader",
  OFFICER: "Officer",
  SOLDIER: "Soldier",
  RECRUIT: "Recruit",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const token = session.user.idlemmoToken;
  if (!token) redirect("/dashboard/settings");

  let char;
  try {
    char = await getCharacterInfo(id, token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("404")) notFound();
    return (
      <div className="max-w-2xl space-y-4">
        <BackLink />
        <p className="text-sm text-destructive">
          Failed to load character: {msg}
        </p>
      </div>
    );
  }

  const combatStats = Object.entries(char.stats ?? {});
  const skills = Object.entries(char.skills ?? {});

  return (
    <div className="max-w-2xl space-y-6">
      <BackLink />

      {/* Header card */}
      <Card className="overflow-hidden">
        {char.background_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={char.background_url}
            alt=""
            className="w-full h-24 object-cover opacity-60"
          />
        )}
        <CardContent className="flex items-start gap-4 py-4 px-4">
          {char.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={char.image_url}
              alt={char.name}
              className={`size-16 rounded-md object-cover shrink-0 ${char.background_url ? "-mt-8 ring-2 ring-background" : ""}`}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{char.name}</h1>
              <Badge variant="outline" className="capitalize">
                {char.class.toLowerCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>Total level {char.total_level}</span>
              <span className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${STATUS_DOT_COLOR[char.current_status] ?? "bg-zinc-500"}`} />
                {STATUS_LABEL_KEY[char.current_status] ?? char.current_status}
              </span>
              {char.location && <span>{char.location.name}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Combat Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Swords className="size-4" />
            Combat Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          {combatStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No combat stats available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {combatStats.map(([stat, data]) => (
                <div key={stat} className="bg-muted rounded-md px-3 py-2.5">
                  <p className="text-xs text-muted-foreground capitalize">{capitalize(stat)}</p>
                  <p className="text-lg font-bold mt-0.5">{data.level}</p>
                  <p className="text-xs text-muted-foreground">{data.experience.toLocaleString()} XP</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      {skills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {skills.map(([skill, data]) => (
                <div key={skill} className="bg-muted rounded-md px-3 py-2.5">
                  <p className="text-xs text-muted-foreground capitalize">{capitalize(skill)}</p>
                  <p className="text-lg font-bold mt-0.5">{data.level}</p>
                  <p className="text-xs text-muted-foreground">{data.experience.toLocaleString()} XP</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guild */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4" />
            Guild
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!char.guild ? (
            <p className="text-sm text-muted-foreground">Not in a guild.</p>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">[{char.guild.tag}]</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Level {char.guild.level} guild
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline">
                  {guildPositionLabel[char.guild.position] ?? char.guild.position}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {char.guild.experience.toLocaleString()} XP
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/characters"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ChevronLeft className="size-4" />
      Characters
    </Link>
  );
}
