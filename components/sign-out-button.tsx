"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const t = useTranslations("nav");

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <button
      onClick={handleSignOut}
      title={t("signOut")}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "size-9",
        className
      )}
    >
      <LogOut className="size-4" />
    </button>
  );
}
