"use client";

import { useMemo, useState } from "react";
import { Calculator, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CalculatorItem = {
  name: string;
  quantity: number;
  matchedItem: {
    hashedId: string;
    name: string;
    quality: string;
    imageUrl: string | null;
  } | null;
  unitPrice: number | null;
  totalPrice: number | null;
  soldAt: string | null;
};

type CalculatorResult = {
  items: CalculatorItem[];
  total: number;
  missingCount: number;
  parseErrors: string[];
};

const SAMPLE_TEXT = `Iron Ore x2100
Siren's Scales x150
Black Bear Pelt x20
Willow Log x1200
Snakes Head x120
Lobster x740
Long Forgotten Necklace x50`;

function formatGold(value: number | null) {
  return value === null ? "No price" : value.toLocaleString();
}

export function GuildChallengeCostCalculator() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasInput = useMemo(() => text.trim().length > 0, [text]);

  async function calculate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/guild/challenge-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json() as CalculatorResult & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Could not calculate challenge cost.");
        setResult(null);
        return;
      }

      setResult(data);
    } catch {
      setError("Could not calculate challenge cost.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="size-4" />
          Guild Challenge Cost
        </CardTitle>
        {result ? (
          <Badge variant={result.missingCount > 0 ? "outline" : "default"}>
            {formatGold(result.total)} gold
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)]">
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="min-h-48 w-full resize-y rounded-md border bg-background p-3 text-sm outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
            spellCheck={false}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Format: Item Name x123</p>
            <Button type="button" onClick={calculate} disabled={!hasInput || loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Calculator className="size-4" />}
              Calculate
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {result?.parseErrors.length ? (
            <div className="space-y-1 text-xs text-destructive">
              {result.parseErrors.map((parseError) => (
                <p key={parseError}>{parseError}</p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-md border">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>Item</span>
            <span>Unit</span>
            <span>Total</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {result ? (
              result.items.map((item) => (
                <div
                  key={`${item.name}-${item.quantity}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b px-3 py-2 text-sm last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.matchedItem?.name ?? item.name}</p>
                    <p className="text-xs text-muted-foreground">x{item.quantity.toLocaleString()}</p>
                  </div>
                  <span className="tabular-nums">{formatGold(item.unitPrice)}</span>
                  <span className="font-medium tabular-nums">{formatGold(item.totalPrice)}</span>
                </div>
              ))
            ) : (
              <p className="p-3 text-sm text-muted-foreground">Calculated costs will appear here.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
