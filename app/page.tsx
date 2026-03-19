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
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Image
            src="/images/logo.png"
            alt="ImmoWeb Suite"
            width={140}
            height={36}
            className="object-contain"
            priority
          />

          <div className="flex items-center gap-2">
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
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <LayoutDashboard className="size-3.5 mr-1.5" />
                  {t("nav.goToDashboard")}
                </Link>
                <SignOutButton />
              </>
            ) : (
              <>
                <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
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
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 pt-24 pb-16 text-center">
          <Badge variant="secondary" className="mb-6">
            {t("landing.badge")}
          </Badge>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent whitespace-pre-line">
            {t("landing.headline")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            {t("landing.subheadline")}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {isLoggedIn ? (
              <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }))}>
                <LayoutDashboard className="size-4 mr-2" />
                {t("nav.goToDashboard")}
              </Link>
            ) : (
              <>
                <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
                  {t("landing.cta")}
                </Link>
                <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
                  {t("landing.ctaSecondary")}
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, titleKey, descKey }) => (
              <Card key={titleKey} className="border-border/60 bg-card/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
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

      <footer className="border-t border-border/60 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          {t("landing.footer")}
        </div>
      </footer>
    </div>
  );
}
