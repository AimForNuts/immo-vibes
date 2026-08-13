import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  Coins,
  KeyRound,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Swords,
  TrendingUp,
} from "lucide-react";

export default async function LandingPage() {
  const t = await getTranslations();
  const session = await auth.api.getSession({ headers: await headers() });
  const isLoggedIn = !!session;

  const features = [
    { icon: BarChart3,   titleKey: "features.dashboard.title" as const, descKey: "features.dashboard.description" as const },
    { icon: TrendingUp,  titleKey: "features.skills.title" as const,    descKey: "features.skills.description" as const },
    { icon: Coins,       titleKey: "features.economy.title" as const,   descKey: "features.economy.description" as const },
    { icon: Swords,      titleKey: "features.combat.title" as const,    descKey: "features.combat.description" as const },
    { icon: ShieldCheck, titleKey: "features.secure.title" as const,    descKey: "features.secure.description" as const },
    { icon: KeyRound,    titleKey: "features.token.title" as const,     descKey: "features.token.description" as const },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Image
            src="/images/logo.png"
            alt="ImmoWeb Suite"
            width={180}
            height={46}
            className="h-auto object-contain"
            priority
          />

          <div className="flex items-center gap-1.5 sm:gap-2">
            <LocaleSwitcher />
            <ThemeToggle />

            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard/settings"
                  title={t("nav.settings")}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "size-9"
                  )}
                >
                  <Settings className="size-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}
                >
                  <LayoutDashboard className="size-3.5 mr-1.5" />
                  {t("nav.goToDashboard")}
                </Link>
                <SignOutButton />
              </>
            ) : (
              <>
                <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
                  {t("nav.signIn")}
                </Link>
                <Link href="/register" className={cn(buttonVariants({ size: "sm" }))}>
                  {t("nav.getStarted")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b border-border/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] md:items-center md:py-20">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-5">
                {t("landing.badge")}
              </Badge>
              <h1 className="max-w-3xl whitespace-pre-line text-4xl font-semibold tracking-tight sm:text-5xl">
                {t("landing.headline")}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                {t("landing.subheadline")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {isLoggedIn ? (
                  <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }))}>
                    <LayoutDashboard className="size-4" />
                    {t("nav.goToDashboard")}
                  </Link>
                ) : (
                  <>
                    <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
                      {t("landing.cta")}
                      <ArrowRight className="size-4" />
                    </Link>
                    <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
                      {t("landing.ctaSecondary")}
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xl shadow-black/5">
              <div className="border-b border-border/70 pb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t("landing.snapshotTitle")}</span>
                  <span className="text-muted-foreground">{t("landing.snapshotStatus")}</span>
                </div>
              </div>
              <div className="grid gap-3 pt-4">
                <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md bg-muted/45 p-3">
                  <span className="text-sm text-muted-foreground">{t("features.economy.title")}</span>
                  <span className="text-sm font-semibold">{t("landing.snapshotMarket")}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md bg-muted/45 p-3">
                  <span className="text-sm text-muted-foreground">{t("features.combat.title")}</span>
                  <span className="text-sm font-semibold">{t("landing.snapshotCombat")}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md bg-muted/45 p-3">
                  <span className="text-sm text-muted-foreground">{t("nav.forgePlanner")}</span>
                  <span className="text-sm font-semibold">{t("landing.snapshotForge")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-6 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight">{t("landing.featuresTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("landing.featuresDescription")}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, titleKey, descKey }) => (
              <Card key={titleKey} className="rounded-lg border-border/60 bg-card/70">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{t(titleKey)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t(descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-5">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          {t("landing.footer")}
        </div>
      </footer>
    </div>
  );
}
