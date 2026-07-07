import { ALL_DAYS } from "@/engine/types";
import type { Meal, Slot } from "@/engine/types";
import type { PlanRow } from "@/db/repos/plansRepo";
import { formatQty } from "@/utils/format";

const DAY_LONG: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const SLOT_LABEL: Record<Slot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

/** WhatsApp-formatted weekly plan text (design's buildPlanMessage). */
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
  lines.push("Sent via Lazy Meal Planner");
  return lines.join("\n");
}
