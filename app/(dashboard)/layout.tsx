"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Swords, Settings, ShieldCheck, Skull, Sword, ShoppingBag } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { CharactersNav } from "@/components/characters-nav";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("nav");
  const isAdmin = session?.user?.role === "admin";

  const navItems = [
    { href: "/dashboard",          label: t("overview"),  icon: LayoutDashboard },
    { href: "/dashboard/gear",     label: t("gear"),      icon: Swords },
    { href: "/dashboard/dungeons", label: t("dungeons"),  icon: Skull },
    { href: "/dashboard/combat",   label: t("combat"),    icon: Sword },
    { href: "/dashboard/market",   label: t("market"),    icon: ShoppingBag },
  ];

  function NavLink({ href, label, icon: Icon }: typeof navItems[number]) {
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
          pathname === href
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <Icon className="size-4 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-border flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-border">
          {/* Logo always goes to landing page */}
          <Link href="/">
            <Image
              src="/images/logo.png"
              alt="ImmoWeb Suite"
              width={160}
              height={40}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
          <NavLink key={navItems[0].href} {...navItems[0]} />

          {/* Characters with expandable sub-nav */}
          <CharactersNav />

          {navItems.slice(1).map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mt-2",
                pathname === "/dashboard/admin"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <ShieldCheck className="size-4 shrink-0" />
              {t("admin")}
            </Link>
          )}
        </nav>
      </aside>

      {/* Right column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — same controls as landing page for consistency */}
        <header className="h-14 border-b border-border flex items-center justify-end px-4 gap-1 shrink-0">
          <Link
            href="/dashboard/settings"
            title={t("settings")}
            className={cn(
              "inline-flex items-center justify-center size-9 rounded-md transition-colors",
              pathname === "/dashboard/settings"
                ? "text-foreground bg-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Settings className="size-4" />
          </Link>
          <LocaleSwitcher />
          <ThemeToggle />
          <SignOutButton />
        </header>

        <main className="flex-1 px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
