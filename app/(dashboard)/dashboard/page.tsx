import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getPreferences } from "@/app/actions/preferences";
import { getDbCharacters, CACHE_TTL_MS } from "@/lib/services/character-cache";
import { DashboardGrid } from "@/components/dashboard-grid";
import { CharacterRoster } from "@/app/(dashboard)/dashboard/components/CharacterRoster";

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

  // Instant DB read — no API calls, page renders immediately
  const roster  = await getDbCharacters(session.user.id);
  const primary = roster.find((c) => c.isPrimary) ?? null;
  const isStale = roster.length === 0
    || (Date.now() - roster[0].cachedAt.getTime()) > CACHE_TTL_MS;

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

      {/* Character roster — client component handles background refresh when stale */}
      <CharacterRoster
        initialRoster={roster.map(({ cachedAt: _ignored, ...rest }) => rest)}
        initialIsStale={isStale}
        titleLabel={t("characters.title")}
        countTemplate={t("overview.characters", { count: "{count}" })}
        columnLabels={{
          name:     t("characters.columns.name"),
          class:    t("characters.columns.class"),
          level:    t("characters.columns.level"),
          location: t("characters.columns.location"),
          status:   t("characters.columns.status"),
        }}
        statusLabels={{
          online:  t("characters.status.online"),
          idling:  t("characters.status.idling"),
          offline: t("characters.status.offline"),
        }}
      />
    </div>
  );
}
