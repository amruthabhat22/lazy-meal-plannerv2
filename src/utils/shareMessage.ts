import { ALL_DAYS } from "@/engine/types";
import type { Day, Meal, Slot } from "@/engine/types";
import type { MealRecipe } from "@/db/repos/mealsRepo";
import type { PlanRow } from "@/db/repos/plansRepo";
import { formatIngredientQty, formatQty } from "@/utils/format";

export const DAY_LONG: Record<Day, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const SLOT_LABEL: Record<Slot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

/** WhatsApp-formatted weekly plan text. Ends with a nudge that recipes for
 * any meal can be requested — the sender shares them from the same sheet. */
export function buildPlanMessage(
  planMeals: PlanRow[],
  catalog: Meal[],
  slots: Slot[],
): string {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const lines: string[] = ["🍲 *This week's meal plan*", ""];

  for (const day of ALL_DAYS) {
    const dayRows = planMeals.filter((pm) => pm.day === day);
    if (dayRows.length === 0) continue;
    lines.push(`*${DAY_LONG[day]}*`);
    let protein = 0;
    let kcal = 0;
    for (const slot of slots) {
      const rows = dayRows.filter((pm) => pm.slot === slot);
      if (rows.length === 0) continue;
      const parts = rows.map((pm) => {
        const meal = byId.get(pm.mealId);
        if (!meal) return "Unavailable meal";
        protein += meal.protein_per_unit * pm.quantity;
        kcal += (meal.kcal_per_unit ?? 0) * pm.quantity;
        return pm.quantity !== meal.default_qty || meal.unit !== "serving"
          ? `${meal.name} (${formatQty(pm.quantity, meal.unit)})`
          : meal.name;
      });
      lines.push(`• ${SLOT_LABEL[slot]}: ${parts.join(", ")}`);
    }
    if (protein > 0) {
      lines.push(`  _${Math.round(protein)}g protein · ${Math.round(kcal)} cal_`);
    }
    lines.push("");
  }
  lines.push(
    "💬 Want the recipe for any of these meals? Just reply with the meal name and I'll send it over.",
  );
  lines.push("");
  lines.push("Sent via EezyMeals");
  return lines.join("\n");
}

/** Where in the week a meal appears, e.g. "Monday dinner, Thursday lunch". */
export function mealOccurrences(
  mealId: string,
  planMeals: PlanRow[],
): string {
  const spots: string[] = [];
  for (const day of ALL_DAYS) {
    for (const pm of planMeals) {
      if (pm.mealId === mealId && pm.day === day) {
        spots.push(`${DAY_LONG[day]} ${SLOT_LABEL[pm.slot].toLowerCase()}`);
      }
    }
  }
  return spots.join(", ");
}

/** WhatsApp-formatted single-meal recipe (design's format): summary line
 * with prep time, ease of cooking, and macros, then ingredients + steps.
 * Adds where the meal sits on this week's plan. */
export function buildRecipeMessage(
  meal: Meal,
  recipe: MealRecipe | null,
  planMeals: PlanRow[],
): string {
  const lines: string[] = [`👩‍🍳 *${meal.name}*`];

  const summary: string[] = [];
  if (meal.prep_time_min != null) summary.push(`${meal.prep_time_min} min`);
  if (meal.difficulty) {
    summary.push(
      meal.difficulty.charAt(0).toUpperCase() + meal.difficulty.slice(1),
    );
  }
  summary.push(
    `${Math.round(meal.protein_per_unit * meal.default_qty)}g protein`,
  );
  if (meal.kcal_per_unit != null) {
    summary.push(`${Math.round(meal.kcal_per_unit * meal.default_qty)} cal`);
  }
  lines.push(`_${summary.join(" · ")}_`);

  const when = mealOccurrences(meal.id, planMeals);
  if (when) lines.push(`🗓 On the plan: ${when}`);

  if (recipe) {
    lines.push("", "*Ingredients*");
    for (const ing of recipe.ingredients) {
      lines.push(`• ${formatIngredientQty(ing.amount, ing.unit)} ${ing.name}`);
    }
    lines.push("", "*Instructions*");
    recipe.steps.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
  }

  lines.push("", "Sent via EezyMeals");
  return lines.join("\n");
}
