import type { SQLiteDatabase } from "expo-sqlite";
import type { Day, PlannedMeal, Slot } from "@/engine/types";
import { newId, nowIso } from "@/utils/ids";

export interface WeekPlan {
  id: string;
  name: string;
  isActive: boolean;
}

/** One plan_meals row. Since v3 a (day, slot) can hold several rows. */
export interface PlanRow extends PlannedMeal {
  id: string;
}

interface PlanRowRecord {
  id: string;
  day: string;
  slot: string;
  meal_id: string;
  quantity: number;
}

interface PlanRecord {
  id: string;
  name: string;
  is_active: number;
}

export async function getActivePlan(
  db: SQLiteDatabase,
): Promise<WeekPlan | null> {
  const row = await db.getFirstAsync<PlanRecord>(
    "SELECT * FROM week_plans WHERE is_active = 1 LIMIT 1",
  );
  return row ? { id: row.id, name: row.name, isActive: true } : null;
}

export async function getAllPlans(db: SQLiteDatabase): Promise<WeekPlan[]> {
  const rows = await db.getAllAsync<PlanRecord>(
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

export async function getPlanRows(
  db: SQLiteDatabase,
  planId: string,
): Promise<PlanRow[]> {
  const rows = await db.getAllAsync<PlanRowRecord>(
    "SELECT id, day, slot, meal_id, quantity FROM plan_meals WHERE plan_id = ?",
    [planId],
  );
  return rows.map((r) => ({
    id: r.id,
    day: r.day as Day,
    slot: r.slot as Slot,
    mealId: r.meal_id,
    quantity: r.quantity,
  }));
}

async function insertRow(
  db: SQLiteDatabase,
  planId: string,
  pm: PlannedMeal,
): Promise<PlanRow> {
  const id = newId();
  await db.runAsync(
    "INSERT INTO plan_meals (id, plan_id, day, slot, meal_id, quantity) VALUES (?, ?, ?, ?, ?, ?)",
    [id, planId, pm.day, pm.slot, pm.mealId, pm.quantity],
  );
  return { id, ...pm };
}

/** Regeneration: wipe the given days and insert the generated meals. */
export async function replaceDays(
  db: SQLiteDatabase,
  planId: string,
  days: Day[],
  meals: PlannedMeal[],
): Promise<PlanRow[]> {
  const inserted: PlanRow[] = [];
  await db.withTransactionAsync(async () => {
    const placeholders = days.map(() => "?").join(",");
    await db.runAsync(
      `DELETE FROM plan_meals WHERE plan_id = ? AND day IN (${placeholders})`,
      [planId, ...days],
    );
    for (const pm of meals) {
      inserted.push(await insertRow(db, planId, pm));
    }
    await db.runAsync("UPDATE week_plans SET updated_at = ? WHERE id = ?", [
      nowIso(),
      planId,
    ]);
  });
  return inserted;
}

export async function updateRowQuantity(
  db: SQLiteDatabase,
  rowId: string,
  quantity: number,
): Promise<void> {
  await db.runAsync("UPDATE plan_meals SET quantity = ? WHERE id = ?", [
    quantity,
    rowId,
  ]);
}

export async function removeRow(
  db: SQLiteDatabase,
  rowId: string,
): Promise<void> {
  await db.runAsync("DELETE FROM plan_meals WHERE id = ?", [rowId]);
}

/** Swap: replace one row with one-or-more meals in the same (day, slot). */
export async function replaceRow(
  db: SQLiteDatabase,
  planId: string,
  rowId: string,
  day: Day,
  slot: Slot,
  meals: { mealId: string; quantity: number }[],
): Promise<PlanRow[]> {
  const inserted: PlanRow[] = [];
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM plan_meals WHERE id = ?", [rowId]);
    for (const m of meals) {
      inserted.push(
        await insertRow(db, planId, {
          day,
          slot,
          mealId: m.mealId,
          quantity: m.quantity,
        }),
      );
    }
  });
  return inserted;
}

export async function appendRows(
  db: SQLiteDatabase,
  planId: string,
  day: Day,
  slot: Slot,
  meals: { mealId: string; quantity: number }[],
): Promise<PlanRow[]> {
  const inserted: PlanRow[] = [];
  await db.withTransactionAsync(async () => {
    for (const m of meals) {
      inserted.push(
        await insertRow(db, planId, {
          day,
          slot,
          mealId: m.mealId,
          quantity: m.quantity,
        }),
      );
    }
  });
  return inserted;
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
