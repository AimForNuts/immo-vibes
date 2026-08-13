"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getSafeRedirectTarget(from: string | null) {
  if (!from || !from.startsWith("/") || from.startsWith("//")) {
    return "/dashboard";
  }

  return from;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn.username({ username, password });

    if (error) {
      setError(error.message ?? t("invalidCredentials"));
      setLoading(false);
      return;
    }

    router.push(getSafeRedirectTarget(searchParams.get("from")));
    router.refresh();
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
          <h1 className="text-2xl font-semibold tracking-tight">{t("signIn")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("signInSubtitle")}</p>
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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="password">{t("password")}</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? t("signingIn") : t("signIn")}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-foreground underline underline-offset-4">
          {t("createOne")}
        </Link>
      </p>
    </section>
  );
}
