import { create } from "zustand";
import type { SQLiteDatabase } from "expo-sqlite";
import { generateWeek } from "@/engine/generator";
import { ALL_DAYS } from "@/engine/types";
import type { Day, Meal, PlannedMeal, Slot } from "@/engine/types";
import { getAllMeals } from "@/db/repos/mealsRepo";
import {
  createPlan,
  deleteSlotsNotIn,
  getActivePlan,
  getPlanMeals,
  swapMeal,
  updateQuantity,
  upsertPlanMeals,
  type WeekPlan,
} from "@/db/repos/plansRepo";
import type { UserPreferences } from "@/db/repos/preferencesRepo";
import { slotsForPrefs } from "./usePrefsStore";

interface PlanState {
  catalog: Meal[];
  plan: WeekPlan | null;
  planMeals: PlannedMeal[];
  loaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  /** Regenerates the given days (default: whole week) and persists. */
  regenerate: (
    db: SQLiteDatabase,
    prefs: UserPreferences,
    days?: Day[],
  ) => Promise<void>;
  setQuantity: (
    db: SQLiteDatabase,
    day: Day,
    slot: Slot,
    quantity: number,
  ) => void;
  swap: (
    db: SQLiteDatabase,
    day: Day,
    slot: Slot,
    meal: Meal,
  ) => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  catalog: [],
  plan: null,
  planMeals: [],
  loaded: false,

  load: async (db) => {
    const catalog = await getAllMeals(db);
    const plan = await getActivePlan(db);
    const planMeals = plan ? await getPlanMeals(db, plan.id) : [];
    set({ catalog, plan, planMeals, loaded: true });
  },

  regenerate: async (db, prefs, days = ALL_DAYS) => {
    const { catalog, plan: existingPlan, planMeals } = get();
    const slots = slotsForPrefs(prefs);
    const isFullWeek = days.length === ALL_DAYS.length;

    const generated = generateWeek({
      meals: catalog,
      diet: prefs.diet,
      proteinGoal: prefs.proteinGoal,
      slots,
      days,
      existingWeek: isFullWeek ? undefined : planMeals,
    });

    const plan =
      existingPlan ?? (await createPlan(db, "My Week", { makeActive: true }));
    // Drop snack rows if the user moved from 4 to 3 meals a day.
    await deleteSlotsNotIn(db, plan.id, slots);
    await upsertPlanMeals(db, plan.id, generated);
    const kept = planMeals.filter(
      (pm) => !days.includes(pm.day) && slots.includes(pm.slot),
    );
    set({ plan, planMeals: [...kept, ...generated] });
  },

  setQuantity: (db, day, slot, quantity) => {
    const { plan, planMeals } = get();
    if (!plan) return;
    set({
      planMeals: planMeals.map((pm) =>
        pm.day === day && pm.slot === slot ? { ...pm, quantity } : pm,
      ),
    });
    // Persist immediately (spec 5.2: no save button anywhere).
    void updateQuantity(db, plan.id, day, slot, quantity);
  },

  swap: (db, day, slot, meal) => {
    const { plan, planMeals } = get();
    if (!plan) return;
    set({
      planMeals: planMeals.map((pm) =>
        pm.day === day && pm.slot === slot
          ? { ...pm, mealId: meal.id, quantity: meal.default_qty }
          : pm,
      ),
    });
    void swapMeal(db, plan.id, day, slot, meal.id, meal.default_qty);
  },
}));
