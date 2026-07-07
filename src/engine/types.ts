export type Diet = "veg" | "egg" | "non-veg";
export type Slot = "breakfast" | "lunch" | "dinner" | "snack";
export type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type Unit =
  | "g"
  | "ml"
  | "piece"
  | "bowl"
  | "serving"
  | "scoop"
  | "slice"
  | "cup";
export type Difficulty = "easy" | "medium" | "hard";

export const ALL_DAYS: Day[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const ALL_SLOTS: Slot[] = ["breakfast", "lunch", "dinner", "snack"];

export interface Meal {
  id: string;
  name: string;
  slots: Slot[];
  diet: Diet;
  cuisine: string | null;
  country: string | null;
  default_qty: number;
  min_qty: number;
  max_qty: number;
  qty_step: number;
  unit: Unit;
  protein_per_unit: number;
  /** Display-only; the generator never optimizes for calories. */
  kcal_per_unit: number | null;
  difficulty: Difficulty | null;
  prep_time_min: number | null;
  allergens: string[];
}

export interface PlannedMeal {
  day: Day;
  slot: Slot;
  mealId: string;
  quantity: number;
}

export interface GeneratorInput {
  meals: Meal[];
  diet: Diet;
  proteinGoal: number;
  slots: Slot[];
  days: Day[];
  existingWeek?: PlannedMeal[];
  /** Preferred cuisines (soft scoring boost only). Empty = no preference. */
  cuisinePrefs?: string[];
  rngSeed?: number;
}

export interface GeneratorConfig {
  W_protein: number;
  W_consec: number;
  W_repeat: number;
  /** Soft bonus when a meal's cuisine is in the user's preferred set. */
  W_cuisine: number;
  jitter: number;
  weeklyCap: number;
  repairBand: number; // ±fraction of goal, e.g. 0.1
  topN: number;
}

export const DEFAULT_CONFIG: GeneratorConfig = {
  W_protein: 10,
  W_consec: 4,
  W_repeat: 2,
  W_cuisine: 2,
  jitter: 1.5,
  weeklyCap: 2,
  repairBand: 0.1,
  topN: 3,
};

export class CatalogTooSmallError extends Error {
  constructor(
    public readonly day: Day,
    public readonly slot: Slot,
  ) {
    super(`No eligible meals for ${day} ${slot} even after relaxing rules`);
    this.name = "CatalogTooSmallError";
  }
}

export const dietRank: Record<Diet, number> = { veg: 0, egg: 1, "non-veg": 2 };

export function isDietCompatible(mealDiet: Diet, userDiet: Diet): boolean {
  return dietRank[mealDiet] <= dietRank[userDiet];
}
