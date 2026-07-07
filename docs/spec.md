# Lazy Meal Planner - Build Specification (MVP)

This document is a complete, build-ready specification. It defines the product, tech stack, data model, screens, and the week generation algorithm in enough detail to implement without further clarification. Where a decision is needed, the decision has already been made and is stated here.

---

## 1. Product Overview

Lazy Meal Planner is a protein-first meal planning app. The core promise: install the app, answer three questions, and get a full week of meals that hits your protein goal, in under 30 seconds. The user never builds a plan from scratch. The app generates it, and the user only swaps or adjusts what they don't like.

**Positioning:** protein-first, lazy-first. Not a recipe app, not a calorie tracker, not a family planner.

**Platforms:** iOS and Android from a single codebase.

**Architecture principle:** fully offline. No backend, no auth, no network calls in MVP. All data lives on the device. Meal catalog ships bundled with the app.

---

## 2. Tech Stack (fixed decisions, do not substitute)

| Concern | Choice |
|---|---|
| Framework | React Native with Expo (managed workflow) |
| Language | TypeScript, strict mode |
| Navigation | Expo Router |
| Local database | expo-sqlite (modern async API) |
| State management | Zustand |
| Styling | NativeWind (Tailwind for RN) |
| Bottom sheets | @gorhom/bottom-sheet |
| Meal catalog format | Bundled JSON (generated from CSV at build time, see section 4) |
| Backup | JSON export/import via expo-file-system + expo-sharing + expo-document-picker |

Notes:
- No Supabase, no TanStack Query, no network layer of any kind.
- Use the new expo-sqlite API (SQLiteProvider / useSQLiteContext or openDatabaseAsync), not the legacy WebSQL-style API.
- All database access goes through a single data-access layer (repository modules). Screens never touch SQL directly.

---

## 3. SQLite Schema

All IDs are TEXT (UUID v4 generated client-side). All timestamps are ISO 8601 TEXT.

```sql
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,
  diet TEXT NOT NULL,               -- 'veg' | 'egg' | 'non-veg'
  protein_goal INTEGER NOT NULL,    -- grams per day
  meals_per_day INTEGER NOT NULL,   -- 3 or 4 (4 = includes snack)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE meals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slots TEXT NOT NULL,              -- comma-separated: 'breakfast,lunch,dinner,snack'
  diet TEXT NOT NULL,               -- 'veg' | 'egg' | 'non-veg'
  cuisine TEXT,                     -- e.g. 'indian', 'western', 'mediterranean', 'asian'
  country TEXT,                     -- ISO code or name, for future filtering
  default_qty REAL NOT NULL,        -- e.g. 1, 2, 200
  min_qty REAL NOT NULL,
  max_qty REAL NOT NULL,
  qty_step REAL NOT NULL,           -- increment for +/- controls and repair pass, e.g. 0.5 or 50
  unit TEXT NOT NULL,               -- 'g' | 'ml' | 'piece' | 'bowl' | 'serving' | 'scoop' | 'slice' | 'cup'
  protein_per_unit REAL NOT NULL,   -- grams of protein per 1 unit at qty 1
  difficulty TEXT,                  -- 'easy' | 'medium' | 'hard'
  prep_time_min INTEGER,
  allergens TEXT,                   -- comma-separated, may be empty
  is_custom INTEGER NOT NULL DEFAULT 0,  -- 1 = user-created (post-MVP), 0 = bundled
  catalog_version INTEGER NOT NULL       -- version of the bundle this row came from
);

CREATE TABLE week_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE plan_meals (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES week_plans(id) ON DELETE CASCADE,
  day TEXT NOT NULL,                -- 'mon'..'sun'
  slot TEXT NOT NULL,               -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
  meal_id TEXT NOT NULL REFERENCES meals(id),
  quantity REAL NOT NULL,           -- multiplier on the meal's unit, structured, never a display string
  UNIQUE(plan_id, day, slot)
);

CREATE TABLE grocery_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES week_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount REAL NOT NULL,             -- structured numeric amount
  unit TEXT NOT NULL,               -- same unit vocabulary as meals.unit
  category TEXT NOT NULL,           -- 'Protein' | 'Grains' | 'Vegetables' | 'Dairy' | 'Pantry' | 'Other'
  is_checked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE app_meta (
  key TEXT PRIMARY KEY,             -- e.g. 'catalog_version', 'schema_version'
  value TEXT NOT NULL
);
```

Schema rules that matter:

