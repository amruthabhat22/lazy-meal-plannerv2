import type { SQLiteDatabase } from "expo-sqlite";
import { getMeta, setMeta } from "./schema";

/** Shape of one meal inside assets/meals.json (matches meals table columns). */
export interface CatalogMeal {
  id: string;
  name: string;
  slots: string;
  diet: string;
  cuisine: string | null;
  country: string | null;
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
           id, name, slots, diet, cuisine, country,
           default_qty, min_qty, max_qty, qty_step, unit, protein_per_unit,
           kcal_per_unit, difficulty, prep_time_min, allergens, is_custom,
           catalog_version
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           slots = excluded.slots,
           diet = excluded.diet,
           cuisine = excluded.cuisine,
           country = excluded.country,
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
           catalog_version = excluded.catalog_version
         WHERE meals.is_custom = 0`,
        [
          m.id,
          m.name,
          m.slots,
          m.diet,
          m.cuisine,
          m.country,
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
          bundle.catalog_version,
        ],
      );
    }
    await setMeta(db, "catalog_version", String(bundle.catalog_version));
  });

  return { imported: true, version: bundle.catalog_version };
}
