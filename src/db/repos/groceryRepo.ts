import type { SQLiteDatabase } from "expo-sqlite";
import { newId, nowIso } from "@/utils/ids";

/** Design's grocery sections; "Other" holds custom dishes without recipes. */
export type GroceryCategory =
  | "Protein"
  | "Vegetables"
  | "Fruits"
  | "Dairy"
  | "Grains & Carbs"
  | "Pantry Items"
  | "Other";

export interface GroceryItem {
  id: string;
  planId: string;
  name: string;
  amount: number;
  unit: string;
  category: GroceryCategory;
  isChecked: boolean;
}

interface GroceryRow {
  id: string;
  plan_id: string;
  name: string;
  amount: number;
  unit: string;
  category: string;
  is_checked: number;
}

export async function getItems(
  db: SQLiteDatabase,
  planId: string,
): Promise<GroceryItem[]> {
  const rows = await db.getAllAsync<GroceryRow>(
    "SELECT * FROM grocery_items WHERE plan_id = ? ORDER BY category, name",
    [planId],
  );
  return rows.map((r) => ({
    id: r.id,
    planId: r.plan_id,
    name: r.name,
    amount: r.amount,
    unit: r.unit,
    category: r.category as GroceryCategory,
    isChecked: r.is_checked === 1,
  }));
}

/** Regeneration replaces the whole list (checked state resets, per spec 5.5). */
export async function replaceItems(
  db: SQLiteDatabase,
  planId: string,
  items: Omit<GroceryItem, "id" | "planId" | "isChecked">[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM grocery_items WHERE plan_id = ?", [planId]);
    for (const item of items) {
      await db.runAsync(
        "INSERT INTO grocery_items (id, plan_id, name, amount, unit, category, is_checked, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
        [newId(), planId, item.name, item.amount, item.unit, item.category, nowIso()],
      );
    }
  });
}

/** Used by backup import to restore items including checked state. */
export async function insertItem(
  db: SQLiteDatabase,
  item: Omit<GroceryItem, "id">,
): Promise<void> {
  await db.runAsync(
    "INSERT INTO grocery_items (id, plan_id, name, amount, unit, category, is_checked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      newId(),
      item.planId,
      item.name,
      item.amount,
      item.unit,
      item.category,
      item.isChecked ? 1 : 0,
      nowIso(),
    ],
  );
}

export async function setChecked(
  db: SQLiteDatabase,
  itemId: string,
  isChecked: boolean,
): Promise<void> {
  await db.runAsync("UPDATE grocery_items SET is_checked = ? WHERE id = ?", [
    isChecked ? 1 : 0,
    itemId,
  ]);
}
