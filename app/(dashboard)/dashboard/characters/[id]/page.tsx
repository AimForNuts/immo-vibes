import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCharacterInfo } from "@/lib/idlemmo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Swords, Users, Zap } from "lucide-react";
import { STATUS_DOT_COLOR, STATUS_LABEL_KEY, CHAR_STAT_MAP } from "@/lib/game-constants";

// ─── Skill icon mapping ────────────────────────────────────────────────────────
// Icons sourced from cdn.idle-mmo.com — keys are normalized lowercase with
// spaces (no underscores) to match the API's skill key format.

const CDN = "https://cdn.idle-mmo.com/cdn-cgi/image/width=150,height=150,format=auto/uploaded/skins/";
const STAT_CDN = "https://cdn.idle-mmo.com/cdn-cgi/image/width=120,height=120,format=auto/https://cdn.idle-mmo.com/stats/";

const SKILL_ICONS: Record<string, string> = {
  "woodcutting":        CDN + "DKC4LgMAyoUlDmo99LJOVbtUZsezIi-metad29vZGN1dHRpbmcucG5n-.png",
  "mining":             CDN + "CwqOzwaWgR9ooe0BVEpgtKCAduFpka-metabWluaW5nLnBuZw==-.png",
  "fishing":            CDN + "aFjVlrHK2um38ufObrBRXGOZOxGHsj-metaZmlzaGluZy5wbmc=-.png",
  "alchemy":            CDN + "tMKfSVT7ZSbPwMxEIKmulq1B7lFIYZ-metaYWxjaGVteS5wbmc=-.png",
  "smelting":           CDN + "01HMV8CSV9P697HRCPBMQMY6VA.png",
  "cooking":            CDN + "wI2XxGzeSRX6AFMRUADAnKji9NgOIK-metaY29va2luZy5wbmc=-.png",
  "forge":              CDN + "tuVX8BVjiz53PoeSWF1KJ26OTEOoZI-metaaDkucG5n-.png",
  "shadow mastery":     CDN + "2DKOpVK1LsY1jwOER6tfuBfPGTDXHF-metacHVtcGtpbjMucG5n-.png",
  "bartering":          CDN + "Druis2lTKqmbl8YmDDVCy2TaYFl430-metaYmFydGVyaW5nLnBuZw==-.png",
  "hunting mastery":    CDN + "ryXY3r3TY70wWquLMMZ7idvKVR19GS-metaaHVudGluZy1pbWFnZS5wbmc=-.png",
  "yule mastery":       CDN + "OXBGDWcgUce8zFwEUocxz59E6uABq9-metac25vd21hbi5wbmc=-.png",
  "springtide mastery": CDN + "01HT2CH8GYGB22Q6RJ5XK7SQ06.png",
  "combat":             CDN + "1eJxBXb1BOJuZpUr2sL3NwaWOV3Gr0-metadGluLXN3b3JkLnBuZw==-.png",
  "dungeoneering":      CDN + "01JWDZ1HDVERM6KWR6RQ52WQ4T.png",
  "pet mastery":        CDN + "ByGAnT8nNgP0noQicPXr4mhgv1Ux6f-metaZHJhZ29uIDEucG5n-.png",
  "guild mastery":      CDN + "01HQQJQD8BME4JCHG9H879XM0Q.png",
  "lunar mastery":      CDN + "01J30CC0VYJB7E0BKVB06A2R6V.png",
  "meditation":         CDN + "01JQ6Z12W4GN3T7S1Q216R91XM.png",
  "construction":       CDN + "01KKC4957R5E3FS80BC3NDW8ND.png",
};

/** Normalize an API skill key to the lookup format used in SKILL_ICONS. */
function normalizeSkillKey(key: string) {
  return key.toLowerCase().replace(/[-_]/g, " ");
}

