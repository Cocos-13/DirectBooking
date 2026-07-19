import { Redis } from "@upstash/redis";

// Persistent store for this site's OWN confirmed direct bookings — the piece
// that lets us (a) block those dates in our own calendar and (b) publish them
// as an iCal feed for Airbnb/Booking.com to import.
//
// Config-gated: with no Redis credentials the store is a no-op (saves do
// nothing, reads return []), so the site degrades to exactly its prior
// behaviour. Works with the Vercel "KV" (Upstash) Marketplace integration
// (KV_REST_API_*) or a plain Upstash Redis instance (UPSTASH_REDIS_REST_*).

const KEY = "directBookings";

function creds(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function isStoreConfigured(): boolean {
  return creds() !== null;
}

let client: Redis | null = null;
function getClient(): Redis | null {
  if (client) return client;
  const c = creds();
  if (!c) return null;
  client = new Redis({ url: c.url, token: c.token });
  return client;
}

export interface ConfirmedBooking {
  checkin: string; // YYYY-MM-DD, inclusive
  checkout: string; // YYYY-MM-DD, exclusive
  guestName?: string;
  createdAt: string; // ISO timestamp
}

/**
 * Records a paid direct booking, keyed by Viva order code so a webhook that
 * fires more than once for the same order is idempotent (overwrites, never
 * duplicates).
 */
export async function saveConfirmedBooking(
  orderCode: number | string,
  booking: ConfirmedBooking
): Promise<void> {
  const c = getClient();
  if (!c) return;
  await c.hset(KEY, { [String(orderCode)]: booking });
}

/** All confirmed direct bookings. Returns [] when the store isn't configured. */
export async function getConfirmedBookings(): Promise<ConfirmedBooking[]> {
  const c = getClient();
  if (!c) return [];

  const all = await c.hgetall<Record<string, ConfirmedBooking | string>>(KEY);
  if (!all) return [];

  const out: ConfirmedBooking[] = [];
  for (const value of Object.values(all)) {
    // @upstash/redis usually returns the deserialized object, but tolerate a
    // raw JSON string too, just in case.
    const parsed = typeof value === "string" ? safeParse(value) : value;
    if (parsed && parsed.checkin && parsed.checkout) out.push(parsed);
  }
  return out;
}

function safeParse(value: string): ConfirmedBooking | null {
  try {
    return JSON.parse(value) as ConfirmedBooking;
  } catch {
    return null;
  }
}
