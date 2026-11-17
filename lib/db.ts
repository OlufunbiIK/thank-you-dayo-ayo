import "server-only";
import { COUPLE } from "./config";

/* Talks to Supabase through its REST API with the secret key, on the server only.
   The guests table has row-level security on and no public policies, so browsers can never read phone numbers. */

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const EVENT = process.env.EVENT_SLUG || COUPLE.eventSlug;

export const dbReady = () => Boolean(URL && KEY);

export type Guest = {
  id: string;
  event_slug: string;
  code: string;
  name: string;
  phone: string | null;
  network: string | null;
  coming: string | null;
  seats: number | null;
  wish: string | null;
  is_demo: boolean;
  gift_status: "none" | "sending" | "delivered" | "failed";
  gift_amount: number | null;
  gift_mode: string | null;
  gift_ref: string | null;
  gift_error: string | null;
  gifted_at: string | null;
  created_at: string;
};

async function rest<T = unknown>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  if (!dbReady()) throw new Error("Database not connected: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  const headers: Record<string, string> = { apikey: KEY, "Content-Type": "application/json" };
  if (KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${KEY}`; // legacy JWT keys; new sb_secret keys go in apikey only
  if (init.prefer) headers.Prefer = init.prefer;
  const res = await fetch(`${URL.replace(/\/$/, "")}/rest/v1/${path}`, {
    method: init.method || "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Database error ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : null) as T;
}

const ev = `event_slug=eq.${encodeURIComponent(EVENT)}`;
const now = () => new Date().toISOString();

export async function getGuestByCode(code: string) {
  const rows = await rest<Guest[]>(`guests?select=*&${ev}&code=eq.${encodeURIComponent(code)}&limit=1`);
  return rows[0] ?? null;
}
export async function getGuestByPhone(phone: string) {
  const rows = await rest<Guest[]>(`guests?select=*&${ev}&phone=eq.${encodeURIComponent(phone)}&limit=1`);
  return rows[0] ?? null;
}
export async function getGuestById(id: string) {
  const rows = await rest<Guest[]>(`guests?select=*&${ev}&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] ?? null;
}
export const listGuests = () => rest<Guest[]>(`guests?select=*&${ev}&order=created_at.asc`);

export async function countDelivered() {
  const rows = await rest<{ id: string }[]>(`guests?select=id&${ev}&gift_status=eq.delivered`);
  return rows.length;
}

export async function insertGuests(rows: Partial<Guest>[]) {
  return rest<Guest[]>("guests", { method: "POST", body: rows.map((r) => ({ event_slug: EVENT, ...r })), prefer: "return=representation" });
}

export async function updateGuest(id: string, patch: Partial<Guest>) {
  const rows = await rest<Guest[]>(`guests?id=eq.${id}&${ev}`, { method: "PATCH", body: { ...patch, updated_at: now() }, prefer: "return=representation" });
  return rows[0] ?? null;
}

/** Atomically claims the right to send, so two taps (or two tabs) can never pay twice. */
export async function lockForSending(id: string) {
  const rows = await rest<Guest[]>(`guests?id=eq.${id}&${ev}&gift_status=in.(none,failed)`, {
    method: "PATCH",
    body: { gift_status: "sending", gift_error: null, updated_at: now() },
    prefer: "return=representation",
  });
  return rows[0] ?? null;
}

export const deleteDemoGuests = () => rest(`guests?${ev}&is_demo=eq.true`, { method: "DELETE" });
export const resetGifts = () =>
  rest(`guests?${ev}`, { method: "PATCH", body: { gift_status: "none", gift_mode: null, gift_ref: null, gift_error: null, gifted_at: null, updated_at: now() } });

export function newCode(name: string) {
  const first = (name.trim().split(/\s+/)[0] || "guest").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "guest";
  return `${first}-${Math.random().toString(36).slice(2, 6)}`;
}