1. **Quantities are always structured.** `amount REAL` + `unit TEXT`, never a display string like "1.2 kg". Display formatting happens in the UI layer only. This is what makes grocery aggregation possible.
2. **One meals table, not per-slot tables.** A meal's slot membership is the `slots` field. A meal tagged `breakfast,dinner` lives in both pools without row duplication.
3. **UNIQUE(plan_id, day, slot)** enforces one meal per slot. Swapping is an UPDATE, not delete+insert.
4. `app_meta.catalog_version` drives the bundled-data import logic (section 4).

---

## 4. Bundled Meal Catalog and Import Logic

### Source of truth
The meal catalog is authored as `meals.csv` (columns exactly matching the `meals` table minus `is_custom`). A build-time script converts it to `assets/meals.json` with a top-level version:

```json
{
  "catalog_version": 1,
  "meals": [ { "id": "...", "name": "...", ... } ]
}
```

The app bundles and reads only the JSON. CSV never ships in the binary. Include the `csv-to-json` conversion script in the repo under `scripts/build-catalog.ts` so the catalog can be regenerated with one command.

### Import logic on app launch

```
onLaunch:
  bundledVersion = read catalog_version from assets/meals.json
  installedVersion = SELECT value FROM app_meta WHERE key = 'catalog_version' (default 0)

  if bundledVersion > installedVersion:
    for each meal in bundle:
      UPSERT into meals by id (INSERT OR REPLACE), preserving is_custom = 0
    do not touch rows where is_custom = 1
    write bundledVersion to app_meta
  else:
    skip entirely (normal launch path, near-zero cost)
```

Upsert by stable ID means an app update can fix a typo or protein value in an existing meal, add new meals, and never destroy user-created meals or user plans (plan_meals reference meal IDs, which never change).

Deleting a meal from the catalog is out of scope for MVP. Never hard-delete a meal row that a plan references.

---

## 5. Screens (MVP scope, exactly these)

### 5.1 Onboarding (first launch only)
Three steps, one question each, big tap targets:
1. Diet: Veg / Egg / Non-veg
2. Daily protein goal: numeric input with sensible presets (60 / 90 / 120 / 150 g) plus custom
3. Meals per day: 3 (breakfast, lunch, dinner) or 4 (adds snack)

On completion: save preferences, generate the first week plan (section 6), navigate to Week screen. Total time from install to full week on screen must be under 30 seconds.

### 5.2 Week Plan (home screen)
- Horizontal day selector (Mon-Sun), current day selected by default
- Vertical list of slot cards for the selected day: meal name, quantity + unit, protein contribution
- Per-day protein summary: "112g / 120g" with a progress bar. Show the honest number even when the goal is not met
- Quantity stepper on each card (+/- by `qty_step`, clamped to min_qty/max_qty), protein numbers update live
- Swap button on each card opens the Swap bottomsheet (5.3)
- "Regenerate day" action per day, "Regenerate week" action in the header. Both re-run the generator
- Every change persists to SQLite immediately. No save button anywhere in the app

### 5.3 Swap Bottomsheet (not a screen)
- Opens from a meal card, ~75% height, @gorhom/bottom-sheet
- Lists valid candidates for that day+slot: `getCandidates(day, slot)` from the generation engine (section 6.5), sorted by score descending
- Each row: name, default qty + unit, protein, prep time
- Search box filters by name
- Tapping a candidate replaces the meal (UPDATE plan_meals), resets quantity to the new meal's default_qty, closes the sheet
- A candidate that would violate a hard rule (already used today) is excluded, not shown disabled

### 5.4 Meal Info Bottomsheet (minimal, not a screen)
- Long-press on a meal card opens a small bottomsheet: name, protein math (qty x protein_per_unit), prep time, difficulty, allergens
- Read-only. No recipe content, no images in MVP

### 5.5 Grocery List
- Generated from the active plan on demand ("Generate list" button, regenerates and replaces unchecked state)
- Aggregation: group plan_meals by ingredient... MVP simplification: meals ARE the grocery items. Each distinct meal in the plan becomes one grocery line: `sum(quantity) across the week` in the meal's unit, mapped to a category. True ingredient decomposition is post-MVP
- Grouped by category, collapsible sections, checkboxes persist
- Checked items stay checked until the list is regenerated

### 5.6 Settings
- Edit diet / protein goal / meals per day (editing regenerates nothing automatically; show a prompt: "Regenerate this week with new settings?")
- Export backup: writes the JSON backup (section 7) and opens the share sheet
- Import backup: document picker, validate, restore, confirm destructive overwrite first
- App version and catalog version display

Explicitly OUT of MVP: auth, cloud sync, meal detail screen, custom meal creation, allergen filtering, cuisine preference, prep-time rules, ingredient-level groceries, notifications, widgets.

