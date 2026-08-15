"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { requestPasswordReset } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

function accountEmailFromUsername(username: string) {
  return `${username.trim().toLowerCase()}@immo.local`;
}

export function ForgotPasswordForm() {
  const t = useTranslations("forgotPassword");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetUrl = useMemo(() => {
    if (typeof window === "undefined") return "/reset-password";
    return `${window.location.origin}/reset-password`;
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);

    if (!username.trim()) {
      setError(t("usernameRequired"));
      return;
    }

    setLoading(true);
    const { error } = await requestPasswordReset({
      email: accountEmailFromUsername(username),
      redirectTo: resetUrl,
    });

    setLoading(false);

    if (error) {
      setError(error.message ?? t("requestFailed"));
      return;
    }

    setSent(true);
  }

  return (
    <section className="w-full max-w-[420px] rounded-lg border border-border/70 bg-card/95 p-5 shadow-2xl shadow-black/10">
      <div className="mb-6 flex flex-col gap-4">
        <Link href="/" className="w-fit">
          <Image
            src="/images/logo.png"
            alt="ImmoWeb Suite"
            width={166}
            height={42}
            className="h-auto object-contain"
            priority
          />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">{t("username")}</Label>
          <Input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {sent && <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("sent")}</p>}

        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? t("sending") : t("submit")}
        </Button>
      </form>

      <div className="mt-5 flex justify-center">
        <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="size-3.5" />
          {t("backToLogin")}
        </Link>
      </div>
    </section>
  );
}
