import type { SQLiteDatabase } from "expo-sqlite";
import { getMeta, setMeta } from "@/db/schema";
import { newId } from "@/utils/ids";

/** Saved WhatsApp contacts for weekly plan sharing (stored in app_meta). */
export interface ShareContact {
  id: string;
  name: string;
  phone: string; // digits only, with country code
}

const KEY = "share_contacts";

export function normalizePhone(input: string): string {
  return input.replace(/[^\d]/g, "");
}

export function formatPhone(digits: string): string {
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return `+${digits}`;
}

export async function getContacts(db: SQLiteDatabase): Promise<ShareContact[]> {
  const raw = await getMeta(db, KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ShareContact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addContact(
  db: SQLiteDatabase,
  name: string,
  phone: string,
): Promise<ShareContact | null> {
  const digits = normalizePhone(phone);
  const contacts = await getContacts(db);
  if (contacts.some((c) => c.phone === digits)) return null;
  const contact: ShareContact = { id: newId(), name: name.trim(), phone: digits };
  await setMeta(db, KEY, JSON.stringify([...contacts, contact]));
  return contact;
}

export async function removeContact(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  const contacts = await getContacts(db);
  await setMeta(db, KEY, JSON.stringify(contacts.filter((c) => c.id !== id)));
}
