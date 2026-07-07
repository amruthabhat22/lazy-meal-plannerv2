# Lazy Meal Planner

Protein-first, lazy-first meal planning. Answer three questions, get a full
week of meals that hits your protein goal. Fully offline — no backend, no
auth, no network calls. Built from `lazy-meal-planner-spec.md` (MVP).

**Full developer guide:** [DEVELOPMENT.md](DEVELOPMENT.md) — running on
iOS/Android, catalog & schema updates, DB inspection, troubleshooting.

## Stack

Expo (managed) · TypeScript strict · Expo Router · expo-sqlite · Zustand ·
NativeWind · @gorhom/bottom-sheet

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
- `src/app/` — Expo Router screens (onboarding, week plan, grocery, settings)
- `src/state/` — Zustand stores
- `src/utils/format.ts` — the only place quantity/unit display formatting lives
