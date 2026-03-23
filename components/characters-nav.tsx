"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth-client";
import { Users, ChevronDown, ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface CharStub {
  hashedId: string;
  name: string;
  imageUrl: string | null;
}

export function CharactersNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(pathname.startsWith("/dashboard/characters"));
  const [chars, setChars] = useState<CharStub[]>([]);
  const [fetched, setFetched] = useState(false); // prevents retry loop on failure

  const isActive = pathname === "/dashboard/characters";
  const selectedId = pathname.startsWith("/dashboard/characters/")
    ? pathname.split("/").pop()
    : null;

  useEffect(() => {
    if (!open || fetched) return;
    const token = session?.user?.idlemmoToken;
    if (!token) return;

    setFetched(true); // mark before fetch so failure doesn't cause unbounded retries
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setChars(data); })
      .catch(() => {});
  }, [open, session, fetched]);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer select-none",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <Users className="size-4 shrink-0" />
        <Link
          href="/dashboard/characters"
          className="flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          {t("characters")}
        </Link>
        {open ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" />
        )}
      </div>

      {open && chars.length > 0 && (
        <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border/50 pl-2">
          {chars.map((char) => (
            <Link
              key={char.hashedId}
              href={`/dashboard/characters/${char.hashedId}`}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                selectedId === char.hashedId
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <div className="size-4 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {char.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={char.imageUrl} alt={char.name} className="size-full object-cover" />
                ) : (
                  <User className="size-2.5 text-muted-foreground/50" />
                )}
              </div>
              <span className="truncate">{char.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
