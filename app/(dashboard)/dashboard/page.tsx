import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getPreferences } from "@/app/actions/preferences";
import { getCachedCharacters, type CachedCharacter } from "@/lib/services/character-cache";
import { DashboardGrid } from "@/components/dashboard-grid";
import { User, MapPin, Crown } from "lucide-react";

const STATUS_CONFIG = {
  ONLINE:  { dot: "bg-emerald-500", ring: "shadow-[0_0_8px_#10b981]", labelKey: "online"  as const, text: "text-emerald-400" },
  IDLING:  { dot: "bg-amber-400",   ring: "shadow-[0_0_8px_#fbbf24]", labelKey: "idling"  as const, text: "text-amber-400"  },
  OFFLINE: { dot: "bg-zinc-600",    ring: "",                          labelKey: "offline" as const, text: "text-zinc-500"   },
} as const;

function CharacterRow({ char, index, t }: { char: CachedCharacter; index: number; t: Awaited<ReturnType<typeof getTranslations>> }) {
  const statusKey = char.currentStatus as keyof typeof STATUS_CONFIG | null;
  const status    = statusKey && statusKey in STATUS_CONFIG ? STATUS_CONFIG[statusKey] : null;

  return (
    <Link
      href={`/dashboard/characters/${char.hashedId}`}
      className="group flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/50 transition-colors"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="w-4 flex justify-center shrink-0">
        <span className={`size-2 rounded-full ${status ? `${status.dot} ${status.ring}` : "bg-zinc-700"}`} />
      </div>

      <div className="size-7 rounded bg-muted shrink-0 flex items-center justify-center overflow-hidden">
        {char.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={char.imageUrl} alt={char.name} className="size-full object-cover" />
        ) : (
          <User className="size-3.5 text-muted-foreground/40" />
        )}
      </div>

      <div className="flex items-center gap-1.5 min-w-0 w-40 shrink-0">
        <span className="text-sm font-semibold truncate">{char.name}</span>
        {char.isPrimary && <Crown className="size-3 text-amber-400 shrink-0" />}
      </div>

      <div className="w-24 shrink-0">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {char.class}
        </span>
      </div>

      <div className="w-20 shrink-0">
        <span className="text-[11px] font-mono text-muted-foreground">
          Lv&nbsp;<span className="text-foreground font-bold">{char.totalLevel}</span>
        </span>
      </div>

      <div className="flex items-center gap-1 w-40 shrink-0 min-w-0">
        {char.locationName ? (
          <>
            <MapPin className="size-3 text-muted-foreground/50 shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate">{char.locationName}</span>
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

  const roster = await getCachedCharacters(session.user.id, charId, token);
  const primary = roster.find((c) => c.isPrimary) ?? null;

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
            {t("overview.characters", { count: roster.length })}
          </span>
        </div>

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
          {roster.length > 0 ? (
            roster.map((char, i) => (
              <CharacterRow key={char.hashedId} char={char} index={i} t={t} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground px-4 py-6">No characters found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
