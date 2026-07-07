import { scoreMeal } from "./scoring";
import {
  ALL_DAYS,
  CatalogTooSmallError,
  DEFAULT_CONFIG,
  isDietCompatible,
} from "./types";
import type {
  Day,
  Diet,
  GeneratorConfig,
  GeneratorInput,
  Meal,
  PlannedMeal,
  Slot,
} from "./types";

/** Deterministic PRNG (mulberry32). Injectable via GeneratorInput.rngSeed. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WeekState {
  catalog: Meal[];
  diet: Diet;
  proteinGoal: number;
  slots: Slot[];
  /** Every planned meal currently known for the week. */
  planned: PlannedMeal[];
}

export interface Candidate {
  meal: Meal;
  score: number;
}

interface CandidateOptions {
  config?: GeneratorConfig;
  rng?: () => number;
  /** For swap: hide the meal currently occupying the slot. */
  excludeMealId?: string;
}

function mealById(catalog: Meal[], id: string): Meal | undefined {
  return catalog.find((m) => m.id === id);
}

function plannedProtein(pm: PlannedMeal, catalog: Meal[]): number {
  const meal = mealById(catalog, pm.mealId);
  return meal ? meal.protein_per_unit * pm.quantity : 0;
}

function previousDay(day: Day): Day | null {
  const i = ALL_DAYS.indexOf(day);
  return i > 0 ? ALL_DAYS[i - 1] : null;
}

/**
 * Shared filter + score pipeline (spec 6.5). Generation calls it per slot;
 * the Swap bottomsheet calls it and shows the result sorted by score.
 * Entries for (day, slot) itself are ignored, so swapping scores the slot
 * as if it were empty.
 */
export function getCandidates(
  day: Day,
  slot: Slot,
  state: WeekState,
  options: CandidateOptions = {},
): Candidate[] {
  const config = options.config ?? DEFAULT_CONFIG;
  const rng = options.rng ?? Math.random;

  const others = state.planned.filter(
    (pm) => !(pm.day === day && pm.slot === slot),
  );

  const usedToday = new Set(
    others.filter((pm) => pm.day === day).map((pm) => pm.mealId),
  );
  const prev = previousDay(day);
  const usedYesterday = new Set(
    prev ? others.filter((pm) => pm.day === prev).map((pm) => pm.mealId) : [],
  );
  const weeklyCount: Record<string, number> = {};
  for (const pm of others) {
    weeklyCount[pm.mealId] = (weeklyCount[pm.mealId] ?? 0) + 1;
  }

  const proteinSoFar = others
    .filter((pm) => pm.day === day)
    .reduce((sum, pm) => sum + plannedProtein(pm, state.catalog), 0);
  const remainingBudget = state.proteinGoal - proteinSoFar;
  const filledSlots = new Set(
    others.filter((pm) => pm.day === day).map((pm) => pm.slot),
  );
  const slotsLeftIncludingThis = Math.max(
    1,
    state.slots.filter((s) => s === slot || !filledSlots.has(s)).length,
  );

  const base = state.catalog.filter(
    (m) =>
      isDietCompatible(m.diet, state.diet) && // H1
      m.slots.includes(slot) && // H2
      m.id !== options.excludeMealId,
  );

  // Relaxation ladder for H5: drop H4 first, then H3 as a last resort.
  let pool = base.filter(
    (m) => !usedToday.has(m.id) && (weeklyCount[m.id] ?? 0) < config.weeklyCap,
  );
  if (pool.length === 0) {
    pool = base.filter((m) => !usedToday.has(m.id));
  }
  if (pool.length === 0) {
    pool = base;
  }

  const ctx = {
    remainingBudget,
    slotsLeftIncludingThis,
    usedYesterday,
    weeklyCount,
  };
  return pool
    .map((meal) => ({ meal, score: scoreMeal(meal, ctx, config, rng) }))
    .sort((a, b) => b.score - a.score);
}

/** Weighted-random pick among the top N by score (spec 6.4). */
function pickCandidate(
  candidates: Candidate[],
  topN: number,
  rng: () => number,
): Meal {
  const top = candidates.slice(0, topN);
  const minTopScore = top[top.length - 1].score;
  const weights = top.map((c) => c.score - minTopScore + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < top.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return top[i].meal;
  }
  return top[top.length - 1].meal;
}

function dayProteinTotal(
  planned: PlannedMeal[],
  day: Day,
  catalog: Meal[],
): number {
  return planned
    .filter((pm) => pm.day === day)
    .reduce((sum, pm) => sum + plannedProtein(pm, catalog), 0);
}

