"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, ChevronDown, ChevronRight, Package, Skull, Sword, Globe, Users, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

type SubGroup = {
  label: string;
  items: { href: string; label: string; icon: React.ElementType; disabled?: boolean }[];
};

const GROUPS: SubGroup[] = [
  {
    label: "Economy",
    items: [
      { href: "/dashboard/admin/economy/items", label: "Items", icon: Package },
    ],
  },
  {
    label: "World",
    items: [
      { href: "/dashboard/admin/world/dungeons",    label: "Dungeons",     icon: Sword },
      { href: "/dashboard/admin/world/zones",       label: "Zones",        icon: Globe },
      { href: "/dashboard/admin/world/world-bosses", label: "World Bosses", icon: Skull, disabled: true },
      { href: "/dashboard/admin/world/enemies",     label: "Enemies",      icon: Skull, disabled: true },
    ],
  },
  {
    label: "Users",
    items: [
      { href: "/dashboard/admin/users", label: "Users", icon: Users },
    ],
  },
];

const ALL_HREFS = GROUPS.flatMap((g) => g.items.filter((i) => !i.disabled).map((i) => i.href));

export function AdminNav() {
  const pathname = usePathname();
  const isAdminPath = ALL_HREFS.some((h) => pathname.startsWith(h));
  const [open, setOpen] = useState(isAdminPath);

  useEffect(() => {
    if (isAdminPath) setOpen(true);
  }, [isAdminPath]);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer select-none mt-2",
          isAdminPath
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <ShieldCheck className="size-4 shrink-0" />
        <span className="flex-1">Admin</span>
        {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
      </div>

      {open && (
        <div className="ml-4 mt-0.5 flex flex-col gap-0 border-l border-border/50 pl-2">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <div className="px-2 pt-2 pb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/50 select-none">
                {group.label}
              </div>
              {group.items.map(({ href, label, icon: Icon, disabled }) =>
                disabled ? (
                  <div
                    key={href}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground/30 cursor-not-allowed select-none"
                    title="Coming soon"
                  >
                    <Lock className="size-3 shrink-0" />
                    {label}
                  </div>
                ) : (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                      pathname.startsWith(href)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {label}
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
