/**
 * Content floor check (spec 6.8): for every (diet, slot) pair the effective
 * pool — meals visible to that diet in that slot — must have >= 10 meals.
 * Fails the build otherwise. Usage: npm run validate:catalog
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { parseMealsCsv } from "./csv";

const FLOOR = 10;
const DIETS = ["veg", "egg", "non-veg"] as const;
const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
const dietRank: Record<string, number> = { veg: 0, egg: 1, "non-veg": 2 };

const root = path.resolve(__dirname, "..");
const meals = parseMealsCsv(
  fs.readFileSync(path.join(root, "data", "meals.csv"), "utf8"),
);

let failed = false;
for (const diet of DIETS) {
  for (const slot of SLOTS) {
    // Only mains fill slots; sides ride along and don't count.
    const pool = meals.filter(
      (m) =>
        m.role !== "side" &&
        dietRank[m.diet] <= dietRank[diet] &&
        m.slots.split(",").map((s) => s.trim()).includes(slot),
    );
    const status = pool.length >= FLOOR ? "ok " : "FAIL";
    console.log(
      `${status} ${diet.padEnd(7)} ${slot.padEnd(9)} ${pool.length} meals`,
    );
    if (pool.length < FLOOR) failed = true;
  }
}

if (failed) {
  console.error(`\nContent floor violated: every (diet, slot) pool needs >= ${FLOOR} meals.`);
  process.exit(1);
}
console.log("\nCatalog content floor satisfied.");
