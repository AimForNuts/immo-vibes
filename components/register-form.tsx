"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);

    const { error } = await signUp.email({
      email: `${username.toLowerCase()}@immo.local`,
      password,
      name: username,
      username,
    } as Parameters<typeof signUp.email>[0]);

    if (error) {
      setError(error.message ?? t("signUpFailed"));
      setLoading(false);
      return;
    }

    router.push("/dashboard");
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
          <h1 className="text-2xl font-semibold tracking-tight">{t("signUp")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("signUpSubtitle")}</p>
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
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">{t("confirmPassword")}</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? t("signingUp") : t("signUp")}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          {t("signIn")}
        </Link>
      </p>
    </section>
  );
}
