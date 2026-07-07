import type { SQLiteDatabase } from "expo-sqlite";
import type { Day, Slot } from "@/engine/types";
import { newId, nowIso } from "@/utils/ids";
import { getPreferences, savePreferences } from "./repos/preferencesRepo";
import { getAllPlans, getPlanMeals } from "./repos/plansRepo";
import type { MealRow } from "./repos/mealsRepo";

/** Backup format, spec section 7. */
export interface BackupV1 {
  version: 1;
  exported_at: string;
  preferences: {
    diet: string;
    protein_goal: number;
    meals_per_day: number;
    cuisines?: string[];
  } | null;
  week_plans: {
    id: string;
    name: string;
    is_active: boolean;
    meals: { day: Day; slot: Slot; meal_id: string; quantity: number }[];
  }[];
  grocery_items: {
    plan_id: string;
    name: string;
    amount: number;
    unit: string;
    category: string;
    is_checked: boolean;
  }[];
  custom_meals: MealRow[];
}

export async function buildBackup(db: SQLiteDatabase): Promise<BackupV1> {
  const prefs = await getPreferences(db);
  const plans = await getAllPlans(db);
  const weekPlans = [];
  for (const plan of plans) {
    const meals = await getPlanMeals(db, plan.id);
    weekPlans.push({
      id: plan.id,
      name: plan.name,
      is_active: plan.isActive,
      meals: meals.map((pm) => ({
        day: pm.day,
        slot: pm.slot,
        meal_id: pm.mealId,
        quantity: pm.quantity,
      })),
    });
  }
  const grocery = await db.getAllAsync<{
    plan_id: string;
    name: string;
    amount: number;
    unit: string;
    category: string;
    is_checked: number;
  }>("SELECT plan_id, name, amount, unit, category, is_checked FROM grocery_items");
  const customMeals = await db.getAllAsync<MealRow>(
    "SELECT * FROM meals WHERE is_custom = 1",
  );

  return {
    version: 1,
    exported_at: nowIso(),
    preferences: prefs
      ? {
          diet: prefs.diet,
          protein_goal: prefs.proteinGoal,
          meals_per_day: prefs.mealsPerDay,
          cuisines: prefs.cuisines,
        }
      : null,
    week_plans: weekPlans,
    grocery_items: grocery.map((g) => ({
      plan_id: g.plan_id,
      name: g.name,
      amount: g.amount,
      unit: g.unit,
      category: g.category,
      is_checked: g.is_checked === 1,
    })),
    custom_meals: customMeals,
  };
}

export function validateBackup(data: unknown): BackupV1 {
  if (typeof data !== "object" || data === null) {
    throw new Error("Backup file is not a JSON object");
  }
  const b = data as Record<string, unknown>;
  if (b.version !== 1) {
    throw new Error(`Unsupported backup version: ${String(b.version)}`);
  }
  if (!Array.isArray(b.week_plans) || !Array.isArray(b.grocery_items)) {
    throw new Error("Backup file is missing week_plans or grocery_items");
  }
  return data as BackupV1;
}

/**
 * Restores a backup, overwriting local plans/preferences/groceries.
 * Referenced meal_ids missing from the catalog are kept (spec 7): a stub
 * meal row flagged is_custom=1 + zero protein is created so the UI can show
 * "Unavailable meal" with a swap prompt. Returns the ids that were unknown.
 */
export async function restoreBackup(
  db: SQLiteDatabase,
  backup: BackupV1,
): Promise<{ unknownMealIds: string[] }> {
  const known = new Set(
    (await db.getAllAsync<{ id: string }>("SELECT id FROM meals")).map(
      (r) => r.id,
    ),
  );
  const unknown = new Set<string>();
  for (const plan of backup.week_plans) {
    for (const pm of plan.meals) {
      if (!known.has(pm.meal_id)) unknown.add(pm.meal_id);
    }
  }

  await db.withTransactionAsync(async () => {
    await db.execAsync(
      "DELETE FROM plan_meals; DELETE FROM grocery_items; DELETE FROM week_plans; DELETE FROM user_preferences;",
    );

    for (const id of unknown) {
      await db.runAsync(
        `INSERT OR IGNORE INTO meals (
           id, name, slots, diet, cuisine, country, default_qty, min_qty,
           max_qty, qty_step, unit, protein_per_unit, difficulty,
           prep_time_min, allergens, is_custom, catalog_version
         ) VALUES (?, ?, 'breakfast,lunch,dinner,snack', 'veg', NULL, NULL,
                   1, 1, 1, 1, 'serving', 0, NULL, NULL, '', 1, 0)`,
        [id, "Unavailable meal"],
      );
    }

    for (const plan of backup.week_plans) {
      const now = nowIso();
      await db.runAsync(
        "INSERT INTO week_plans (id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [plan.id, plan.name, plan.is_active ? 1 : 0, now, now],
      );
      for (const pm of plan.meals) {
        await db.runAsync(
          "INSERT INTO plan_meals (id, plan_id, day, slot, meal_id, quantity) VALUES (?, ?, ?, ?, ?, ?)",
          [newId(), plan.id, pm.day, pm.slot, pm.meal_id, pm.quantity],
        );
      }
    }

    for (const g of backup.grocery_items) {
      await db.runAsync(
        "INSERT INTO grocery_items (id, plan_id, name, amount, unit, category, is_checked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          newId(),
          g.plan_id,
          g.name,
          g.amount,
          g.unit,
          g.category,
          g.is_checked ? 1 : 0,
          nowIso(),
        ],
      );
    }
  });

  if (backup.preferences) {
    const mpd = backup.preferences.meals_per_day;
    await savePreferences(db, {
      diet: backup.preferences.diet as "veg" | "egg" | "non-veg",
      proteinGoal: backup.preferences.protein_goal,
      mealsPerDay: mpd === 2 || mpd === 4 ? mpd : 3,
      cuisines: backup.preferences.cuisines ?? [],
    });
  }

  return { unknownMealIds: [...unknown] };
}
