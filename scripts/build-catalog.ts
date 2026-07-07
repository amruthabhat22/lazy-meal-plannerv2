/**
 * CSV -> JSON catalog build (spec section 4).
 * Usage: npm run build:catalog
 *
 * Bump CATALOG_VERSION whenever data/meals.csv changes; the app upserts
 * bundled meals on launch only when this number is higher than installed.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { parseMealsCsv } from "./csv";

const CATALOG_VERSION = 2;

const root = path.resolve(__dirname, "..");
const csvPath = path.join(root, "data", "meals.csv");
const outPath = path.join(root, "assets", "meals.json");

const records = parseMealsCsv(fs.readFileSync(csvPath, "utf8"));

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
}

const bundle = { catalog_version: CATALOG_VERSION, meals: records };
fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n");
console.log(
  `Wrote ${records.length} meals to assets/meals.json (catalog_version ${CATALOG_VERSION})`,
);
