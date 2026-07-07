import type { Meal, PlannedMeal } from "@/engine/types";
import type { GroceryCategory } from "@/db/repos/groceryRepo";

/**
 * MVP simplification (spec 5.5): meals ARE the grocery items. Each distinct
 * meal in the plan becomes one line: sum(quantity) across the week in the
 * meal's unit, mapped to a category.
 */

const PROTEIN_WORDS =
  /paneer|chicken|egg|fish|whey|protein|soya|tofu|keema|sprouts|chana|tikka/i;
const GRAIN_WORDS = /rice|roti|paratha|toast|oats|poha|upma|idli|daliya|quinoa|pita|khichdi|biryani|pulao|thepla|wrap|bar/i;
const DAIRY_WORDS = /curd|dahi|yogurt|milk|chaas|kadhi/i;
const VEG_WORDS = /vegetable|palak|salad|methi|soup|sambar/i;
const PANTRY_WORDS = /peanut|makhana|nuts|hummus|seeds|chia/i;

export function categorize(meal: Meal): GroceryCategory {
  const name = meal.name;
  if (PROTEIN_WORDS.test(name)) return "Protein";
  if (DAIRY_WORDS.test(name)) return "Dairy";
  if (GRAIN_WORDS.test(name)) return "Grains";
  if (VEG_WORDS.test(name)) return "Vegetables";
  if (PANTRY_WORDS.test(name)) return "Pantry";
  return "Other";
}

export interface AggregatedItem {
  name: string;
  amount: number;
  unit: string;
  category: GroceryCategory;
}

export function aggregateGroceries(
  planMeals: PlannedMeal[],
  catalog: Meal[],
): AggregatedItem[] {
  const byMeal = new Map<string, number>();
  for (const pm of planMeals) {
    byMeal.set(pm.mealId, (byMeal.get(pm.mealId) ?? 0) + pm.quantity);
  }
  const items: AggregatedItem[] = [];
  for (const [mealId, amount] of byMeal) {
    const meal = catalog.find((m) => m.id === mealId);
    if (!meal) continue;
    items.push({
      name: meal.name,
      amount,
      unit: meal.unit,
      category: categorize(meal),
    });
  }
  return items.sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  );
}