/** Title-case a skill name for display (e.g. "shadow mastery" → "Shadow Mastery"). */
function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const guildPositionLabel: Record<string, string> = {
  LEADER: "Leader",
  OFFICER: "Officer",
  SOLDIER: "Soldier",
  RECRUIT: "Recruit",
};

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

  const primaryStats = Object.entries(char.stats ?? {});
  const skills = Object.entries(char.skills ?? {});
  const combatLevel = char.stats?.combat?.level ?? null;

  // Derived combat stats from primary stat levels (base only, no gear)
  const combatPower = Object.entries(CHAR_STAT_MAP)
    .map(([statKey, mapping]) => {
      const statData = char.stats?.[statKey];
      const base = statData ? Math.floor(statData.level * mapping.multiplier) : 0;
      return { ...mapping, base };
    })
    .filter((s) => s.base > 0);

  return (
    <div className="max-w-3xl space-y-6">
      <BackLink />

      {/* Header */}
      <Card className="overflow-hidden">
        {/* Banner + portrait composite */}
        <div className="relative h-48">
          {/* Background */}
          {char.background_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={char.background_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
          )}
          {/* Bottom gradient fade into card */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
          {/* Right-side fade so text stays readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-card/80" />

          {/* Character portrait anchored to bottom-left, tall enough to overflow */}
          {char.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={char.image_url}
              alt={char.name}
              className="absolute bottom-0 left-6 h-52 w-auto object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)]"
            />
          )}

          {/* Name + level badges — bottom-right of banner */}
          <div className="absolute bottom-4 right-5 flex flex-col items-end gap-2">
            <h1 className="text-2xl font-bold text-yellow-400 drop-shadow-sm">
              {char.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {combatLevel !== null && (
                <span className="inline-flex items-center rounded-md bg-black/60 border border-white/10 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur-sm">
                  Combat Level&nbsp;<span className="text-yellow-400">{combatLevel}</span>
                </span>
              )}
              <span className="inline-flex items-center rounded-md bg-black/60 border border-white/10 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur-sm">
                Total Level&nbsp;<span className="text-yellow-400">{char.total_level}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Sub-header row: class, pet, status, location */}
        <CardContent className="py-3 px-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">
              {char.class.toLowerCase()}
            </Badge>
            {char.equipped_pet && (
              <Badge variant="secondary" className="gap-1.5 text-xs">
                {char.equipped_pet.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={char.equipped_pet.image_url}
                    alt=""
                    className="size-3.5 object-contain rounded-sm"
                  />
                )}
                {char.equipped_pet.name} Lv.{char.equipped_pet.level}
              </Badge>
            )}
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground ml-auto">
              <span
                className={`size-2 rounded-full ${
                  STATUS_DOT_COLOR[char.current_status] ?? "bg-zinc-500"
                }`}
              />
              {STATUS_LABEL_KEY[char.current_status] ?? char.current_status}
            </span>
            {char.location && (
              <span className="text-sm text-muted-foreground">{char.location.name}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Primary Stats */}
      {primaryStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Swords className="size-4" />
              Primary Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {primaryStats.map(([stat, data]) => (
                <div
                  key={stat}
                  className="bg-muted/60 rounded-lg px-3 py-3 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${STAT_CDN}${stat}.png`}
                      alt={stat}
                      className="size-8 object-contain shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground leading-tight">
                        {titleCase(stat)}
                      </p>
                      <p className="text-lg font-bold leading-tight">
                        {data.level >= 100 ? (
                          <span className="text-yellow-500">100</span>
                        ) : (
                          data.level
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                      style={{ width: `${Math.min(100, data.level)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {data.experience.toLocaleString()} XP
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Base Combat Power */}
      {combatPower.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="size-4" />
              Base Combat Power
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                stats only · no gear
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {combatPower.map((s) => (
                <div key={s.key} className="bg-muted/60 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">{s.skillLabel}</p>
                  <p className="text-2xl font-bold tabular-nums mt-0.5">{s.base}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.combatLabel}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {skills.map(([skill, data]) => {
                const normalized = normalizeSkillKey(skill);
                const iconUrl = SKILL_ICONS[normalized];
                return (
                  <div
                    key={skill}
                    className="relative rounded-lg bg-muted/60 border border-border/40 flex flex-col items-center justify-center py-2 px-1.5 gap-1"
                    title={titleCase(normalized)}
                  >
                    <span className="absolute -top-2 -right-2 inline-flex items-center rounded-md bg-background border border-border/60 px-1.5 py-0.5 text-[10px] font-medium z-10">
                      {data.level >= 100 ? (
                        <span className="text-yellow-500 font-bold">{data.level}</span>
                      ) : (
                        <span className="text-muted-foreground">{data.level}</span>
                      )}
                    </span>
                    {iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={iconUrl}
                        alt={titleCase(normalized)}
                        className="size-10 object-contain"
                      />
                    ) : (
                      <div className="size-10 rounded bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          {titleCase(normalized).charAt(0)}
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2">
                      {titleCase(normalized)}
                    </p>
                  </div>
                );
              })}
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
