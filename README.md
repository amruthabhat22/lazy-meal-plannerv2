# Lazy Meal Planner

Protein-first, lazy-first meal planning. A 5-step onboarding, then a full
week of meals that hits your protein goal — you only swap or adjust. Fully
offline: no backend, no auth, no network calls. Built from
[docs/spec.md](docs/spec.md) (MVP), then restyled and extended to match the
Lovable design (terracotta/cream, [source repo](https://github.com/amruthabhat22/lazy-meal-planner)).

**Full developer guide:** [DEVELOPMENT.md](DEVELOPMENT.md) — running on
iOS/Android, catalog & schema updates, DB inspection, troubleshooting.
**AI agents:** read [AGENTS.md](AGENTS.md) first.

## Features

- **Week plan** — day tabs with date + goal-status dots, protein/calorie
  stat card (honest numbers, color-coded), slot sections with multiple
  meals per slot, quantity steppers, regenerate day/week
- **Swap & add** — multi-select suggestion sheet scored by the engine, plus
  manual custom dishes ("Can't find it? Type a dish")
- **Generator** — pure-TS engine: hard rules (diet/slot/no-repeat/weekly
  cap), relaxation ladder, protein repair into ±10% of goal, cuisine soft
  boost, seeded RNG, 19 unit tests
- **Grocery** — auto-aggregated checklist with categories, progress, and a
  delivery-app price comparison sheet (estimates)
- **WhatsApp share** — send the week's plan to saved contacts via wa.me
- **Backup** — JSON export/import from the Profile tab
- 59-meal bundled catalog (mostly Indian) with protein + calories per unit

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

1. Edit `data/meals.csv`.
2. Bump `CATALOG_VERSION` in `scripts/build-catalog.ts`.
3. `npm run build:catalog && npm run validate:catalog`.

On next launch the app upserts bundled meals by stable id — existing plans
and user data are never touched.

## Layout

- `src/engine/` — pure week-generation engine (no React/DB imports), fully unit-tested
- `src/db/` — schema + migration runner, repositories, catalog import, backup
- `src/app/(tabs)/` — Week / Grocery / Profile screens; `(onboarding)/` — 5-step flow
- `src/components/` — FoodCard, SwapSheet, ShareSheet, OrderSheet, StatCard, DaySelector, BottomNav
- `src/state/` — Zustand stores (persist to SQLite immediately; no save button)
- `src/utils/format.ts` — the only place quantity/unit display formatting lives
