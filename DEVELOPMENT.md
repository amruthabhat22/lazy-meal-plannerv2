# Lazy Meal Planner — Developer Guide

Everything you need to run, modify, and ship this project. For product scope
see the spec; for a quick overview see [README.md](README.md).

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | |
| npm | 10+ | Always install with `--legacy-peer-deps` (see §8) |
| Xcode | latest | iOS only, macOS only |
| Android Studio | latest | For the Android SDK + emulator |
| Watchman (optional) | any | Faster file watching on macOS |

No backend, no API keys, no `.env`. The app is fully offline.

---

## 2. Install

```sh
git clone <repo> && cd lazy-meal-planner
npm install --legacy-peer-deps
```

`--legacy-peer-deps` is required: the Expo SDK 57 template pins `react@19.2.3`
while transitive `react-dom` wants `^19.2.7`. react-dom is unused on native,
so this is cosmetic — but plain `npm install` fails without the flag.

---

## 3. Running the app

### 3.1 Quick start (Expo Go — no native build)

```sh
npm start            # starts Metro, prints a QR code
npm run android      # boots/attaches Android emulator + Expo Go
npm run ios          # iOS simulator + Expo Go (macOS only)
```

- **Physical device:** install "Expo Go" from the store, scan the QR code
  from `npm start`. Device and computer must be on the same network.
- **Android emulator:** create one in Android Studio (Device Manager) first,
  or from the CLI: `emulator -avd <name>`. `npm run android` picks up any
  running emulator/connected device.
- Expo Go shows a floating dev-menu bubble that can overlap UI. Drag it out
  of the way; it does not exist in real builds.

All libraries used (expo-sqlite, reanimated, gesture-handler, bottom-sheet)
are bundled in Expo Go, so no dev build is needed for day-to-day work.

### 3.2 Native dev builds (standalone, no Expo Go)

```sh
npx expo run:android   # builds & installs a debug APK
npx expo run:ios       # builds & installs on the iOS simulator
```

First run generates `android/` and `ios/` directories (prebuild). Use this
when you need to test outside Expo Go or add a library with native code
that Expo Go doesn't bundle.

### 3.3 Release builds

- **Cloud (recommended):** `npx eas build --platform android|ios` (needs an
  Expo account; configure `eas.json` on first run with `npx eas build:configure`).
- **Local Android APK:** `npx expo run:android --variant release`.

### 3.4 Web

Not supported. `expo-sqlite` requires extra web configuration and the app
targets iOS/Android only (per spec). Don't use `npm run web`.

---

## 4. Everyday commands

| Command | What it does |
|---|---|
| `npm test` | Generator engine tests (vitest, pure TS, no emulator needed) |
| `npm run test:watch` | Same, watch mode |
| `npm run typecheck` | `tsc --noEmit` (strict mode) |
| `npm run build:catalog` | `data/meals.csv` → `assets/meals.json` |
| `npm run validate:catalog` | Content-floor check (see §5.3) |

Run `typecheck` + `test` + `validate:catalog` before every commit.

---

## 5. The meal catalog (bundled "database" content)

The catalog is the only data that ships with the app. Source of truth is
**`data/meals.csv`** — never edit `assets/meals.json` by hand.

### 5.1 Updating meals

1. Edit `data/meals.csv` (add rows, fix protein values, rename, etc.).
2. Bump `CATALOG_VERSION` in `scripts/build-catalog.ts` (+1).
3. Rebuild and validate:
   ```sh
   npm run build:catalog && npm run validate:catalog
   ```
4. Restart the app. On launch, `src/db/catalogImport.ts` compares the bundled
   version against `app_meta.catalog_version` in SQLite and, if newer,
   **upserts every meal by id**. User plans, custom rows (`is_custom = 1`),
   and preferences are never touched.

Rules that keep updates safe:
- **Meal ids are permanent.** Plans reference them. Fix a typo by editing the
  row, never by changing its id. Never delete a meal that shipped.
- If you forget to bump `CATALOG_VERSION`, installed devices skip the import
  and see stale data.

### 5.2 CSV columns

`id,name,slots,diet,cuisine,country,default_qty,min_qty,max_qty,qty_step,unit,protein_per_unit,difficulty,prep_time_min,allergens`

- `slots`: comma-separated, quoted — e.g. `"breakfast,dinner"`. Valid values:
  breakfast, lunch, dinner, snack.
- `diet`: `veg` | `egg` | `non-veg`. Visibility is hierarchical: veg users see
  only veg; egg users see veg+egg; non-veg users see everything.
- `unit`: g, ml, piece, bowl, serving, scoop, slice, cup.
- `protein_per_unit`: grams of protein per **1 unit** (e.g. per piece, per
  bowl, per gram for `unit=g`).
- `qty_step`: increment used by the +/- steppers and the protein repair pass.
- `allergens`: comma-separated, may be empty.

The build script rejects duplicate ids, inconsistent min/default/max, and
non-positive steps or protein.

### 5.3 Content floor

`npm run validate:catalog` fails if any (diet × slot) pool has fewer than
**10 meals**. The binding constraint is always veg (smallest pool): keep at
least 10 veg meals per slot or generation quality collapses. Run this after
every catalog change; treat failure as a build blocker.

---

## 6. The SQLite database (user data)

Schema lives in `src/db/schema.ts`. Tables: `user_preferences`, `meals`,
`week_plans`, `plan_meals`, `grocery_items`, `app_meta`.

### 6.1 Changing the schema (migrations)

The migration runner applies entries of the `MIGRATIONS` array in order and
records progress in `app_meta.schema_version`. To change the schema:

1. **Append** a new SQL string to `MIGRATIONS` in `src/db/schema.ts`:
   ```ts
   const MIGRATIONS: string[] = [
     `...initial schema...`,
     `ALTER TABLE meals ADD COLUMN rating INTEGER;`,   // new entry
   ];
   ```
2. Never edit or reorder an entry that has shipped — installed devices have
   already run it and will only execute entries beyond their recorded count.
3. Each entry runs inside a transaction; keep one logical change per entry.

### 6.2 Access rules

All SQL goes through the repository modules in `src/db/repos/` (plus
`catalogImport.ts` and `backup.ts`). Screens and stores never touch SQL
directly — keep it that way.

### 6.3 Inspecting / resetting the DB during development

The DB file is `lazy-meal-planner.db` in the app's documents directory.

- **Reset everything (Expo Go, Android):** long-press Expo Go → App info →
  Clear storage. Or reinstall. Simulator equivalent on iOS: delete Expo Go.
- **Easiest data inspection — use the backup:** Settings → Export backup
  gives you all plans/preferences/groceries as readable JSON. Usually enough.
- **Pulling the raw .db file:** store Expo Go is not debuggable, so
  `run-as host.exp.exponent` fails, and Play-Store emulator images refuse
  `adb root` (both verified). You need one of:
  - a **dev build** (`npx expo run:android` is debuggable):
    ```sh
    adb shell "run-as <your.package.id> find /data/data/<your.package.id> -name '*.db'"
    adb shell "run-as <your.package.id> cat <printed-path>" > local.db
    sqlite3 local.db '.tables'
    ```
  - or an emulator created from an **AOSP image (no Play Store)**, where
    `adb root` works and you can `adb pull` the file directly.
- **iOS simulator (dev build):** the app container is on your Mac —
  `xcrun simctl get_app_container booted <bundle.id> data`, then look in
  `Documents/SQLite/`.
- **Quick sanity queries** can also be added temporarily in `_layout.tsx`
  after `initDb` and logged to Metro.

### 6.4 Testing a catalog update end-to-end

1. Launch the app, create a plan, note a meal.
2. Edit that meal's protein in `data/meals.csv`, bump `CATALOG_VERSION`,
   `npm run build:catalog`, reload the app.
3. Expect: new value visible, plan intact, Settings shows the new catalog
   version. This is acceptance criterion #10.

---

## 7. Backups (user-facing export/import)

- Format: JSON, `version: 1` — see `src/db/backup.ts` (`BackupV1`).
- Export: Settings → Export backup → share sheet (file written to app cache).
- Import: Settings → Import backup → picker → **explicit overwrite confirm**.
  Meal ids not present in the installed catalog are restored as stub
  "Unavailable meal" rows (`is_custom = 1`, 0 protein) so plans stay intact
  and the user can swap them out.
- If you ever change the backup shape, bump `version` and keep a reader for
  old versions in `validateBackup`.

---

## 8. Gotchas & troubleshooting

| Symptom | Cause / fix |
|---|---|
| `npm install` fails with ERESOLVE | Use `--legacy-peer-deps` (react-dom peer pin, harmless on native) |
| `Cannot find module 'babel-preset-expo'` | It must be a top-level devDependency because we have a custom `babel.config.js`. `npm i -D --legacy-peer-deps babel-preset-expo` |
| Blank screen / stale UI after editing config files | Config changes (babel/metro/tailwind) need a full restart: kill Metro, `npm start -- --clear` |
| Reanimated crash on start | `react-native-worklets/plugin` must stay **last** in `babel.config.js` plugins |
| Meals didn't update after CSV edit | Forgot `npm run build:catalog`, or forgot to bump `CATALOG_VERSION` |
| "Not enough meals" alert | Relaxation ladder exhausted — catalog too small for that diet/slot; check `npm run validate:catalog` |
| Day chips / layout look wrong on Android | Use `SafeAreaView` from `react-native-safe-area-context`, never from `react-native` (no-op on Android) |
| Floating gear covers app buttons in Expo Go | That's Expo's dev bubble — drag it away; absent in real builds |

---

## 9. Architecture cheat-sheet

```
src/engine/     Pure TS week generator. No React, no DB imports. Test here first.
  generator.ts  Selection (hard rules H1–H5, relaxation ladder, top-3 weighted
                sampling) + protein repair. getCandidates() is shared with the
                swap sheet — one pipeline, two consumers.
  types.ts      Domain types + tunable weights (DEFAULT_CONFIG).
src/db/         schema.ts (migrations) · repos/ (all SQL) · catalogImport.ts ·
                backup.ts
src/state/      Zustand stores; actions take the db handle and persist
                immediately (there is no save button anywhere).
src/app/        Expo Router screens. index = week plan.
src/components/ MealCard, SwapSheet, MealInfoSheet, ProteinBar, DaySelector.
src/utils/      format.ts = the ONLY place quantities are formatted for display.
scripts/        build-catalog.ts, validate-catalog.ts (run via tsx).
data/meals.csv  Catalog source of truth.
assets/meals.json  Generated — do not edit.
```

Engine invariants worth knowing before touching `generator.ts`:
- Quantities are structured (`amount` + `unit`), never display strings.
- Hard rules are only relaxed in the fixed order H4 → H3, then error.
- The repair pass runs at most two passes — no loops, unreachable goals are
  shown honestly instead of "fixed".
- The RNG is injectable (`rngSeed`) — every engine change needs the seed
  tests in `generator.test.ts` to stay green.
