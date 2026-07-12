/**
 * CSV + recipes -> JSON catalog build (spec section 4).
 * Usage: npm run build:catalog
 *
 * Bump CATALOG_VERSION whenever data/meals.csv OR data/recipes.json changes;
 * the app upserts bundled meals on launch only when this number is higher
 * than installed.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { parseMealsCsv } from "./csv";

const CATALOG_VERSION = 6;

const INGREDIENT_CATEGORIES = new Set([
  "Protein",
  "Vegetables",
  "Fruits",
  "Dairy",
  "Grains & Carbs",
  "Pantry Items",
]);

interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  category: string;
}

interface Recipe {
  ingredients: RecipeIngredient[];
  steps: string[];
}

const root = path.resolve(__dirname, "..");
const csvPath = path.join(root, "data", "meals.csv");
const recipesPath = path.join(root, "data", "recipes.json");
const outPath = path.join(root, "assets", "meals.json");

const records = parseMealsCsv(fs.readFileSync(csvPath, "utf8"));
const recipes = JSON.parse(fs.readFileSync(recipesPath, "utf8")) as Record<
  string,
  Recipe
>;

const ids = new Set<string>();
for (const m of records) {
  if (!m.id) throw new Error(`Meal '${m.name}' has an empty id`);
  if (ids.has(m.id)) throw new Error(`Duplicate meal id '${m.id}'`);
  ids.add(m.id);
  if (m.min_qty > m.max_qty || m.default_qty < m.min_qty || m.default_qty > m.max_qty) {
    throw new Error(`Meal '${m.id}': default/min/max quantities inconsistent`);
  }
  if (m.qty_step <= 0) throw new Error(`Meal '${m.id}': qty_step must be > 0`);
  if (m.protein_per_unit <= 0) throw new Error(`Meal '${m.id}': protein_per_unit must be > 0`);
  if (m.role !== "main" && m.role !== "side") {
    throw new Error(`Meal '${m.id}': role must be 'main' or 'side'`);
  }
  if (m.role === "side" && m.default_side) {
    throw new Error(`Meal '${m.id}': a side cannot have a default_side`);
  }
  if (!m.cuisines.trim()) {
    throw new Error(`Meal '${m.id}': needs at least one cuisine tag`);
  }
}
for (const m of records) {
  if (m.default_side) {
    const side = records.find((r) => r.id === m.default_side);
    if (!side) throw new Error(`Meal '${m.id}': default_side '${m.default_side}' not in catalog`);
    if (side.role !== "side") {
      throw new Error(`Meal '${m.id}': default_side '${m.default_side}' is not a side`);
    }
  }
}

// Recipe coverage: every catalog meal needs a usable recipe (the recipe
// sheet and the ingredient-level grocery list depend on it), and recipes
// must not reference meals that don't exist.
for (const m of records) {
  const r = recipes[m.id];
  if (!r) throw new Error(`Meal '${m.id}' has no recipe in data/recipes.json`);
  if (!Array.isArray(r.ingredients) || r.ingredients.length < 1) {
    throw new Error(`Recipe '${m.id}': needs at least 1 ingredient`);
  }
  if (!Array.isArray(r.steps) || r.steps.length < 2) {
    throw new Error(`Recipe '${m.id}': needs at least 2 steps`);
  }
  for (const ing of r.ingredients) {
    if (!ing.name || !ing.unit) {
      throw new Error(`Recipe '${m.id}': ingredient missing name/unit`);
    }
    if (!(typeof ing.amount === "number") || ing.amount <= 0) {
      throw new Error(`Recipe '${m.id}': ingredient '${ing.name}' amount must be > 0`);
    }
    if (!INGREDIENT_CATEGORIES.has(ing.category)) {
      throw new Error(
        `Recipe '${m.id}': ingredient '${ing.name}' has unknown category '${ing.category}'`,
      );
    }
  }
}
for (const id of Object.keys(recipes)) {
  if (!ids.has(id)) throw new Error(`Recipe '${id}' has no matching meal in meals.csv`);
}

const meals = records.map((m) => ({
  ...m,
  ingredients_json: JSON.stringify(recipes[m.id].ingredients),
  steps_json: JSON.stringify(recipes[m.id].steps),
}));

const bundle = { catalog_version: CATALOG_VERSION, meals };
fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n");
console.log(
  `Wrote ${meals.length} meals (with recipes) to assets/meals.json (catalog_version ${CATALOG_VERSION})`,
);