---

## 6. Week Generation Algorithm

This is the core of the app. Implement it as a pure TypeScript module (`src/engine/generator.ts`) with no React or DB imports. It takes plain data in and returns a plan out, so it is unit-testable in isolation.

### 6.1 Inputs

```ts
interface GeneratorInput {
  meals: Meal[];               // full catalog, already loaded
  diet: 'veg' | 'egg' | 'non-veg';
  proteinGoal: number;         // grams/day
  slots: Slot[];               // ['breakfast','lunch','dinner'] or [...,'snack']
  days: Day[];                 // ['mon'..'sun'], or a single day for regenerate-day
  existingWeek?: PlannedMeal[]; // for single-day regeneration, so weekly caps and
                               // consecutive-day checks see the rest of the week
  rngSeed?: number;            // injectable for tests
}
```

Diet compatibility: a 'non-veg' user can eat everything. An 'egg' user can eat 'veg' and 'egg' meals. A 'veg' user only 'veg'. Implement as `dietRank = {veg: 0, egg: 1, 'non-veg': 2}` and allow meal if `dietRank[meal.diet] <= dietRank[user.diet]`.

Snacks are full citizens: they count toward the protein goal and obey every rule below. The only slot-specific behavior in the entire engine is pool membership.

### 6.2 Hard rules (never violated except via the relaxation ladder)

- H1 Diet: meal must be diet-compatible
- H2 Slot: meal.slots must include the target slot
- H3 No duplicate meal within the same day, across all slots
- H4 Weekly cap: same meal at most 2 times per week
- H5 Every slot must be filled

### 6.3 Soft rules (scoring)

For each candidate, compute:

```
score =
    W_protein * proteinFit(candidate, remainingBudget, slotsLeft)
  - W_consec  * (1 if candidate was used yesterday in any slot else 0)
  - W_repeat  * weeklyCount[candidate.id]
  + jitter    (uniform random in [0, J])
```

Recommended starting weights: `W_protein = 10`, `W_consec = 4`, `W_repeat = 2`, `J = 1.5`. Put them in a single config object so they are tunable.

**proteinFit** (the heart of the scorer):

```
target = remainingBudget / slotsLeftIncludingThis
candidateProtein = candidate.protein_per_unit * candidate.default_qty
proteinFit = 1 - min(1, abs(candidateProtein - target) / target)
```

This yields 1.0 for a perfect fit, falling to 0 as the candidate misses the per-slot target. Using the remaining budget divided by remaining slots naturally spreads protein across the day instead of front-loading breakfast.

### 6.4 Phase 1 - Selection

```
weeklyCount = counts from existingWeek if provided, else {}

for day in days:
  usedToday = meals already planned for this day (single-day regen), else {}
  proteinSoFar = protein from already-planned slots for this day, else 0

  for slot in slots:
    candidates = catalog
      .filter(H1 diet)
      .filter(H2 slot)
      .filter(not in usedToday)          // H3
      .filter(weeklyCount[id] < 2)       // H4

    // relaxation ladder for H5
    if candidates empty: retry without H4
    if still empty:      retry without H3 (last resort)
    if still empty:      throw CatalogTooSmallError (surfaced as a friendly UI message)

    score all candidates (6.3)
    pick = weighted-random among the top 3 by score,
           weights proportional to (score - minTopScore + 1)
    assign pick at default_qty
    usedToday.add(pick); weeklyCount[pick]++
    proteinSoFar += pick.protein
```

Top-3 weighted sampling plus jitter is deliberate: hitting regenerate must produce a different, comparably good week every time. Argmax would produce the identical plan and make the feature feel broken.

### 6.5 getCandidates(day, slot) - shared with the Swap sheet

Extract the filter + score pipeline into `getCandidates(day, slot, weekState)`. Generation calls it per slot; the Swap bottomsheet calls the exact same function and displays the result sorted by score. One function, two consumers. When called for swap, exclude the currently assigned meal from the list.

### 6.6 Phase 2 - Protein repair (per day)

```
dayProtein = sum over slots of (qty * protein_per_unit)
lower = goal * 0.9; upper = goal * 1.1

if dayProtein < lower:
  meals sorted by protein_per_unit descending:
    increase qty by qty_step (respect max_qty) until in band or all maxed
  if still short:
    replace the lowest-protein slot with the highest-protein valid
    candidate for that slot (hard rules apply), reset to default_qty,
    re-run the scaling loop once
  if STILL short: accept the plan as-is. The UI shows the honest total.

if dayProtein > upper:
  meals sorted by protein_per_unit descending:
    decrease qty by qty_step (respect min_qty) until in band or all at min
  if still over: accept as-is.
```

