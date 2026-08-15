"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { resetPassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type ResetPasswordFormProps = {
  token: string | null;
  tokenError: string | null;
};

export function ResetPasswordForm({ token, tokenError }: ResetPasswordFormProps) {
  const router = useRouter();
  const t = useTranslations("resetPassword");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(tokenError ? t("invalidToken") : null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError(t("invalidToken"));
      return;
    }

    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }

    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    const { error } = await resetPassword({
      newPassword: password,
      token,
    });

    setLoading(false);

    if (error) {
      setError(error.message ?? t("resetFailed"));
      return;
    }

    router.push("/login?reset=success");
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
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t("newPassword")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!token}
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
            disabled={!token}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading || !token} className="mt-1 w-full">
          {loading ? t("saving") : t("submit")}
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
