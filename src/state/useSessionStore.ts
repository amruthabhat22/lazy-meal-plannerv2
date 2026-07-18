import { create } from "zustand";
import type { SQLiteDatabase } from "expo-sqlite";
import {
  clearSession,
  getSession,
  saveSession,
  type UserSession,
} from "@/utils/session";

interface SessionState {
  session: UserSession | null;
  loaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  signIn: (
    db: SQLiteDatabase,
    session: Omit<UserSession, "createdAt">,
  ) => Promise<UserSession>;
  signOut: (db: SQLiteDatabase) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  loaded: false,
  load: async (db) => {
    const session = await getSession(db);
    set({ session, loaded: true });
  },
  signIn: async (db, session) => {
    const saved = await saveSession(db, session);
    set({ session: saved });
    return saved;
  },
  signOut: async (db) => {
    await clearSession(db);
    set({ session: null });
  },
}));