The repair pass never violates hard rules and never loops more than the two passes described. No infinite loops, ever. An unreachable goal (veg diet, 150g target, small pool) is handled by honest display, not by lying or hanging.

### 6.7 Determinism and testing

The RNG must be injectable (`rngSeed`). Required unit tests:

- Same seed + same input = identical plan (reproducibility)
- No day contains a duplicate meal (H3) across 500 random generations
- No meal exceeds the weekly cap when the pool is large enough (H4)
- Veg user never receives an egg or non-veg meal (H1)
- Protein repair brings a reachable goal into the ±10% band
- Unreachable goal terminates and returns the plan with best-effort protein
- Empty-pool edge: relaxation ladder engages in the right order
- Single-day regeneration respects weekly counts from the rest of the week

### 6.8 Content floor (data requirement, enforced by a script)

Add `scripts/validate-catalog.ts` that fails the build if, for any (diet, slot) pair, the effective pool (meals visible to that diet in that slot) has fewer than 10 meals. Generation quality collapses below that. This script runs alongside the CSV-to-JSON build step.

---

## 7. Backup Format (export/import)

```json
{
  "version": 1,
  "exported_at": "2026-07-06T00:00:00Z",
  "preferences": { "diet": "non-veg", "protein_goal": 120, "meals_per_day": 4 },
  "week_plans": [
    {
      "id": "plan-123", "name": "Week 1", "is_active": true,
      "meals": [ { "day": "mon", "slot": "breakfast", "meal_id": "b-eggs-bhurji", "quantity": 1.5 } ]
    }
  ],
  "grocery_items": [
    { "plan_id": "plan-123", "name": "Eggs Bhurji", "amount": 4.5, "unit": "serving",
      "category": "Protein", "is_checked": false }
  ],
  "custom_meals": []
}
```

Import validates `version`, validates that referenced meal_ids exist in the catalog (unknown IDs are imported but flagged, the UI shows them as "unavailable meal" with a swap prompt), and overwrites local state only after explicit user confirmation.

---

## 8. Project Structure

```
src/
  app/                    # Expo Router routes
    (onboarding)/
    index.tsx             # Week Plan
    grocery.tsx
    settings.tsx
  components/
    MealCard.tsx
    SwapSheet.tsx
    MealInfoSheet.tsx
    ProteinBar.tsx
    DaySelector.tsx
  engine/
    generator.ts          # pure, no RN/DB imports
    generator.test.ts
    scoring.ts
    types.ts
  db/
    schema.ts             # CREATE TABLE statements + migration runner
    repos/
      preferencesRepo.ts
      plansRepo.ts
      mealsRepo.ts
      groceryRepo.ts
    catalogImport.ts      # bundled JSON upsert logic
  state/
    usePlanStore.ts       # Zustand
    usePrefsStore.ts
  utils/
    format.ts             # quantity/unit display formatting lives HERE only
scripts/
  build-catalog.ts        # CSV -> JSON with catalog_version
  validate-catalog.ts     # content floor check
assets/
  meals.json
```

---

## 9. Acceptance Criteria (MVP definition of done)

1. Fresh install to a fully generated week: under 30 seconds, 3 onboarding taps + goal entry
2. Regenerating the week twice produces two different valid plans
3. No network permission required; app fully functional in airplane mode
4. Kill the app mid-edit, reopen: every change is still there
5. Swap sheet never offers a meal already used that day
6. A veg user can browse the entire app and never see a non-veg meal name anywhere
7. Protein totals shown in the UI always equal the sum of card values exactly
8. Export then import on a clean install restores plans, preferences, and checked grocery state
9. Generator unit tests (6.7) all pass
10. Catalog update simulation: bump catalog_version, relaunch, new meals appear, existing plans untouched

## 10. Build Order for Implementation

1. Project scaffold: Expo + TypeScript + Expo Router + NativeWind + Zustand + expo-sqlite
2. DB layer: schema, migration runner, repos, catalog import with a tiny 15-meal placeholder JSON
3. Generator engine + full test suite (pure TS, fastest feedback loop, zero UI dependency)
4. Onboarding flow wired to generator: install-to-week path working end to end
5. Week Plan screen: cards, steppers, protein bar, regenerate day/week
6. Swap bottomsheet + meal info bottomsheet
7. Grocery list: aggregation, categories, checkboxes
8. Settings + backup export/import
9. Polish pass: empty states, CatalogTooSmallError messaging, haptics on swap/check
10. Replace placeholder catalog with the real meals.json (authored separately)
