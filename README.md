# EezyPlate (Lazy Meal Planner)

Protein-first, lazy-first meal planning. A 5-step onboarding, then a full
week of meals that hits your protein and calorie goals — you only swap or
adjust. Fully offline: no backend, no auth, no network calls. Built from
[docs/spec.md](docs/spec.md) (MVP), then restyled and extended to match the
Lovable "EezyPlate" design (terracotta/cream, https://eezyplate.lovable.app).

**Full developer guide:** [DEVELOPMENT.md](DEVELOPMENT.md) — running on
iOS/Android, catalog & schema updates, DB inspection, troubleshooting.
**AI agents:** read [AGENTS.md](AGENTS.md) first.

## Features

- **Week plan** — day tabs with date + goal-status dots, protein AND
  calorie stat card vs your goals (honest numbers, color-coded), slot
  sections with multiple meals per slot, quantity steppers, regenerate
  day/week
- **Recipes** — every bundled meal has an offline recipe: prep time, ease
  of cooking, ingredients scaled to your planned quantity, numbered steps.
  Open via the book icon or a long-press on any meal card
- **Swap & add** — multi-select suggestion sheet scored by the engine, plus
  manual custom dishes ("Can't find it? Type a dish")
- **Generator** — pure-TS engine: hard rules (diet/slot/no-repeat/weekly
  cap), relaxation ladder, protein repair into ±10% of goal, cuisine soft
  boost, seeded RNG, 19 unit tests
- **Grocery** — ingredient-level checklist aggregated from the week's
  recipes (scaled + summed, grouped by aisle category), progress bar, and a
  delivery-app price comparison sheet (estimates)
- **WhatsApp share** — send the week as text or as a days×meals table
  image; recipients can ask for any meal's recipe and you send it from the
  same sheet (prep time, ease of cooking, ingredients, steps)
- **Backup** — JSON export/import from the Profile tab
- 59-meal bundled catalog (mostly Indian) with protein + calories per unit
  and a full recipe per meal

## Stack

Expo (managed) · TypeScript strict · Expo Router (tabs) · expo-sqlite ·
Zustand · NativeWind · @gorhom/bottom-sheet

## Run it

```sh
npm install --legacy-peer-deps
npm run ios       # or: npm run android / npm start
```

## Commands

| Command | What it does |
|---|---|
| `npm test` | Generator engine unit tests (vitest, pure TS) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build:catalog` | `data/meals.csv` → `assets/meals.json` |
| `npm run validate:catalog` | Content floor: ≥10 meals per (diet, slot) pool |

## Editing the meal catalog

1. Edit `data/meals.csv` (nutrition/slots) and/or `data/recipes.json`
   (ingredients + steps — every meal must have a recipe; the build fails
   otherwise).
2. Bump `CATALOG_VERSION` in `scripts/build-catalog.ts`.
3. `npm run build:catalog && npm run validate:catalog`.

On next launch the app upserts bundled meals by stable id — existing plans
and user data are never touched.

## Layout

- `src/engine/` — pure week-generation engine (no React/DB imports), fully unit-tested
- `src/db/` — schema + migration runner, repositories, catalog import, backup
- `src/app/(tabs)/` — Week / Grocery / Profile screens; `(onboarding)/` — 5-step flow
- `src/components/` — FoodCard, RecipeSheet, SwapSheet, ShareSheet, PlanTableImage,
  OrderSheet, sheetChrome (shared tinted-backdrop sheet styling), GoalSliderCard,
  StatCard, DaySelector, BottomNav
- `src/state/` — Zustand stores (persist to SQLite immediately)
- `src/utils/format.ts` — the only place quantity/unit display formatting lives
- `data/meals.csv` + `data/recipes.json` — catalog + recipes source of truth
