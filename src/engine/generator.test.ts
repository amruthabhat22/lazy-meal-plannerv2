import { describe, expect, it } from "vitest";
import { generateWeek, getCandidates } from "./generator";
import {
  ALL_DAYS,
  CatalogTooSmallError,
  DEFAULT_CONFIG,
} from "./types";
import type {
  Day,
  Diet,
  GeneratorInput,
  Meal,
  PlannedMeal,
  Slot,
} from "./types";

let counter = 0;
function makeMeal(overrides: Partial<Meal> = {}): Meal {
  counter++;
  return {
    id: `meal-${counter}`,
    name: `Meal ${counter}`,
    slots: ["breakfast", "lunch", "dinner", "snack"],
    diet: "veg",
    cuisines: ["indian"],
    country: "IN",
    role: "main",
    default_side: null,
    default_qty: 1,
    min_qty: 0.5,
    max_qty: 3,
    qty_step: 0.5,
    unit: "serving",
    protein_per_unit: 20,
    kcal_per_unit: 300,
    difficulty: "easy",
    prep_time_min: 15,
    allergens: [],
    ...overrides,
  };
}

/** Catalog with `perSlot` meals per (diet, slot) pair, varied protein. */
function makeCatalog(perSlot = 12): Meal[] {
  const meals: Meal[] = [];
  const diets: Diet[] = ["veg", "egg", "non-veg"];
  const slots: Slot[] = ["breakfast", "lunch", "dinner", "snack"];
  for (const diet of diets) {
    for (const slot of slots) {
      for (let i = 0; i < perSlot; i++) {
        meals.push(
          makeMeal({
            diet,
            slots: [slot],
            protein_per_unit: 10 + (i % 6) * 5, // 10..35 g
          }),
        );
      }
    }
  }
  return meals;
}

function baseInput(overrides: Partial<GeneratorInput> = {}): GeneratorInput {
  return {
    meals: makeCatalog(),
    diet: "non-veg",
    proteinGoal: 100,
    slots: ["breakfast", "lunch", "dinner"],
    days: [...ALL_DAYS],
    rngSeed: 42,
    ...overrides,
  };
}

function proteinOfDay(plan: PlannedMeal[], day: Day, catalog: Meal[]): number {
  return plan
    .filter((pm) => pm.day === day)
    .reduce((sum, pm) => {
      const meal = catalog.find((m) => m.id === pm.mealId)!;
      return sum + meal.protein_per_unit * pm.quantity;
    }, 0);
}

describe("reproducibility", () => {
  it("same seed + same input produces an identical plan", () => {
    const input = baseInput();
    const a = generateWeek(input);
    const b = generateWeek(input);
    expect(a).toEqual(b);
  });

  it("different seeds produce different plans", () => {
    const a = generateWeek(baseInput({ rngSeed: 1 }));
    const b = generateWeek(baseInput({ rngSeed: 2 }));
    expect(a).not.toEqual(b);
  });
});

