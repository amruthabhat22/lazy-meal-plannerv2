import type { SQLiteDatabase } from "expo-sqlite";
import { getMeta, setMeta } from "@/db/schema";

/**
 * "Don't show this dish again" blocklist (meal ids, stored in app_meta —
 * same pattern as share contacts). Blocked meals are hard-excluded by the
 * generator and the swap sheet; existing plan rows are untouched. Managed
 * from the Profile page ("Hidden dishes").
 */

const KEY = "blocked_meal_ids";

export async function getBlockedMealIds(
  db: SQLiteDatabase,
): Promise<string[]> {
  const raw = await getMeta(db, KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function blockMeal(
  db: SQLiteDatabase,
  mealId: string,
): Promise<string[]> {
  const ids = await getBlockedMealIds(db);
  if (!ids.includes(mealId)) ids.push(mealId);
  await setMeta(db, KEY, JSON.stringify(ids));
  return ids;
}

export async function unblockMeal(
  db: SQLiteDatabase,
  mealId: string,
): Promise<string[]> {
  const ids = (await getBlockedMealIds(db)).filter((id) => id !== mealId);
  await setMeta(db, KEY, JSON.stringify(ids));
  return ids;
}
