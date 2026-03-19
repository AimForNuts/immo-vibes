import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getCharacterInfo, getAltCharacters, type CharacterDetail, type AltCharacter } from "@/lib/idlemmo";
import { getPreferences } from "@/app/actions/preferences";
import { DashboardGrid } from "@/components/dashboard-grid";
import { User, MapPin, Crown } from "lucide-react";

type AnyCharacter =
  | (CharacterDetail & { _type: "primary" })
  | (AltCharacter & { _type: "alt" });

const STATUS_CONFIG = {
  ONLINE:  { dot: "bg-emerald-500", ring: "shadow-[0_0_8px_#10b981]", labelKey: "online"  as const, text: "text-emerald-400" },
  IDLING:  { dot: "bg-amber-400",   ring: "shadow-[0_0_8px_#fbbf24]", labelKey: "idling"  as const, text: "text-amber-400"  },
  OFFLINE: { dot: "bg-zinc-600",    ring: "",                          labelKey: "offline" as const, text: "text-zinc-500"   },
} as const;

function CharacterRow({ char, index, t }: { char: AnyCharacter; index: number; t: Awaited<ReturnType<typeof getTranslations>> }) {
  const status   = char._type === "primary" ? STATUS_CONFIG[char.current_status] : null;
  const location = char._type === "primary" ? char.location?.name : null;

  return (
    <Link
      href={`/dashboard/characters/${char.hashed_id}`}
      className="group flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/50 transition-colors"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="w-4 flex justify-center shrink-0">
        <span className={`size-2 rounded-full ${status ? `${status.dot} ${status.ring}` : "bg-zinc-700"}`} />
      </div>

      <div className="size-7 rounded bg-muted shrink-0 flex items-center justify-center overflow-hidden">
        {char.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={char.image_url} alt={char.name} className="size-full object-cover" />
        ) : (
          <User className="size-3.5 text-muted-foreground/40" />
        )}
      </div>

      <div className="flex items-center gap-1.5 min-w-0 w-40 shrink-0">
        <span className="text-sm font-semibold truncate">{char.name}</span>
        {char._type === "primary" && <Crown className="size-3 text-amber-400 shrink-0" />}
      </div>

      <div className="w-24 shrink-0">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {char.class}
        </span>
      </div>

      <div className="w-20 shrink-0">
        <span className="text-[11px] font-mono text-muted-foreground">
          Lv&nbsp;<span className="text-foreground font-bold">{char.total_level}</span>
        </span>
      </div>

      <div className="flex items-center gap-1 w-40 shrink-0 min-w-0">
        {location ? (
          <>
            <MapPin className="size-3 text-muted-foreground/50 shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate">{location}</span>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground/30 font-mono">—</span>
        )}
      </div>

      <div className="ml-auto shrink-0">
        {status ? (
          <span className={`text-[11px] font-mono ${status.text}`}>
            {t(`characters.status.${status.labelKey}`)}
          </span>
        ) : (
          <span className="text-[11px] font-mono text-muted-foreground/30">—</span>
        )}
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const token  = session.user.idlemmoToken;
  const charId = session.user.idlemmoCharacterId;

  // Fetch preferences without a second session call — pass userId directly
  const prefs = await getPreferences(session.user.id);

  if (!token || !charId) {
    return (
      <div className="max-w-3xl space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("overview.title")}</h1>
        <p className="text-muted-foreground">
          {t("overview.noToken")}{" "}
          <a href="/dashboard/settings" className="underline underline-offset-4 text-foreground">
            {t("overview.goToSettings")}
          </a>
        </p>
      </div>
    );
  }

  let primary: CharacterDetail | null = null;
  let alts: AltCharacter[] = [];
  let error: string | null = null;

  try {
    // Run preferences fetch and character fetches concurrently
    // (prefs is already resolved above, so this parallelises the two IdleMMO calls)
    [primary, alts] = await Promise.all([
      getCharacterInfo(charId, token),
      getAltCharacters(charId, token),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : t("errors.loadFailed");
  }

  const characters: AnyCharacter[] = [
    ...(primary ? [{ ...primary, _type: "primary" as const }] : []),
    ...alts.map((a) => ({ ...a, _type: "alt" as const })),
  ].slice(0, 5);

  return (
    <div className="max-w-3xl space-y-10">
      {/* Heading */}
      <div className="space-y-1">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          {t("overview.title")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {primary
            ? t("overview.welcome", { name: primary.name })
            : t("overview.title")}
        </h1>
      </div>

      {/* Shortcuts grid */}
      <DashboardGrid initialLayout={prefs?.dashboardLayout ?? []} />

      {/* Character roster */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            {t("characters.title")}
          </h2>
          <span className="text-xs font-mono text-muted-foreground">
            {t("overview.characters", { count: characters.length })}
          </span>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 border-b border-border/60">
              <div className="w-4" />
              <div className="w-7" />
              <div className="w-40 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{t("characters.columns.name")}</div>
              <div className="w-24 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{t("characters.columns.class")}</div>
              <div className="w-20 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{t("characters.columns.level")}</div>
              <div className="w-40 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{t("characters.columns.location")}</div>
              <div className="ml-auto text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">{t("characters.columns.status")}</div>
            </div>
            {characters.map((char, i) => (
              <CharacterRow key={char.hashed_id} char={char} index={i} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
