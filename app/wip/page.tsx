"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { HardHat, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function WipPage() {
  const router = useRouter();
  const t = useTranslations("wip");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="flex flex-col items-center gap-6 max-w-sm">
        <div className="relative">
          <div className="size-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <HardHat className="size-9 text-amber-500" />
          </div>
          <span className="absolute -top-1 -right-1 size-3 rounded-full bg-amber-500 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("description")}</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="size-3.5 mr-1.5" />
            {t("goBack")}
          </Button>
          <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
            {t("dashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}
