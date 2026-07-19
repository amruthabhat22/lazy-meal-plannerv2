import type { SQLiteDatabase } from "expo-sqlite";
import { getMeta, setMeta } from "@/db/schema";

/**
 * Subscription model: 3 free weeks from first use, then ₹79/month or
 * ₹499/year. The app is offline with no billing backend yet, so choosing
 * a plan records it on-device only (demo) — wiring Play Billing /
 * RevenueCat is a later step.
 */
export const TRIAL_DAYS = 21;

export type PlanId = "monthly" | "yearly";

export const PLANS = {
  monthly: { price: 79, per: "month", label: "Monthly" },
  yearly: { price: 499, per: "year", label: "Yearly" },
} as const;

/** What 12 months would cost vs the yearly price. */
export const YEARLY_SAVINGS = PLANS.monthly.price * 12 - PLANS.yearly.price; // ₹449
export const YEARLY_SAVINGS_PCT = Math.round(
  (YEARLY_SAVINGS / (PLANS.monthly.price * 12)) * 100,
); // 47%
export const YEARLY_PER_MONTH = Math.round(PLANS.yearly.price / 12); // ≈ ₹42

const TRIAL_KEY = "trial_start";
const SUB_KEY = "subscription";

export interface Subscription {
  plan: PlanId;
  since: string;
}

export interface TrialInfo {
  daysLeft: number;
  expired: boolean;
}

/** Record the start of the free trial on first call; no-op afterwards. */
export async function ensureTrialStart(db: SQLiteDatabase): Promise<void> {
  const existing = await getMeta(db, TRIAL_KEY);
  if (!existing) await setMeta(db, TRIAL_KEY, new Date().toISOString());
}

export async function getTrialInfo(db: SQLiteDatabase): Promise<TrialInfo> {
  const raw = await getMeta(db, TRIAL_KEY);
  if (!raw) return { daysLeft: TRIAL_DAYS, expired: false };
  const elapsedDays = (Date.now() - Date.parse(raw)) / 86_400_000;
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays));
  return { daysLeft, expired: elapsedDays >= TRIAL_DAYS };
}

export async function getSubscription(
  db: SQLiteDatabase,
): Promise<Subscription | null> {
  const raw = await getMeta(db, SUB_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Subscription;
    return parsed && (parsed.plan === "monthly" || parsed.plan === "yearly")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export async function saveSubscription(
  db: SQLiteDatabase,
  plan: PlanId,
): Promise<Subscription> {
  const sub: Subscription = { plan, since: new Date().toISOString() };
  await setMeta(db, SUB_KEY, JSON.stringify(sub));
  return sub;
}
