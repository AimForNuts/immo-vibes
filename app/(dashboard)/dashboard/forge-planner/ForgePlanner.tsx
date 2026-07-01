"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, Hammer, Package, Plus, Search, Trash2 } from "lucide-react";
import { calculateForgeMaterials } from "@/lib/domain/forge-planner";
import { QUALITY_COLORS } from "@/lib/game-constants";
import { cn } from "@/lib/utils";
import type { ForgePlanSelection, ForgeRecipeItem } from "./types";

interface ForgePlannerProps {
  recipes: ForgeRecipeItem[];
}

export function ForgePlanner({ recipes }: ForgePlannerProps) {
  const [query, setQuery] = useState("");
  const [selections, setSelections] = useState<ForgePlanSelection[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const selectedIds = new Set(selections.map((selection) => selection.recipeHashedId));
  const selectedRecipes = selections
    .map((selection) => ({
      selection,
      recipe: recipes.find((item) => item.hashedId === selection.recipeHashedId),
    }))
    .filter((entry): entry is { selection: ForgePlanSelection; recipe: ForgeRecipeItem } => Boolean(entry.recipe));

  const filteredRecipes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return recipes;
    return recipes.filter((recipe) => {
      return recipe.name.toLowerCase().includes(normalized) || recipe.resultName.toLowerCase().includes(normalized);
    });
  }, [query, recipes]);

  const materialTotals = useMemo(
    () => calculateForgeMaterials(recipes, selections),
    [recipes, selections],
  );

  function addRecipe(recipeHashedId: string) {
    setSelections((current) => {
      if (current.some((selection) => selection.recipeHashedId === recipeHashedId)) return current;
      return [{ recipeHashedId, quantity: 1 }, ...current];
    });
  }

  function updateQuantity(recipeHashedId: string, quantity: number) {
    setSelections((current) =>
      current.map((selection) =>
        selection.recipeHashedId === recipeHashedId
          ? { ...selection, quantity: Math.max(1, Math.floor(quantity) || 1) }
          : selection,
      ),
    );
  }

  function removeRecipe(recipeHashedId: string) {
    setSelections((current) => current.filter((selection) => selection.recipeHashedId !== recipeHashedId));
  }

  async function copyMaterials() {
    if (materialTotals.length === 0) return;

    const text = materialTotals
      .map((material) => `${material.itemName}: ${material.quantity.toLocaleString()}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forge Planner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pick forge recipes and total the materials for the whole batch.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
          <Hammer className="size-4 text-amber-400" />
          {recipes.length.toLocaleString()} forge recipes
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search forge recipes..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
            />
          </div>

          {filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              {filteredRecipes.map((recipe) => {
                const selected = selectedIds.has(recipe.hashedId);
                return (
                  <button
                    key={recipe.hashedId}
                    type="button"
                    onClick={() => addRecipe(recipe.hashedId)}
                    disabled={selected}
                    className={cn(
                      "group flex min-h-28 flex-col items-start gap-3 rounded-md border bg-zinc-900 p-3 text-left transition-colors",
                      selected
                        ? "border-amber-400/40 bg-amber-400/10"
                        : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80",
                    )}
                  >
                    <div className="flex w-full items-start gap-3">
                      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
                        {recipe.resultImageUrl ? (
                          <img
                            src={recipe.resultImageUrl}
                            alt={recipe.resultName}
                            className="size-10 object-contain"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <Package className="size-6 text-zinc-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">{recipe.resultName}</p>
                        <p className={cn("mt-1 text-[10px] font-mono uppercase", QUALITY_COLORS[recipe.resultQuality] ?? "text-zinc-500")}>
                          {recipe.resultQuality}
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-between text-xs">
                      <span className="text-zinc-500">
                        {recipe.recipe.materials.length} materials
                      </span>
                      <span className={cn("flex items-center gap-1", selected ? "text-amber-400" : "text-zinc-500 group-hover:text-zinc-300")}>
                        <Plus className="size-3.5" />
                        {selected ? "Added" : "Add"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
              <Package className="size-10 opacity-30" />
              <p className="text-sm">No forge recipes match your search</p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-md border border-zinc-800 bg-zinc-950">
            <div className="border-b border-zinc-800 p-4">
              <h2 className="text-sm font-semibold text-zinc-100">Selected Items</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Set how many of each item you want to forge.</p>
            </div>

            <div className="p-4">
              {selectedRecipes.length > 0 ? (
                <div className="space-y-3">
                  {selectedRecipes.map(({ selection, recipe }) => {
                    return (
                      <div key={recipe.hashedId} className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900 p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-zinc-100">{recipe.resultName}</p>
                          <p className="text-[10px] text-zinc-600">{recipe.recipe.skill} Lv.{recipe.recipe.level_required}</p>
                        </div>
                        <input
                          type="number"
                          min={1}
                          value={selection.quantity}
                          onChange={(event) => updateQuantity(recipe.hashedId, Number(event.target.value))}
                          className="h-8 w-16 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-right text-sm font-mono text-zinc-100 focus:border-amber-400/60 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeRecipe(recipe.hashedId)}
                          title={`Remove ${recipe.resultName}`}
                          className="flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-zinc-600">No recipes selected</div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-zinc-800 bg-zinc-950">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 p-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-zinc-100">Required Materials</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Totals update as selected quantities change.
                </p>
              </div>
              <button
                type="button"
                onClick={copyMaterials}
                disabled={materialTotals.length === 0}
                title="Copy required materials"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                  materialTotals.length === 0
                    ? "cursor-not-allowed border-zinc-800 text-zinc-700"
                    : copyState === "copied"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                      : copyState === "failed"
                        ? "border-red-400/30 bg-red-400/10 text-red-400"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-100",
                )}
              >
                {copyState === "copied" ? <Check className="size-4" /> : <Clipboard className="size-4" />}
              </button>
            </div>
            <div className="p-4">
              {materialTotals.length > 0 ? (
                <div className="space-y-2">
                  {materialTotals.map((material) => (
                    <div key={material.hashedItemId} className="flex items-center justify-between gap-4 text-sm">
                      <span className="min-w-0 truncate text-zinc-300">{material.itemName}</span>
                      <span className="shrink-0 font-mono text-amber-400">{material.quantity.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-zinc-600">Add recipes to see material totals</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
