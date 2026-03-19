import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Swords, ShoppingBag, Users, Zap } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const hasToken = !!session.user.idlemmoToken;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {session.user.username ?? session.user.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          {hasToken
            ? "Your IdleMMO data will appear here."
            : "Connect your IdleMMO account to get started."}
        </p>
        {!hasToken && (
          <Badge variant="outline" className="mt-2 text-yellow-500 border-yellow-500/40">
            IdleMMO token not configured — go to Settings
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Combat", icon: Swords, value: "—", desc: "Current skill level" },
          { title: "Market", icon: ShoppingBag, value: "—", desc: "Active listings" },
          { title: "Guild", icon: Users, value: "—", desc: "Members online" },
          { title: "Shrine", icon: Zap, value: "—", desc: "Next blessing" },
        ].map(({ title, icon: Icon, value, desc }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No data yet. Configure your IdleMMO API token in{" "}
            <a href="/dashboard/settings" className="underline underline-offset-4 text-foreground">
              Settings
            </a>{" "}
            to start pulling data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
