import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Coins,
  KeyRound,
  ShieldCheck,
  Swords,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Character Dashboard",
    description:
      "See all your stats, skills, and progression at a glance — more detail than the in-game UI.",
  },
  {
    icon: TrendingUp,
    title: "Skill Progression",
    description:
      "Estimate time to level up, compare skill efficiencies, and plan your grind.",
  },
  {
    icon: Coins,
    title: "Economy Insights",
    description:
      "Track gold per hour, monitor market prices, and calculate the true value of your inventory.",
  },
  {
    icon: Swords,
    title: "Combat & Dungeon Tracker",
    description:
      "Review world boss schedules, dungeon rewards, and enemy loot tables in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by Design",
    description:
      "Your API token is stored encrypted and never exposed to the browser. All calls go server-side.",
  },
  {
    icon: KeyRound,
    title: "One Token, Full Access",
    description:
      "Connect your IdleMMO API key once. ImmoWeb Suite handles the rest.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-lg tracking-tight">
            ImmoWeb Suite
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
              Sign in
            </Link>
            <Link href="/register" className={cn(buttonVariants())}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 pt-24 pb-16 text-center">
          <Badge variant="secondary" className="mb-6">
            Early access
          </Badge>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            Your IdleMMO data,
            <br />
            actually useful.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            ImmoWeb Suite connects to the IdleMMO API and turns raw game data
            into actionable insights — skill planning, economy tracking, and
            more.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
              Create free account
            </Link>
            <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
              Sign in
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="border-border/60 bg-card/50"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">
                        {feature.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          ImmoWeb Suite — not affiliated with IdleMMO.
        </div>
      </footer>
    </div>
  );
}
