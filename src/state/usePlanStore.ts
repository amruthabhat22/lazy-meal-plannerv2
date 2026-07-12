import { create } from "zustand";
import type { SQLiteDatabase } from "expo-sqlite";
import { generateWeek } from "@/engine/generator";
import { ALL_DAYS } from "@/engine/types";
import { getBlockedMealIds } from "@/utils/blockedMeals";
import type { Day, Meal, Slot } from "@/engine/types";
import {
  getAllMeals,
  insertCustomMeal,
  type CustomMealInput,
} from "@/db/repos/mealsRepo";
import {
  appendRows,
  createPlan,
  deleteSlotsNotIn,
  getActivePlan,
  getPlanRows,
  removeRow,
  replaceDays,
  replaceRow,
  updateRowQuantity,
  type PlanRow,
  type WeekPlan,
} from "@/db/repos/plansRepo";
import type { UserPreferences } from "@/db/repos/preferencesRepo";
import { newId } from "@/utils/ids";
import { slotsForPrefs } from "./usePrefsStore";

/** A picked meal for swap/add: catalog meal id or a new custom dish. */
export type MealPick =
  | { kind: "catalog"; mealId: string; quantity: number }
  | { kind: "custom"; input: CustomMealInput };

interface PlanState {
  catalog: Meal[];
  plan: WeekPlan | null;
  planMeals: PlanRow[];
  loaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  /** Regenerates the given days (default: whole week) and persists. */
  regenerate: (
    db: SQLiteDatabase,
    prefs: UserPreferences,
    days?: Day[],
  ) => Promise<void>;
  setRowQuantity: (db: SQLiteDatabase, rowId: string, quantity: number) => void;
  removeMeal: (db: SQLiteDatabase, rowId: string) => void;
  /** Swap one row for one-or-more picks (design's multi-select swap). */
  swapRow: (
    db: SQLiteDatabase,
    rowId: string,
    picks: MealPick[],
  ) => Promise<void>;
  /** Add picks to a (day, slot) without replacing anything. */
  addMeals: (
    db: SQLiteDatabase,
    day: Day,
    slot: Slot,
    picks: MealPick[],
  ) => Promise<void>;
}

async function resolvePicks(
  db: SQLiteDatabase,
  picks: MealPick[],
  catalog: Meal[],
): Promise<{ meals: { mealId: string; quantity: number }[]; newCustom: Meal[] }> {
  const meals: { mealId: string; quantity: number }[] = [];
  const newCustom: Meal[] = [];
  for (const pick of picks) {
    if (pick.kind === "catalog") {
      meals.push({ mealId: pick.mealId, quantity: pick.quantity });
    } else {
      const meal = await insertCustomMeal(db, newId(), pick.input);
      newCustom.push(meal);
      meals.push({ mealId: meal.id, quantity: meal.default_qty });
    }
  }
  void catalog;
  return { meals, newCustom };
}

export const usePlanStore = create<PlanState>((set, get) => ({
  catalog: [],
  plan: null,
  planMeals: [],
  loaded: false,

  load: async (db) => {
    const catalog = await getAllMeals(db);
    const plan = await getActivePlan(db);
    const planMeals = plan ? await getPlanRows(db, plan.id) : [];
    set({ catalog, plan, planMeals, loaded: true });
  },

  regenerate: async (db, prefs, days = ALL_DAYS) => {
    const { catalog, plan: existingPlan, planMeals } = get();
    const slots = slotsForPrefs(prefs);
    const isFullWeek = days.length === ALL_DAYS.length;
    const excludedMealIds = await getBlockedMealIds(db);

    const generated = generateWeek({
      meals: catalog,
      diet: prefs.diet,
      proteinGoal: prefs.proteinGoal,
      slots,
      days,
      existingWeek: isFullWeek ? undefined : planMeals,
      cuisinePrefs: prefs.cuisines,
      allergies: prefs.allergies,
      excludedMealIds,
    });

    const plan =
      existingPlan ?? (await createPlan(db, "My Week", { makeActive: true }));
    // Drop slots outside the current rhythm (e.g. snack after 4 -> 3 meals).
    await deleteSlotsNotIn(db, plan.id, slots);
    const inserted = await replaceDays(db, plan.id, days, generated);
    const kept = planMeals.filter(
      (pm) => !days.includes(pm.day) && slots.includes(pm.slot),
    );
    set({ plan, planMeals: [...kept, ...inserted] });
  },

  setRowQuantity: (db, rowId, quantity) => {
    set({
      planMeals: get().planMeals.map((pm) =>
        pm.id === rowId ? { ...pm, quantity } : pm,
      ),
    });
    // Persist immediately (no save button anywhere in the app).
    void updateRowQuantity(db, rowId, quantity);
  },

  removeMeal: (db, rowId) => {
    set({ planMeals: get().planMeals.filter((pm) => pm.id !== rowId) });
    void removeRow(db, rowId);
  },

  swapRow: async (db, rowId, picks) => {
    const { plan, planMeals, catalog } = get();
    const row = planMeals.find((pm) => pm.id === rowId);
    if (!plan || !row || picks.length === 0) return;
    const { meals, newCustom } = await resolvePicks(db, picks, catalog);
    const inserted = await replaceRow(
      db,
      plan.id,
      rowId,
      row.day,
      row.slot,
      meals,
    );
    const idx = planMeals.findIndex((pm) => pm.id === rowId);
    const next = [...planMeals];
    next.splice(idx, 1, ...inserted);
    set({ planMeals: next, catalog: [...catalog, ...newCustom] });
  },

  addMeals: async (db, day, slot, picks) => {
    const { plan, planMeals, catalog } = get();
    if (!plan || picks.length === 0) return;
    const { meals, newCustom } = await resolvePicks(db, picks, catalog);
    const inserted = await appendRows(db, plan.id, day, slot, meals);
    set({
      planMeals: [...planMeals, ...inserted],
      catalog: [...catalog, ...newCustom],
    });
  },
}));
