import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/90">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="ImmoWeb Suite"
              width={158}
              height={40}
              className="h-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              <ArrowLeft className="size-3.5" />
              {t("nav.backHome")}
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
        <section className="hidden border-r border-border/60 bg-muted/20 px-8 py-10 lg:flex lg:flex-col lg:justify-between">
          <div />
          <div className="max-w-xl space-y-5">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("landing.badge")}
            </p>
            <h2 className="text-4xl font-semibold tracking-tight">
              {t("auth.panelTitle")}
            </h2>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              {t("auth.panelDescription")}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="font-semibold">{t("auth.panelMetricMarket")}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t("features.economy.title")}</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="font-semibold">{t("auth.panelMetricCombat")}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t("features.combat.title")}</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="font-semibold">{t("auth.panelMetricGear")}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t("nav.gear")}</div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-6">
          {children}
        </section>
      </main>
    </div>
  );
}
