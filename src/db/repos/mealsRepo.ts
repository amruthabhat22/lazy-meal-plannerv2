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
  kcal_per_unit: number | null;
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
    kcal_per_unit: row.kcal_per_unit,
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

export interface CustomMealInput {
  name: string;
  slot: Slot;
  diet: Diet;
  proteinPerUnit: number;
  kcalPerUnit: number | null;
}

/**
 * "Can't find it? Type a dish" — user-created meal, entered manually
 * (fully offline; no nutrition estimation service). is_custom = 1 rows are
 * never touched by catalog imports.
 */
export async function insertCustomMeal(
  db: SQLiteDatabase,
  id: string,
  input: CustomMealInput,
): Promise<Meal> {
  await db.runAsync(
    `INSERT INTO meals (
       id, name, slots, diet, cuisine, country, default_qty, min_qty, max_qty,
       qty_step, unit, protein_per_unit, kcal_per_unit, difficulty,
       prep_time_min, allergens, is_custom, catalog_version
     ) VALUES (?, ?, ?, ?, NULL, NULL, 1, 0.5, 3, 0.5, 'serving', ?, ?, NULL, NULL, '', 1, 0)`,
    [id, input.name, input.slot, input.diet, input.proteinPerUnit, input.kcalPerUnit],
  );
  return (await getMealById(db, id))!;
}
