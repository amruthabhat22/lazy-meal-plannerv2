import type { SQLiteDatabase } from "expo-sqlite";
import { getMeta, setMeta } from "./schema";

/** Shape of one meal inside assets/meals.json (matches meals table columns). */
export interface CatalogMeal {
  id: string;
  name: string;
  slots: string;
  diet: string;
  cuisines: string;
  country: string | null;
  role: string;
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
  allergens: string;
  /** JSON array of {name, amount, unit, category} — see mealsRepo.RecipeIngredient. */
  ingredients_json: string | null;
  /** JSON array of instruction strings. */
  steps_json: string | null;
}

export interface CatalogBundle {
  catalog_version: number;
  meals: CatalogMeal[];
}

/**
 * Spec section 4: upsert bundled meals by stable id when the bundled
 * catalog_version is newer than the installed one. Never touches rows with
 * is_custom = 1, never deletes.
 */
export async function importCatalogIfNewer(
  db: SQLiteDatabase,
  bundle: CatalogBundle,
): Promise<{ imported: boolean; version: number }> {
  const installed = Number((await getMeta(db, "catalog_version")) ?? "0");
  if (bundle.catalog_version <= installed) {
    return { imported: false, version: installed };
  }

  await db.withTransactionAsync(async () => {
    for (const m of bundle.meals) {
      await db.runAsync(
        `INSERT INTO meals (
           id, name, slots, diet, cuisines, country, role, default_side,
           default_qty, min_qty, max_qty, qty_step, unit, protein_per_unit,
           kcal_per_unit, difficulty, prep_time_min, allergens,
           ingredients_json, steps_json, is_custom, catalog_version
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           slots = excluded.slots,
           diet = excluded.diet,
           cuisines = excluded.cuisines,
           country = excluded.country,
           role = excluded.role,
           default_side = excluded.default_side,
           default_qty = excluded.default_qty,
           min_qty = excluded.min_qty,
           max_qty = excluded.max_qty,
           qty_step = excluded.qty_step,
           unit = excluded.unit,
           protein_per_unit = excluded.protein_per_unit,
           kcal_per_unit = excluded.kcal_per_unit,
           difficulty = excluded.difficulty,
           prep_time_min = excluded.prep_time_min,
           allergens = excluded.allergens,
           ingredients_json = excluded.ingredients_json,
           steps_json = excluded.steps_json,
           catalog_version = excluded.catalog_version
         WHERE meals.is_custom = 0`,
        [
          m.id,
          m.name,
          m.slots,
          m.diet,
          m.cuisines,
          m.country,
          m.role,
          m.default_side,
          m.default_qty,
          m.min_qty,
          m.max_qty,
          m.qty_step,
          m.unit,
          m.protein_per_unit,
          m.kcal_per_unit,
          m.difficulty,
          m.prep_time_min,
          m.allergens,
          m.ingredients_json,
          m.steps_json,
          bundle.catalog_version,
        ],
      );
    }
    await setMeta(db, "catalog_version", String(bundle.catalog_version));
  });

  return { imported: true, version: bundle.catalog_version };
}
