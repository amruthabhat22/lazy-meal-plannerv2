import type { SQLiteDatabase } from "expo-sqlite";
import type { Day, PlannedMeal, Slot } from "@/engine/types";
import { newId, nowIso } from "@/utils/ids";

export interface WeekPlan {
  id: string;
  name: string;
  isActive: boolean;
}

interface PlanRow {
  id: string;
  name: string;
  is_active: number;
}

interface PlanMealRow {
  day: string;
  slot: string;
  meal_id: string;
  quantity: number;
}

export async function getActivePlan(
  db: SQLiteDatabase,
): Promise<WeekPlan | null> {
  const row = await db.getFirstAsync<PlanRow>(
    "SELECT * FROM week_plans WHERE is_active = 1 LIMIT 1",
  );
  return row ? { id: row.id, name: row.name, isActive: true } : null;
}

export async function getAllPlans(db: SQLiteDatabase): Promise<WeekPlan[]> {
  const rows = await db.getAllAsync<PlanRow>(
    "SELECT * FROM week_plans ORDER BY created_at",
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    isActive: r.is_active === 1,
  }));
}

export async function createPlan(
  db: SQLiteDatabase,
  name: string,
  options: { id?: string; makeActive?: boolean } = {},
): Promise<WeekPlan> {
  const id = options.id ?? newId();
  const makeActive = options.makeActive ?? true;
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    if (makeActive) {
      await db.runAsync("UPDATE week_plans SET is_active = 0");
    }
    await db.runAsync(
      "INSERT INTO week_plans (id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [id, name, makeActive ? 1 : 0, now, now],
    );
  });
  return { id, name, isActive: makeActive };
}

export async function getPlanMeals(
  db: SQLiteDatabase,
  planId: string,
): Promise<PlannedMeal[]> {
  const rows = await db.getAllAsync<PlanMealRow>(
    "SELECT day, slot, meal_id, quantity FROM plan_meals WHERE plan_id = ?",
    [planId],
  );
  return rows.map((r) => ({
    day: r.day as Day,
    slot: r.slot as Slot,
    mealId: r.meal_id,
    quantity: r.quantity,
  }));
}

/** Upsert a batch of slots. UNIQUE(plan_id, day, slot) makes swap an UPDATE. */
export async function upsertPlanMeals(
  db: SQLiteDatabase,
  planId: string,
  meals: PlannedMeal[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const pm of meals) {
      await db.runAsync(
        `INSERT INTO plan_meals (id, plan_id, day, slot, meal_id, quantity)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(plan_id, day, slot)
         DO UPDATE SET meal_id = excluded.meal_id, quantity = excluded.quantity`,
        [newId(), planId, pm.day, pm.slot, pm.mealId, pm.quantity],
      );
    }
    await db.runAsync("UPDATE week_plans SET updated_at = ? WHERE id = ?", [
      nowIso(),
      planId,
    ]);
  });
}

export async function updateQuantity(
  db: SQLiteDatabase,
  planId: string,
  day: Day,
  slot: Slot,
  quantity: number,
): Promise<void> {
  await db.runAsync(
    "UPDATE plan_meals SET quantity = ? WHERE plan_id = ? AND day = ? AND slot = ?",
    [quantity, planId, day, slot],
  );
}

export async function swapMeal(
  db: SQLiteDatabase,
  planId: string,
  day: Day,
  slot: Slot,
  mealId: string,
  quantity: number,
): Promise<void> {
  await db.runAsync(
    "UPDATE plan_meals SET meal_id = ?, quantity = ? WHERE plan_id = ? AND day = ? AND slot = ?",
    [mealId, quantity, planId, day, slot],
  );
}

/** Removes slots no longer used (e.g. snack after switching to 3 meals/day). */
export async function deleteSlotsNotIn(
  db: SQLiteDatabase,
  planId: string,
  slots: Slot[],
): Promise<void> {
  const placeholders = slots.map(() => "?").join(",");
  await db.runAsync(
    `DELETE FROM plan_meals WHERE plan_id = ? AND slot NOT IN (${placeholders})`,
    [planId, ...slots],
  );
}

export async function deleteAllPlans(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(
    "DELETE FROM plan_meals; DELETE FROM grocery_items; DELETE FROM week_plans;",
  );
}
