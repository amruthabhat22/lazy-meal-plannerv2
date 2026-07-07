import type { SQLiteDatabase } from "expo-sqlite";
import type { Diet } from "@/engine/types";
import { newId, nowIso } from "@/utils/ids";

export interface UserPreferences {
  id: string;
  diet: Diet;
  proteinGoal: number;
  mealsPerDay: 3 | 4;
}

interface PrefsRow {
  id: string;
  diet: string;
  protein_goal: number;
  meals_per_day: number;
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
    mealsPerDay: row.meals_per_day === 4 ? 4 : 3,
  };
}

export async function savePreferences(
  db: SQLiteDatabase,
  prefs: Omit<UserPreferences, "id">,
): Promise<UserPreferences> {
  const existing = await getPreferences(db);
  const now = nowIso();
  if (existing) {
    await db.runAsync(
      "UPDATE user_preferences SET diet = ?, protein_goal = ?, meals_per_day = ?, updated_at = ? WHERE id = ?",
      [prefs.diet, prefs.proteinGoal, prefs.mealsPerDay, now, existing.id],
    );
    return { ...prefs, id: existing.id };
  }
  const id = newId();
  await db.runAsync(
    "INSERT INTO user_preferences (id, diet, protein_goal, meals_per_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, prefs.diet, prefs.proteinGoal, prefs.mealsPerDay, now, now],
  );
  return { ...prefs, id };
}
