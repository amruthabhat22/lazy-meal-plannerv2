import type { SQLiteDatabase } from "expo-sqlite";
import type { Diet } from "@/engine/types";
import { newId, nowIso } from "@/utils/ids";

export interface UserPreferences {
  id: string;
  diet: Diet;
  proteinGoal: number;
  /** Daily calorie target — display/tracking only, never fed to the generator. */
  calorieGoal: number;
  mealsPerDay: 2 | 3 | 4;
  /** Preferred cuisines (soft scoring boost). Empty = no preference. */
  cuisines: string[];
}

interface PrefsRow {
  id: string;
  diet: string;
  protein_goal: number;
  calorie_goal: number | null;
  meals_per_day: number;
  cuisines: string | null;
}

export const DEFAULT_CALORIE_GOAL = 2000;

function normalizeMealsPerDay(n: number): 2 | 3 | 4 {
  return n === 2 || n === 4 ? n : 3;
}

export async function getPreferences(
  db: SQLiteDatabase,
): Promise<UserPreferences | null> {
  const row = await db.getFirstAsync<PrefsRow>(
    "SELECT * FROM user_preferences LIMIT 1",
  );
  if (!row) return null;
  return {
    id: row.id,
    diet: row.diet as Diet,
    proteinGoal: row.protein_goal,
    calorieGoal: row.calorie_goal ?? DEFAULT_CALORIE_GOAL,
    mealsPerDay: normalizeMealsPerDay(row.meals_per_day),
    cuisines: (row.cuisines ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export async function savePreferences(
  db: SQLiteDatabase,
  prefs: Omit<UserPreferences, "id">,
): Promise<UserPreferences> {
  const existing = await getPreferences(db);
  const now = nowIso();
  const cuisines = prefs.cuisines.join(",");
  if (existing) {
    await db.runAsync(
      "UPDATE user_preferences SET diet = ?, protein_goal = ?, calorie_goal = ?, meals_per_day = ?, cuisines = ?, updated_at = ? WHERE id = ?",
      [
        prefs.diet,
        prefs.proteinGoal,
        prefs.calorieGoal,
        prefs.mealsPerDay,
        cuisines,
        now,
        existing.id,
      ],
    );
    return { ...prefs, id: existing.id };
  }
  const id = newId();
  await db.runAsync(
    "INSERT INTO user_preferences (id, diet, protein_goal, calorie_goal, meals_per_day, cuisines, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      prefs.diet,
      prefs.proteinGoal,
      prefs.calorieGoal,
      prefs.mealsPerDay,
      cuisines,
      now,
      now,
    ],
  );
  return { ...prefs, id };
}
