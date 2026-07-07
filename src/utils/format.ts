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
