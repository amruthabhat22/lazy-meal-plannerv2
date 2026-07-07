import { create } from "zustand";
import type { SQLiteDatabase } from "expo-sqlite";
import {
  getPreferences,
  savePreferences,
  type UserPreferences,
} from "@/db/repos/preferencesRepo";
import type { Slot } from "@/engine/types";

export function slotsForPrefs(prefs: UserPreferences): Slot[] {
  return prefs.mealsPerDay === 4
    ? ["breakfast", "lunch", "dinner", "snack"]
    : ["breakfast", "lunch", "dinner"];
}

interface PrefsState {
  prefs: UserPreferences | null;
  loaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  save: (
    db: SQLiteDatabase,
    prefs: Omit<UserPreferences, "id">,
  ) => Promise<UserPreferences>;
}

export const usePrefsStore = create<PrefsState>((set) => ({
  prefs: null,
  loaded: false,
  load: async (db) => {
    const prefs = await getPreferences(db);
    set({ prefs, loaded: true });
  },
  save: async (db, prefs) => {
    const saved = await savePreferences(db, prefs);
    set({ prefs: saved });
    return saved;
  },
}));
