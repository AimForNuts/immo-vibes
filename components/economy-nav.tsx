"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Coins, ChevronDown, ChevronRight, ShoppingBag, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const SUB_ITEMS = [
  { href: "/dashboard/market",      labelKey: "market",      icon: ShoppingBag },
  { href: "/dashboard/investments", labelKey: "investments", icon: TrendingUp },
] as const;

export function EconomyNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isEconomyPath = SUB_ITEMS.some((s) => pathname.startsWith(s.href));
  const [open, setOpen] = useState(isEconomyPath);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer select-none",
          isEconomyPath
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <Coins className="size-4 shrink-0" />
        <span className="flex-1">{t("economy")}</span>
        {open ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" />
        )}
      </div>

      {open && (
        <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border/50 pl-2">
          {SUB_ITEMS.map(({ href, labelKey, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                pathname === href
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              {t(labelKey)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
