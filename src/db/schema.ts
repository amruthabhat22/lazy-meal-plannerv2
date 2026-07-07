import type { SQLiteDatabase } from "expo-sqlite";

export const DB_NAME = "lazy-meal-planner.db";

/**
 * Ordered migrations. Each entry runs once; the applied count is tracked in
 * app_meta under 'schema_version'. Append-only — never edit a shipped entry.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    diet TEXT NOT NULL,
    protein_goal INTEGER NOT NULL,
    meals_per_day INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slots TEXT NOT NULL,
    diet TEXT NOT NULL,
    cuisine TEXT,
    country TEXT,
    default_qty REAL NOT NULL,
    min_qty REAL NOT NULL,
    max_qty REAL NOT NULL,
    qty_step REAL NOT NULL,
    unit TEXT NOT NULL,
    protein_per_unit REAL NOT NULL,
    difficulty TEXT,
    prep_time_min INTEGER,
    allergens TEXT,
    is_custom INTEGER NOT NULL DEFAULT 0,
    catalog_version INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS week_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plan_meals (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES week_plans(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    slot TEXT NOT NULL,
    meal_id TEXT NOT NULL REFERENCES meals(id),
    quantity REAL NOT NULL,
    UNIQUE(plan_id, day, slot)
  );

  CREATE TABLE IF NOT EXISTS grocery_items (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES week_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    unit TEXT NOT NULL,
    category TEXT NOT NULL,
    is_checked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  // v2: calories on meals (display-only), cuisine preferences on user_preferences.
  `
  ALTER TABLE meals ADD COLUMN kcal_per_unit REAL;
  ALTER TABLE user_preferences ADD COLUMN cuisines TEXT NOT NULL DEFAULT '';
  `,
];

export async function getMeta(
  db: SQLiteDatabase,
  key: string,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    [key],
  );
  return row?.value ?? null;
}

export async function setMeta(
  db: SQLiteDatabase,
  key: string,
  value: string,
): Promise<void> {
  await db.runAsync(
    "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

  // app_meta must exist before we can read schema_version from it.
  await db.execAsync(
    "CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
  );
  const applied = Number((await getMeta(db, "schema_version")) ?? "0");

  for (let i = applied; i < MIGRATIONS.length; i++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[i]);
      await setMeta(db, "schema_version", String(i + 1));
    });
  }
}
