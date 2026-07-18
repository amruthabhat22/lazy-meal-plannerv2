import type { SQLiteDatabase } from "expo-sqlite";
import { getMeta, setMeta } from "@/db/schema";

/**
 * Local sign-in session (stored in app_meta). The app is fully offline —
 * there is no auth backend, so "sign in" only captures who is using the
 * app on this device (name for the personalised header, phone/email for
 * display). OTP and Google flows are demo-only and verify nothing.
 */
export type SignInMethod = "phone" | "google" | "email";

export interface UserSession {
  name: string;
  method: SignInMethod;
  phone?: string;
  email?: string;
  createdAt: string;
}

const KEY = "user_session";

/** The demo OTP accepted by the phone flow (no SMS is ever sent). */
export const DEMO_OTP = "123456";

export async function getSession(
  db: SQLiteDatabase,
): Promise<UserSession | null> {
  const raw = await getMeta(db, KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UserSession;
    return parsed && typeof parsed.name === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveSession(
  db: SQLiteDatabase,
  session: Omit<UserSession, "createdAt">,
): Promise<UserSession> {
  const full: UserSession = {
    ...session,
    name: session.name.trim(),
    createdAt: new Date().toISOString(),
  };
  await setMeta(db, KEY, JSON.stringify(full));
  return full;
}

export async function clearSession(db: SQLiteDatabase): Promise<void> {
  await setMeta(db, KEY, "");
}

/** "Amrutha Bhat" -> "Amrutha" (for the "{name}'s week" header). */
export function firstName(session: UserSession): string {
  return session.name.trim().split(/\s+/)[0] ?? "";
}
