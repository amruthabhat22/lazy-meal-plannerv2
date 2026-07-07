import type { GeneratorConfig, Meal } from "./types";

export interface ScoringContext {
  remainingBudget: number;
  slotsLeftIncludingThis: number;
  usedYesterday: ReadonlySet<string>;
  weeklyCount: Readonly<Record<string, number>>;
  /** Lower-cased preferred cuisines. Empty set = no preference. */
  cuisinePrefs: ReadonlySet<string>;
}

export function defaultProtein(meal: Meal): number {
  return meal.protein_per_unit * meal.default_qty;
}

export function proteinFit(
  meal: Meal,
  remainingBudget: number,
  slotsLeftIncludingThis: number,
): number {
  const target = remainingBudget / slotsLeftIncludingThis;
  if (target <= 0) {
    // Goal already met: favor the smallest contributions.
    return 1 - Math.min(1, defaultProtein(meal) / 100);
  }
  const candidateProtein = defaultProtein(meal);
  return 1 - Math.min(1, Math.abs(candidateProtein - target) / target);
}

export function scoreMeal(
  meal: Meal,
  ctx: ScoringContext,
  config: GeneratorConfig,
  rng: () => number,
): number {
  const fit = proteinFit(meal, ctx.remainingBudget, ctx.slotsLeftIncludingThis);
  const consecPenalty = ctx.usedYesterday.has(meal.id) ? 1 : 0;
  const repeatCount = ctx.weeklyCount[meal.id] ?? 0;
  const cuisineBonus =
    meal.cuisine && ctx.cuisinePrefs.has(meal.cuisine.toLowerCase()) ? 1 : 0;
  return (
    config.W_protein * fit -
    config.W_consec * consecPenalty -
    config.W_repeat * repeatCount +
    config.W_cuisine * cuisineBonus +
    rng() * config.jitter
  );
}