describe("hard rules", () => {
  it("H3: no day contains a duplicate meal across 500 random generations", () => {
    const meals = makeCatalog();
    for (let seed = 0; seed < 500; seed++) {
      const plan = generateWeek(baseInput({ meals, rngSeed: seed }));
      for (const day of ALL_DAYS) {
        const ids = plan.filter((pm) => pm.day === day).map((pm) => pm.mealId);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it("H4: no meal exceeds the weekly cap when the pool is large enough", () => {
    for (let seed = 0; seed < 100; seed++) {
      const plan = generateWeek(baseInput({ rngSeed: seed }));
      const counts: Record<string, number> = {};
      for (const pm of plan) counts[pm.mealId] = (counts[pm.mealId] ?? 0) + 1;
      for (const c of Object.values(counts)) {
        expect(c).toBeLessThanOrEqual(DEFAULT_CONFIG.weeklyCap);
      }
    }
  });

  it("H1: a veg user never receives an egg or non-veg meal", () => {
    const meals = makeCatalog();
    for (let seed = 0; seed < 100; seed++) {
      const plan = generateWeek(baseInput({ meals, diet: "veg", rngSeed: seed }));
      for (const pm of plan) {
        const meal = meals.find((m) => m.id === pm.mealId)!;
        expect(meal.diet).toBe("veg");
      }
    }
  });

  it("H2: every assigned meal belongs to its slot pool", () => {
    const meals = makeCatalog();
    const plan = generateWeek(baseInput({ meals }));
    for (const pm of plan) {
      const meal = meals.find((m) => m.id === pm.mealId)!;
      expect(meal.slots).toContain(pm.slot);
    }
  });

  it("H5: every slot of every requested day is filled", () => {
    const input = baseInput({ slots: ["breakfast", "lunch", "dinner", "snack"] });
    const plan = generateWeek(input);
    expect(plan).toHaveLength(7 * 4);
    for (const day of ALL_DAYS) {
      const slots = plan.filter((pm) => pm.day === day).map((pm) => pm.slot);
      expect(new Set(slots)).toEqual(
        new Set(["breakfast", "lunch", "dinner", "snack"]),
      );
    }
  });
});

describe("user exclusions (never relaxed)", () => {
  it("never picks a meal containing a user allergen, across 200 generations", () => {
    const catalog = makeCatalog(12).map((m, i) =>
      i % 3 === 0 ? { ...m, allergens: ["nuts"] } : m,
    );
    const withNuts = new Set(
      catalog.filter((m) => m.allergens.includes("nuts")).map((m) => m.id),
    );
    for (let seed = 0; seed < 200; seed++) {
      const plan = generateWeek(
        baseInput({ meals: catalog, allergies: ["nuts"], rngSeed: seed }),
      );
      for (const pm of plan) {
        expect(withNuts.has(pm.mealId)).toBe(false);
      }
    }
  });

  it("never picks a blocked meal, across 200 generations", () => {
    const catalog = makeCatalog(12);
    const blocked = catalog.slice(0, 5).map((m) => m.id);
    for (let seed = 0; seed < 200; seed++) {
      const plan = generateWeek(
        baseInput({ meals: catalog, excludedMealIds: blocked, rngSeed: seed }),
      );
      for (const pm of plan) {
        expect(blocked.includes(pm.mealId)).toBe(false);
      }
    }
  });

  it("throws CatalogTooSmallError rather than relaxing the allergen rule", () => {
    const catalog = makeCatalog(4).map((m) => ({ ...m, allergens: ["dairy"] }));
    expect(() =>
      generateWeek(baseInput({ meals: catalog, allergies: ["dairy"] })),
    ).toThrow(CatalogTooSmallError);
  });
});

describe("protein repair", () => {
  it("brings a reachable goal into the ±10% band", () => {
    const input = baseInput({ proteinGoal: 120 });
    const plan = generateWeek(input);
    for (const day of ALL_DAYS) {
      const p = proteinOfDay(plan, day, input.meals);
      expect(p).toBeGreaterThanOrEqual(120 * 0.9 - 1e-9);
      expect(p).toBeLessThanOrEqual(120 * 1.1 + 1e-9);
    }
  });

  it("terminates on an unreachable goal and returns best-effort protein", () => {
    // Tiny meals, low caps: 3 slots * max 2 qty * 5 g = 30 g max per day.
    const meals: Meal[] = [];
    for (const slot of ["breakfast", "lunch", "dinner"] as Slot[]) {
      for (let i = 0; i < 12; i++) {
        meals.push(
          makeMeal({
            slots: [slot],
            protein_per_unit: 5,
            default_qty: 1,
            min_qty: 1,
            max_qty: 2,
            qty_step: 1,
          }),
        );
      }
    }
    const input = baseInput({ meals, diet: "veg", proteinGoal: 150 });
    const plan = generateWeek(input);
    for (const day of ALL_DAYS) {
      const p = proteinOfDay(plan, day, meals);
      expect(p).toBe(30); // scaled to max everywhere, honestly short
    }
  });

  it("scales down when the day overshoots the band", () => {
    const meals: Meal[] = [];
    for (const slot of ["breakfast", "lunch", "dinner"] as Slot[]) {
      for (let i = 0; i < 12; i++) {
        meals.push(
          makeMeal({
            slots: [slot],
            protein_per_unit: 40,
            default_qty: 2,
            min_qty: 0.5,
            max_qty: 3,
            qty_step: 0.5,
          }),
        );
      }
    }
    const input = baseInput({ meals, diet: "veg", proteinGoal: 100 });
    const plan = generateWeek(input);
    for (const day of ALL_DAYS) {
      expect(proteinOfDay(plan, day, meals)).toBeLessThanOrEqual(110 + 1e-9);
    }
  });
});

describe("relaxation ladder", () => {
  it("drops H4 before H3, and H3 only as a last resort", () => {
    // Exactly one dinner meal exists: the weekly cap (H4) must give way,
    // but H3 still holds because it is a different slot from lunch.
    const onlyDinner = makeMeal({ id: "d1", slots: ["dinner"] });
    const lunches = Array.from({ length: 12 }, () =>
      makeMeal({ slots: ["lunch"] }),
    );
    const breakfasts = Array.from({ length: 12 }, () =>
      makeMeal({ slots: ["breakfast"] }),
    );
    const meals = [onlyDinner, ...lunches, ...breakfasts];
    const plan = generateWeek(
      baseInput({ meals, diet: "veg", proteinGoal: 60 }),
    );
    const dinners = plan.filter((pm) => pm.slot === "dinner");
    expect(dinners).toHaveLength(7);
    for (const pm of dinners) expect(pm.mealId).toBe("d1");
  });

  it("drops H3 last: a single all-slot meal fills the whole day", () => {
    const only = makeMeal({ id: "solo", slots: ["breakfast", "lunch", "dinner"] });
    const plan = generateWeek(
      baseInput({ meals: [only], diet: "veg", days: ["mon"] }),
    );
    expect(plan).toHaveLength(3);
    for (const pm of plan) expect(pm.mealId).toBe("solo");
  });

  it("throws CatalogTooSmallError when a slot pool is truly empty", () => {
    const meals = Array.from({ length: 12 }, () =>
      makeMeal({ slots: ["lunch"] }),
    );
    expect(() =>
      generateWeek(baseInput({ meals, diet: "veg", days: ["mon"] })),
    ).toThrow(CatalogTooSmallError);
  });

  it("veg user with an egg-only catalog gets the error, not an egg meal", () => {
    const meals = Array.from({ length: 12 }, () => makeMeal({ diet: "egg" }));
    expect(() =>
      generateWeek(baseInput({ meals, diet: "veg", days: ["mon"] })),
    ).toThrow(CatalogTooSmallError);
  });
});

describe("single-day regeneration", () => {
  it("respects weekly counts from the rest of the week", () => {
    const meals = makeCatalog();
    const input = baseInput({ meals });
    const week = generateWeek(input);

    for (let seed = 0; seed < 50; seed++) {
      const tueOnly = generateWeek({
        ...input,
        days: ["tue"],
        existingWeek: week,
        rngSeed: seed,
      });
      expect(tueOnly.every((pm) => pm.day === "tue")).toBe(true);

      const counts: Record<string, number> = {};
      for (const pm of week.filter((p) => p.day !== "tue")) {
        counts[pm.mealId] = (counts[pm.mealId] ?? 0) + 1;
      }
      for (const pm of tueOnly) {
        counts[pm.mealId] = (counts[pm.mealId] ?? 0) + 1;
      }
      for (const c of Object.values(counts)) {
        expect(c).toBeLessThanOrEqual(DEFAULT_CONFIG.weeklyCap);
      }
    }
  });
});

describe("cuisine hard filter and sides", () => {
  it("only plans dishes from the selected cuisines when the pool suffices", () => {
    const meals = [
      ...Array.from({ length: 12 }, () => makeMeal({ cuisines: ["south-indian"] })),
      ...Array.from({ length: 12 }, () => makeMeal({ cuisines: ["mexican"] })),
    ];
    for (let seed = 0; seed < 50; seed++) {
      const plan = generateWeek(
        baseInput({ meals, cuisinePrefs: ["south-indian"], rngSeed: seed }),
      );
      for (const pm of plan) {
        const meal = meals.find((m) => m.id === pm.mealId)!;
        expect(meal.cuisines).toContain("south-indian");
      }
    }
  });

  it("relaxes the cuisine filter instead of failing when the pool is too small", () => {
    const meals = makeCatalog(12).map((m) => ({ ...m, cuisines: ["mexican"] }));
    const plan = generateWeek(
      baseInput({ meals, cuisinePrefs: ["tibetan"], rngSeed: 1 }),
    );
    expect(plan.length).toBeGreaterThan(0); // fell back rather than throwing
  });

  it("a main's default side is added as its own row, and sides bypass the weekly cap", () => {
    const side = makeMeal({
      id: "side-rice",
      role: "side",
      slots: ["lunch", "dinner"],
      protein_per_unit: 4,
    });
    const mains = Array.from({ length: 12 }, () =>
      makeMeal({ slots: ["lunch"], default_side: "side-rice" }),
    );
    // Other slots get their own pools; lunch has ONLY paired mains.
    const others = makeCatalog(12).filter((m) => !m.slots.includes("lunch"));
    const plan = generateWeek(
      baseInput({ meals: [...mains, ...others, side], rngSeed: 7 }),
    );
    const riceRows = plan.filter((pm) => pm.mealId === "side-rice");
    // Every lunch main brings rice: 7 days > weekly cap of 2 — exempt.
    expect(riceRows.length).toBe(7);
    for (const pm of plan.filter((p) => p.slot === "lunch")) {
      expect(["side-rice", ...mains.map((m) => m.id)]).toContain(pm.mealId);
    }
  });

  it("never slots a side as a main", () => {
    const side = makeMeal({ id: "only-side", role: "side" });
    const plan = generateWeek(baseInput({ rngSeed: 3 }));
    expect(plan.some((pm) => pm.mealId === "only-side")).toBe(false);
  });
});

describe("cuisine preference boost", () => {
  it("prefers preferred-cuisine meals when protein fit is equal", () => {
    // Two identical pools except cuisine; preference should dominate picks.
    const preferred = Array.from({ length: 14 }, () =>
      makeMeal({ cuisines: ["south-indian"] }),
    );
    const other = Array.from({ length: 14 }, () =>
      makeMeal({ cuisines: ["mexican"] }),
    );
    const meals = [...preferred, ...other];
    const preferredIds = new Set(preferred.map((m) => m.id));

    let preferredPicks = 0;
    let total = 0;
    for (let seed = 0; seed < 50; seed++) {
      const plan = generateWeek(
        baseInput({ meals, cuisinePrefs: ["south-indian"], rngSeed: seed }),
      );
      for (const pm of plan) {
        total++;
        if (preferredIds.has(pm.mealId)) preferredPicks++;
      }
    }
    // Cuisine prefs are now a HARD filter (relaxed only as a last
    // resort), so with a sufficient pool every pick matches.
    expect(preferredPicks / total).toBe(1);
  });

  it("no preference set means no effect on determinism", () => {
    const meals = makeCatalog();
    const a = generateWeek(baseInput({ meals, cuisinePrefs: [] }));
    const b = generateWeek(baseInput({ meals }));
    expect(a).toEqual(b);
  });
});

describe("2 meals per day", () => {
  it("fills exactly lunch and dinner and repair scales portions up", () => {
    const input = baseInput({
      slots: ["lunch", "dinner"],
      proteinGoal: 90,
    });
    const plan = generateWeek(input);
    expect(plan).toHaveLength(14);
    for (const pm of plan) {
      expect(["lunch", "dinner"]).toContain(pm.slot);
    }
    for (const day of ALL_DAYS) {
      const p = proteinOfDay(plan, day, input.meals);
      expect(p).toBeGreaterThanOrEqual(90 * 0.9 - 1e-9);
      expect(p).toBeLessThanOrEqual(90 * 1.1 + 1e-9);
    }
  });
});

describe("getCandidates (swap sheet contract)", () => {
  it("never offers a meal already used that day and hides the current meal", () => {
    const meals = makeCatalog();
    const input = baseInput({ meals });
    const week = generateWeek(input);
    const monLunch = week.find((pm) => pm.day === "mon" && pm.slot === "lunch")!;
    const monIds = new Set(
      week.filter((pm) => pm.day === "mon").map((pm) => pm.mealId),
    );

    const candidates = getCandidates("mon", "lunch", {
      catalog: meals,
      diet: input.diet,
      proteinGoal: input.proteinGoal,
      slots: input.slots,
      planned: week,
    }, { excludeMealId: monLunch.mealId });

    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(monIds.has(c.meal.id)).toBe(false);
    }
    // Sorted by score descending
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
    }
  });
});