/**
 * Phase 2 - protein repair (spec 6.6). Mutates quantities (and at most one
 * meal id) for `day` inside `planned`. Two passes maximum, never loops.
 */
function repairDay(
  day: Day,
  state: WeekState,
  config: GeneratorConfig,
  rng: () => number,
): void {
  const { catalog, proteinGoal, planned } = state;
  const lower = proteinGoal * (1 - config.repairBand);
  const upper = proteinGoal * (1 + config.repairBand);

  const dayMeals = () =>
    planned
      .filter((pm) => pm.day === day)
      .map((pm) => ({ pm, meal: mealById(catalog, pm.mealId)! }))
      .filter((x) => x.meal !== undefined);

  const scaleUp = () => {
    const entries = dayMeals().sort(
      (a, b) => b.meal.protein_per_unit - a.meal.protein_per_unit,
    );
    for (const { pm, meal } of entries) {
      while (
        dayProteinTotal(planned, day, catalog) < lower &&
        pm.quantity + meal.qty_step <= meal.max_qty + 1e-9
      ) {
        pm.quantity = Math.min(meal.max_qty, pm.quantity + meal.qty_step);
      }
      if (dayProteinTotal(planned, day, catalog) >= lower) return;
    }
  };

  const total = dayProteinTotal(planned, day, catalog);

  if (total < lower) {
    scaleUp();
    if (dayProteinTotal(planned, day, catalog) < lower) {
      // Replace the lowest-protein slot with the highest-protein valid
      // candidate for that slot, then scale once more.
      const entries = dayMeals().sort(
        (a, b) =>
          a.meal.protein_per_unit * a.pm.quantity -
          b.meal.protein_per_unit * b.pm.quantity,
      );
      const weakest = entries[0];
      if (weakest) {
        const candidates = getCandidates(day, weakest.pm.slot, state, {
          config,
          rng,
          excludeMealId: weakest.pm.mealId,
        });
        if (candidates.length > 0) {
          const best = candidates.reduce((a, b) =>
            b.meal.protein_per_unit * b.meal.default_qty >
            a.meal.protein_per_unit * a.meal.default_qty
              ? b
              : a,
          );
          weakest.pm.mealId = best.meal.id;
          weakest.pm.quantity = best.meal.default_qty;
          scaleUp();
        }
      }
      // If still short: accept as-is; the UI shows the honest total.
    }
    return;
  }

  if (total > upper) {
    const entries = dayMeals().sort(
      (a, b) => b.meal.protein_per_unit - a.meal.protein_per_unit,
    );
    for (const { pm, meal } of entries) {
      while (
        dayProteinTotal(planned, day, catalog) > upper &&
        pm.quantity - meal.qty_step >= meal.min_qty - 1e-9
      ) {
        pm.quantity = Math.max(meal.min_qty, pm.quantity - meal.qty_step);
      }
      if (dayProteinTotal(planned, day, catalog) <= upper) return;
    }
    // Still over: accept as-is.
  }
}

/**
 * Phase 1 + 2 (spec 6.4/6.6). Returns planned meals for `input.days` only.
 * Any existingWeek entries for those days are discarded and regenerated;
 * entries for other days constrain weekly caps and consecutive-day checks.
 */
export function generateWeek(
  input: GeneratorInput,
  config: GeneratorConfig = DEFAULT_CONFIG,
): PlannedMeal[] {
  const rng = createRng(input.rngSeed ?? Math.floor(Math.random() * 2 ** 31));
  const regenDays = new Set(input.days);
  const planned: PlannedMeal[] = (input.existingWeek ?? [])
    .filter((pm) => !regenDays.has(pm.day))
    .map((pm) => ({ ...pm }));

  const state: WeekState = {
    catalog: input.meals,
    diet: input.diet,
    proteinGoal: input.proteinGoal,
    slots: input.slots,
    planned,
  };

  for (const day of input.days) {
    for (const slot of input.slots) {
      const candidates = getCandidates(day, slot, state, { config, rng });
      if (candidates.length === 0) {
        throw new CatalogTooSmallError(day, slot);
      }
      const pick = pickCandidate(candidates, config.topN, rng);
      planned.push({
        day,
        slot,
        mealId: pick.id,
        quantity: pick.default_qty,
      });
    }
    repairDay(day, state, config, rng);
  }

  return planned.filter((pm) => regenDays.has(pm.day));
}
