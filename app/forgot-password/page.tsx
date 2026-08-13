import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, HardHat } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("forgotPassword");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-[420px] rounded-lg border border-border/70 bg-card p-5 text-center shadow-2xl shadow-black/10">
        <Link href="/" className="mx-auto mb-6 block w-fit">
          <Image
            src="/images/logo.png"
            alt="ImmoWeb Suite"
            width={166}
            height={42}
            className="h-auto object-contain"
            priority
          />
        </Link>

        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-500">
          <HardHat className="size-7" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("description")}</p>

        <div className="mt-6 flex justify-center">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ArrowLeft className="size-3.5" />
            {t("backToLogin")}
          </Link>
        </div>
      </section>
    </main>
  );
}
