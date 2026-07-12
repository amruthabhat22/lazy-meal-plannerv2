import type { SQLiteDatabase } from "expo-sqlite";
import type { Diet, Difficulty, Meal, Slot, Unit } from "@/engine/types";

export interface MealRow {
  id: string;
  name: string;
  slots: string;
  diet: string;
  cuisine: string | null;
  cuisines: string | null;
  country: string | null;
  role: string | null;
  default_side: string | null;
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
  ingredients_json: string | null;
  steps_json: string | null;
}

/** Grocery categories, matching the design's six sections. */
export type IngredientCategory =
  | "Protein"
  | "Vegetables"
  | "Fruits"
  | "Dairy"
  | "Grains & Carbs"
  | "Pantry Items";

/** One structured recipe ingredient, scaled to the meal's default_qty. */
export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  category: IngredientCategory;
}

export interface MealRecipe {
  mealId: string;
  ingredients: RecipeIngredient[];
  steps: string[];
}

function parseRecipe(row: {
  id: string;
  ingredients_json: string | null;
  steps_json: string | null;
}): MealRecipe | null {
  if (!row.ingredients_json || !row.steps_json) return null;
  try {
    return {
      mealId: row.id,
      ingredients: JSON.parse(row.ingredients_json) as RecipeIngredient[],
      steps: JSON.parse(row.steps_json) as string[],
    };
  } catch {
    return null;
  }
}

/** Recipe (ingredients + steps) for one meal; null for custom dishes. */
export async function getRecipeByMealId(
  db: SQLiteDatabase,
  mealId: string,
): Promise<MealRecipe | null> {
  const row = await db.getFirstAsync<{
    id: string;
    ingredients_json: string | null;
    steps_json: string | null;
  }>("SELECT id, ingredients_json, steps_json FROM meals WHERE id = ?", [
    mealId,
  ]);
  return row ? parseRecipe(row) : null;
}

/** Recipes for many meals at once (grocery aggregation). */
export async function getRecipesByMealIds(
  db: SQLiteDatabase,
  mealIds: string[],
): Promise<Map<string, MealRecipe>> {
  const result = new Map<string, MealRecipe>();
  if (mealIds.length === 0) return result;
  const placeholders = mealIds.map(() => "?").join(",");
  const rows = await db.getAllAsync<{
    id: string;
    ingredients_json: string | null;
    steps_json: string | null;
  }>(
    `SELECT id, ingredients_json, steps_json FROM meals WHERE id IN (${placeholders})`,
    mealIds,
  );
  for (const row of rows) {
    const recipe = parseRecipe(row);
    if (recipe) result.set(row.id, recipe);
  }
  return result;
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
    // Fall back to the legacy single-cuisine column for old rows.
    cuisines: splitList(row.cuisines ?? row.cuisine),
    country: row.country,
    role: row.role === "side" ? "side" : "main",
    default_side: row.default_side,
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
