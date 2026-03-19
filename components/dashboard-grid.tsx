"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Users, Swords, TrendingUp, Coins, Skull, Shield, Plus, Pencil, Check, X,
} from "lucide-react";
import { saveDashboardLayout } from "@/app/actions/preferences";
import type { DashboardCardType } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CARD_META: Record<
  DashboardCardType,
  { icon: React.ElementType; href: string; color: string }
> = {
  characters: { icon: Users,      href: "/dashboard/characters", color: "text-blue-400"   },
  gear:        { icon: Swords,     href: "/dashboard/gear",       color: "text-orange-400" },
  skills:      { icon: TrendingUp, href: "/wip",                  color: "text-green-400"  },
  economy:     { icon: Coins,      href: "/wip",                  color: "text-yellow-400" },
  dungeons:    { icon: Skull,      href: "/dashboard/dungeons",   color: "text-red-400"    },
  guild:       { icon: Shield,     href: "/wip",                  color: "text-purple-400" },
  empty:       { icon: Plus,       href: "#",                     color: "text-muted-foreground" },
};

const ALL_TYPES: DashboardCardType[] = [
  "characters", "gear", "skills", "economy", "dungeons", "guild",
];

interface DashboardGridProps {
  initialLayout: DashboardCardType[];
}

export function DashboardGrid({ initialLayout }: DashboardGridProps) {
  const t = useTranslations("overview");
  const router = useRouter();
  const [layout, setLayout] = useState<DashboardCardType[]>(initialLayout);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await saveDashboardLayout(layout);
      setEditing(false);
      router.refresh();
    });
  }

  function setSlot(index: number, type: DashboardCardType) {
    setLayout((prev) => prev.map((t, i) => (i === index ? type : t)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-mono">
          {t("cards.addCard")}
        </span>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setLayout(initialLayout); setEditing(false); }}>
              <X className="size-3.5 mr-1" />
              {t("cancelEdit")}
            </Button>
            <Button size="sm" disabled={pending} onClick={handleSave}>
              <Check className="size-3.5 mr-1" />
              {t("saveLayout")}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5 mr-1" />
            {t("editLayout")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {layout.map((cardType, i) => {
          const meta = CARD_META[cardType];
          const Icon = meta.icon;
          const label = t(`cards.${cardType}`);
          const isEmpty = cardType === "empty";

          if (editing) {
            return (
              <div key={i} className="relative rounded-xl border border-dashed border-border bg-muted/30 p-4 flex flex-col gap-3">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">Slot {i + 1}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_TYPES.map((type) => {
                    const m = CARD_META[type];
                    const MIcon = m.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setSlot(i, type)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs border transition-colors",
                          layout[i] === type
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                        )}
                      >
                        <MIcon className={cn("size-3", m.color)} />
                        {t(`cards.${type}`)}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setSlot(i, "empty")}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs border transition-colors col-span-2",
                      layout[i] === "empty"
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    )}
                  >
                    {t("cards.empty")}
                  </button>
                </div>
              </div>
            );
          }

          if (isEmpty) {
            return (
              <button
                key={i}
                onClick={() => setEditing(true)}
                className="rounded-xl border border-dashed border-border/50 bg-muted/20 h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground/40 hover:text-muted-foreground hover:border-border transition-colors"
              >
                <Plus className="size-5" />
                <span className="text-xs">{t("cards.addCard")}</span>
              </button>
            );
          }

          return (
            <Link
              key={i}
              href={meta.href}
              className="rounded-xl border border-border bg-card hover:bg-accent/50 h-32 flex flex-col items-center justify-center gap-3 transition-colors group"
            >
              <Icon className={cn("size-8 transition-transform group-hover:scale-110", meta.color)} />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
