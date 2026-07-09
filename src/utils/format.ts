import type { Unit } from "@/engine/types";

/** The only place quantity/unit display formatting lives (spec section 8). */

const PLURAL: Partial<Record<Unit, string>> = {
  piece: "pieces",
  slice: "slices",
  bowl: "bowls",
  serving: "servings",
  scoop: "scoops",
  cup: "cups",
};

export function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

export function formatQty(qty: number, unit: Unit): string {
  const n = formatNumber(qty);
  if (unit === "g" || unit === "ml") return `${n} ${unit}`;
  const label = qty > 1 ? (PLURAL[unit] ?? unit) : unit;
  return `${n} ${label}`;
}

export function formatProtein(grams: number): string {
  return `${Math.round(grams)}g`;
}

/** Ingredient units are broader than meal units (tbsp, tsp, sprig, …). */
const INGREDIENT_PLURAL: Record<string, string> = {
  piece: "pieces",
  slice: "slices",
  scoop: "scoops",
  sprig: "sprigs",
  cup: "cups",
};

/**
 * Display quantity for a recipe/grocery ingredient. Converts g→kg and
 * ml→L past 1000, pluralizes countable units, leaves tbsp/tsp as-is.
 */
export function formatIngredientQty(amount: number, unit: string): string {
  if (unit === "g" && amount >= 1000) {
    return `${formatNumber(amount / 1000)} kg`;
  }
  if (unit === "ml" && amount >= 1000) {
    return `${formatNumber(amount / 1000)} L`;
  }
  const n = formatNumber(amount);
  const label = amount > 1 ? (INGREDIENT_PLURAL[unit] ?? unit) : unit;
  return `${n} ${label}`;
}
