import type { SQLiteDatabase } from "expo-sqlite";
import type { Diet, Difficulty, Meal, Slot, Unit } from "@/engine/types";

export interface MealRow {
  id: string;
  name: string;
  slots: string;
  diet: string;
  cuisine: string | null;
  country: string | null;
  default_qty: number;
  min_qty: number;
  max_qty: number;
  qty_step: number;
  unit: string;
  protein_per_unit: number;
  difficulty: string | null;
  prep_time_min: number | null;
  allergens: string | null;
  is_custom: number;
  catalog_version: number;
}

function splitList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function rowToMeal(row: MealRow): Meal {
  return {
    id: row.id,
    name: row.name,
    slots: splitList(row.slots) as Slot[],
    diet: row.diet as Diet,
    cuisine: row.cuisine,
    country: row.country,
    default_qty: row.default_qty,
    min_qty: row.min_qty,
    max_qty: row.max_qty,
    qty_step: row.qty_step,
    unit: row.unit as Unit,
    protein_per_unit: row.protein_per_unit,
    difficulty: (row.difficulty as Difficulty | null) ?? null,
    prep_time_min: row.prep_time_min,
    allergens: splitList(row.allergens),
  };
}

export async function getAllMeals(db: SQLiteDatabase): Promise<Meal[]> {
  const rows = await db.getAllAsync<MealRow>("SELECT * FROM meals ORDER BY name");
  return rows.map(rowToMeal);
}

export async function getMealById(
  db: SQLiteDatabase,
  id: string,
): Promise<Meal | null> {
  const row = await db.getFirstAsync<MealRow>(
    "SELECT * FROM meals WHERE id = ?",
    [id],
  );
  return row ? rowToMeal(row) : null;
}
