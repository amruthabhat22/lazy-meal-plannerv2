import type { Meal, PlannedMeal } from "@/engine/types";
import type { MealRecipe } from "@/db/repos/mealsRepo";
import type { GroceryCategory } from "@/db/repos/groceryRepo";

/**
 * Ingredient-level grocery aggregation: every planned meal contributes its
 * recipe ingredients, scaled by how much of the meal is planned
 * (quantity / default_qty), summed across the whole week and grouped by
 * the design's grocery categories. Custom dishes have no recipe — they get
 * a single "Other" line so nothing silently disappears from the list.
 */

/** Display order of category sections (matches the design). */
export const CATEGORY_ORDER: GroceryCategory[] = [
  "Protein",
  "Vegetables",
  "Fruits",
  "Dairy",
  "Grains & Carbs",
  "Pantry Items",
  "Other",
];

export interface AggregatedItem {
  name: string;
  amount: number;
  unit: string;
  category: GroceryCategory;
}

/** Round summed amounts to friendly steps (avoid "233.33 g"). */
function roundAmount(amount: number): number {
  if (amount >= 20) return Math.round(amount / 5) * 5;
  if (amount >= 1) return Math.round(amount * 2) / 2;
  return Math.round(amount * 4) / 4;
}

export function aggregateGroceries(
  planMeals: PlannedMeal[],
  catalog: Meal[],
  recipes: Map<string, MealRecipe>,
): AggregatedItem[] {
  const mealById = new Map(catalog.map((m) => [m.id, m]));

  // Total planned quantity per meal across the week.
  const qtyByMeal = new Map<string, number>();
  for (const pm of planMeals) {
    qtyByMeal.set(pm.mealId, (qtyByMeal.get(pm.mealId) ?? 0) + pm.quantity);
  }

  const byKey = new Map<string, AggregatedItem>();
  for (const [mealId, totalQty] of qtyByMeal) {
    const meal = mealById.get(mealId);
    if (!meal) continue;
    const recipe = recipes.get(mealId);

    if (!recipe) {
      // Custom dish (or missing recipe): keep it visible as one line.
      const key = `other|${meal.name.toLowerCase()}|${meal.unit}`;
      const existing = byKey.get(key);
      if (existing) existing.amount += totalQty;
      else
        byKey.set(key, {
          name: meal.name,
          amount: totalQty,
          unit: meal.unit,
          category: "Other",
        });
      continue;
    }

    const scale = meal.default_qty > 0 ? totalQty / meal.default_qty : totalQty;
    for (const ing of recipe.ingredients) {
      const key = `${ing.category}|${ing.name.toLowerCase()}|${ing.unit}`;
      const existing = byKey.get(key);
      if (existing) existing.amount += ing.amount * scale;
      else
        byKey.set(key, {
          name: ing.name,
          amount: ing.amount * scale,
          unit: ing.unit,
          category: ing.category as GroceryCategory,
        });
    }
  }

  const items = [...byKey.values()].map((item) => ({
    ...item,
    amount: roundAmount(item.amount),
  }));
  return items.sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.name.localeCompare(b.name),
  );
}
