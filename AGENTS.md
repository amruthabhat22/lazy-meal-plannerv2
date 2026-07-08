# Lazy Meal Planner — AI Agent Reference

## v2 design port: COMPLETE (kept for context)

All six steps below are DONE and verified on the Android emulator
(multi-meal slots, multi-select swap/add sheet, WhatsApp share, bottom-nav
tabs, grocery + OrderSheet, 5-step onboarding). Only outstanding item:
**GitHub push** — remote repo auth was never completed
(`~/.local/bin/gh auth login --web`, user enters device code, then create
repo under the user's account and push `main`).

Two intentional notes: BottomNav types a structural subset of
BottomTabBarProps because expo-router vendors its own react-navigation
types (do not add @react-navigation/* as direct deps); grocery reloads via
`useFocusEffect` from expo-router.

<details><summary>Original handoff (historical)</summary>

The app is mid-way through porting the **newer Lovable design** from
https://github.com/amruthabhat22/lazy-meal-planner (public; clone it — it is
the design source of truth, a React web app). Rules for the port: **skip
everything auth-related**, match the design as closely as possible, **do NOT
replace our meal catalog** (`data/meals.csv` — ours is better than the
design's mocks). Custom dishes use MANUAL nutrition entry (user decision; the
design fakes an AI estimate — do not add network calls).

### Already DONE for the v2 port (committed or staged in working tree)

- Migration 3 in `src/db/schema.ts`: plan_meals rebuilt WITHOUT
  UNIQUE(plan_id,day,slot) → **multiple meals per (day, slot)**.
- `src/db/repos/plansRepo.ts` rewritten: `PlanRow` (= PlannedMeal + id),
  `getPlanRows`, `replaceDays`, `updateRowQuantity`, `removeRow`,
  `replaceRow` (swap → 1..n meals), `appendRows`.
- `src/state/usePlanStore.ts` rewritten around PlanRow + `MealPick`
  (catalog | custom) with `swapRow`, `addMeals`, `removeMeal`,
  `setRowQuantity`.
- `src/utils/contacts.ts` (WhatsApp share contacts in app_meta JSON),
  `src/utils/shareMessage.ts` (buildPlanMessage, WhatsApp formatting).
- Tabs: `src/app/(tabs)/_layout.tsx` + `src/components/BottomNav.tsx`
  (Week/Grocery/Profile, Feather icons). Screens moved to
  `(tabs)/index.tsx`, `(tabs)/grocery.tsx`, `(tabs)/profile.tsx`.
- Components rewritten to v2 design: `DaySelector` (label + circular date +
  status dot; `currentWeekDates()`), `StatCard` (3xl values, protein
  color-coded ≥95% success / ≥75% warning / else destructive), `FoodCard`
  (replaces MealCard; stepper below min removes meal), `SwapSheet`
  (multi-select checkboxes, mode "swap"|"add", inline custom-dish form,
  footer CTA "Swap (n)"), `ShareSheet` (contacts + wa.me + native Share).
- Week screen `(tabs)/index.tsx`: slot SECTIONS (Breakfast/Lunch/Snack/
  Dinner order, per-slot protein·cal subtitle, "Add meal" pill, snack
  marked optional), header "Your week 🍲" + regenerate + share buttons.
- `@expo/vector-icons` installed (use `--legacy-peer-deps` for any install).

### REMAINING work (in order)

1. **Grocery screen** `(tabs)/grocery.tsx`: rebuild to v2 design — sticky
   header w/ basket icon + Reset pill; progress card (done/total, %,
   bar: success at 100% / warning ≥50% / primary, encouragement copy);
   Select all row; category cards with count chips (success tint when
   complete) + chevron collapse; sticky bottom CTA "Compare Apps and Order"
   → **new OrderSheet** component (port `src/components/grocery/OrderSheet.tsx`
   from the cloned design repo: Zepto/Blinkit/Instamart/BigBasket cards,
   deterministic hash prices in ₹, "Best value" badge, opens app URLs via
   Linking). Remove the old back/Done button (it's a tab now).
2. **Profile screen** `(tabs)/profile.tsx`: retitle "Profile", remove the
   Done button (tab now), keep ALL existing settings content (diet, goal,
   meals/day incl. 2, cuisines, backup export/import, versions). Skip auth.
3. **Onboarding** `(onboarding)/onboarding.tsx`: rebuild to 5 steps like the
   design's OnboardingFlow: 1 diet (icon cards 🥬🥚🍗) · 2 protein (big
   card, 6xl number, level label <90 Maintenance / <140 Active lifestyle /
   else Muscle building, slider 60–200 step 5, tip pill) · 3 cuisines
   (2-col grid cards w/ emoji icons + check circles; slugs in
   `src/utils/cuisines.ts`) · 4 contacts (optional; add name+phone via
   `src/utils/contacts.ts`) · 5 meals (2/3/4 icon cards 🌗🍽️✨ + PlanSummary
   card) — header: back circle btn + "Lazy Meal Planner" + progress bar;
   fixed bottom CTA "Continue" → "✨ Generate My Week" on last step.
4. **Cleanup**: delete `src/components/MealCard.tsx` (replaced by FoodCard);
   `pan-asian` slug in cuisines.ts should become `asian` (design's slug).
5. **Verify**: `npm run typecheck` && `npm test` (19 tests must pass) &&
   `npm run validate:catalog`; then run on Android emulator
   (`npx expo start --android --clear` — ALWAYS --clear after config
   changes) and screenshot week/swap/grocery/onboarding.
6. Update the human docs (README/DEVELOPMENT) if behavior described there
   changed, commit everything, and push (GitHub auth was never completed —
   run `~/.local/bin/gh auth login --web`, user must enter the device code).

### Design reference material

- Clone https://github.com/amruthabhat22/lazy-meal-planner (React + Tailwind
  v4 + shadcn). Key files: `src/routes/week.tsx`, `src/routes/grocery.tsx`,
  `src/components/week/*`, `src/components/grocery/OrderSheet.tsx`,
  `src/components/onboarding/*`, `src/styles.css` (oklch tokens ≈ our hex
  tokens in `tailwind.config.js` — already matched, don't redo).
- Our NativeWind theme (terracotta #a55a37 on cream #fdfaf4) is already in
  `tailwind.config.js`. Hex constants #a55a37/#291f18/#6c6158/#fefbf8 appear
  inline where RN needs literal colors (icons, sheet backgrounds).

</details>

---

Read this before touching any code. It is the single source of truth for how
this project works, what its invariants are, and how to verify changes.
Human-oriented docs: [README.md](README.md) (overview),
[DEVELOPMENT.md](DEVELOPMENT.md) (run/build/troubleshoot, in more detail).

## Expo has changed

This project uses **Expo SDK 57** (React Native 0.86, React 19). Your training
data is likely stale. Read the exact versioned docs at
https://docs.expo.dev/versions/v57.0.0/ before writing Expo-related code.
Notably: `expo-file-system` has a new class-based API (the old one lives at
`expo-file-system/legacy`, which this project deliberately uses for document
picking — see `src/app/settings.tsx`), and `expo-sqlite` is the modern async
API (`SQLiteProvider` / `getAllAsync` / `runAsync`), never the legacy WebSQL
one.

## What this app is

A protein-first, offline meal planner (iOS + Android, single Expo codebase).
Onboarding asks 3 questions (diet, daily protein goal, meals per day), then a
deterministic-when-seeded algorithm generates a full week of meals hitting the
protein goal. Users only swap/adjust. There is **no backend, no auth, no
network call anywhere** — all data is on-device SQLite, and the meal catalog
ships bundled in the binary. Keep it that way; adding a network layer is a
product decision, not a refactor.

Built from a fixed spec (MVP), then extended with the Lovable visual design
(warm terracotta/cream, tokens in `tailwind.config.js`) and four post-spec
features: calories (display-only), cuisine preferences (soft scoring boost),
a 2-meals-per-day option, and manual custom dishes from the swap sheet.
Still out of scope: meal detail screens, allergen filtering, ingredient-level
groceries, notifications, cloud sync, and any AI nutrition estimation (custom
dishes are entered manually to stay offline).

## Stack (fixed decisions — do not substitute)

TypeScript strict · Expo Router (routes in `src/app/`) · expo-sqlite ·
Zustand · NativeWind v4 (Tailwind classes via `className`) ·
@gorhom/bottom-sheet v5 · vitest (engine tests only, run in Node).

## Layout and layering rules

```
src/engine/       PURE TypeScript. No React, no DB, no Expo imports. Ever.
  types.ts        Domain types, DEFAULT_CONFIG (tunable scoring weights),
                  CatalogTooSmallError, diet-rank helper.
  scoring.ts      proteinFit + weighted scoring.
  generator.ts    generateWeek() + getCandidates() + seeded RNG (mulberry32).
  generator.test.ts  16 tests. MUST stay green. Run: npm test
src/db/
  schema.ts       CREATE TABLEs as an append-only MIGRATIONS array; runner
                  tracks progress in app_meta.schema_version.
  repos/          ALL SQL lives here (+ catalogImport.ts, backup.ts).
                  Screens and stores never write SQL directly.
  catalogImport.ts  Versioned upsert of bundled meals on launch.
  backup.ts       Export/import (BackupV1 JSON). Unknown meal ids on import
                  become "Unavailable meal" stub rows (is_custom=1), never
                  dropped.
src/state/        Zustand stores. Actions take the SQLite db handle as first
                  arg and persist immediately — the app has NO save button.
src/app/          Expo Router screens: _layout (SQLiteProvider + migrate +
                  catalog import + store bootstrap), index (week plan),
                  (onboarding)/onboarding, grocery, settings.
src/components/   MealCard, SwapSheet, MealInfoSheet, ProteinBar, DaySelector.
src/utils/format.ts  The ONLY place quantities/units are formatted for
                  display. Quantities in state/DB are always numeric
                  amount + unit string, never display strings.
data/meals.csv    Catalog source of truth (~60 meals, mostly Indian).
assets/meals.json GENERATED by scripts/build-catalog.ts — never hand-edit.
scripts/          build-catalog.ts (CSV→JSON, owns CATALOG_VERSION),
                  validate-catalog.ts (content floor), csv.ts (parser).
```

## Engine invariants (violating these = wrong, even if tests pass)

- Hard rules: H1 diet-compatible (veg < egg < non-veg hierarchy), H2 slot
  membership, H3 no duplicate meal within a day, H4 max 2× same meal per
  week, H5 every slot filled.
- H5 conflicts are resolved by a fixed relaxation ladder: drop H4, then H3,
  then throw `CatalogTooSmallError` (UI shows a friendly alert). Never
  reorder the ladder.
- Selection = filter → score (proteinFit spreads remaining budget over
  remaining slots) → weighted-random among top 3. Randomness is intentional:
  regenerate must give a *different, comparably good* week each time.
- Cuisine preference is a SOFT boost (`W_cuisine`), never a filter. Calories
  (`kcal_per_unit`, nullable) are display-only — the generator must never
  optimize for them. 2-meals-per-day = `['lunch','dinner']` slots.
- Protein repair (per day, ±10% band): scale quantities by qty_step within
  min/max, at most one meal replacement, at most two passes, terminates
  always. Unreachable goals are displayed honestly (e.g. "38g / 150g"),
  never faked or looped on.
- RNG must stay injectable (`rngSeed`) — reproducibility tests depend on it.
- `getCandidates()` is shared by generation AND the swap sheet. One pipeline,
  two consumers. Don't fork it.

## Data invariants

- Meal ids are permanent and referenced by plans. Never change or delete a
  shipped meal id; fix the row in `data/meals.csv` instead.
- Catalog update flow: edit CSV → bump `CATALOG_VERSION` in
  `scripts/build-catalog.ts` → `npm run build:catalog` →
  `npm run validate:catalog`. On launch the app upserts by id iff the bundled
  version is newer; rows with `is_custom = 1` are never touched.
- Content floor: every (diet × slot) pool needs ≥ 10 meals; veg is always the
  binding constraint. `validate-catalog` failing is a build blocker.
- Schema changes: append a new SQL string to `MIGRATIONS` in
  `src/db/schema.ts`. Never edit or reorder shipped entries.
- `UNIQUE(plan_id, day, slot)` makes swap an UPDATE, not delete+insert.

## Verification (run all three before claiming a change works)

```sh
npm run typecheck        # tsc --noEmit, strict
npm test                 # engine suite (fast, pure Node)
npm run validate:catalog # after any catalog change
```

UI changes additionally need a device check: `npm run android` (Expo Go on an
emulator) — static export (`npx expo export`) only proves it bundles, not
that it renders. Verified pitfalls that unit tests will NOT catch:
- `SafeAreaView` must come from `react-native-safe-area-context`; the
  react-native one is a deprecated no-op on Android (headers under status bar).
- Horizontal `ScrollView`s inside flex columns grab space — pin with
  `style={{ flexGrow: 0 }}` (see DaySelector).

## Environment gotchas (all hit and verified in this repo)

- `npm install` requires `--legacy-peer-deps` (template pins react 19.2.3,
  transitive react-dom wants ^19.2.7; harmless on native).
- `babel-preset-expo` must stay a top-level devDependency (custom
  babel.config.js can't resolve Expo's nested copy).
- `react-native-worklets/plugin` must remain LAST in babel plugins.
- Changing babel/metro/tailwind config needs a Metro restart with `--clear`;
  fast refresh won't pick it up.
- Store-installed Expo Go is not debuggable (`adb run-as` fails) and
  Play-Store AVD images refuse `adb root`. To inspect the SQLite file use a
  dev build, an AOSP-image AVD, or just the in-app JSON backup export.
- Expo Go's floating dev-menu bubble overlaps UI in screenshots; drag it
  aside — it doesn't exist in real builds.

## Conventions

- Repository pattern strictly: screens → stores → repos → SQL.
- UUIDs via `expo-crypto` (`newId()` in `src/utils/ids.ts`); ISO-8601
  timestamps (`nowIso()`).
- NativeWind `className` for styling; inline `style` only for things Tailwind
  can't express (dynamic widths, flexGrow pins).
- Path alias `@/*` → `src/*` (works in tsconfig AND Metro out of the box).
- Show honest numbers. Any change that hides a missed protein goal or fakes
  a total violates the product's core promise.
