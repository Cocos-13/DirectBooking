import { Redis } from "@upstash/redis";
import crypto from "crypto";

// Persistent state for this site's OWN direct bookings and the machinery that
// keeps them safe: confirmed bookings, short-lived date holds (so two guests
// can't be sent pay links for the same nights), pending orders (so the webhook
// can verify the paid amount against what we actually charged), and an
// append-only audit log.
//
// Config-gated: with no Redis credentials every write is a no-op and every
// read returns empty. The site still functions — it just loses the guarantees
// that require shared state (holds, pending-order amount verification, audit
// trail). Security-critical decisions elsewhere are written to FAIL CLOSED
// when that happens (e.g. the webhook falls back to Viva's authenticated
// transaction data, never the public POST body).

// Hash-keyed collections (list/scan friendly).
const K = {
  confirmed: "directBookings", // hash: orderCode -> non-PII booking (dates/amount)
  holds: "holds", // hash: holdId -> Hold (no PII)
  audit: "auditLog", // list (no raw PII)
} as const;

// Per-record keys that carry PII and therefore get a Redis TTL so the data
// physically expires — Redis can only expire whole keys, not hash fields.
const PREFIX = {
  bpii: "bpii:", // booking guest PII, split out of the confirmed record
  pending: "pending:", // pending order (holds guest PII until payment)
  deposit: "deposit:", // deposit record (holds guest PII)
} as const;

const AUDIT_MAX = 5000; // keep the most recent N audit entries

// Guest contact PII is retained for RETENTION_DAYS after checkout, then the KV
// TTL deletes it automatically (GDPR storage limitation). Non-PII booking
// dates/amounts stay in the hash for the calendar/feed and tax reconciliation.
const RETENTION_DAYS = 365;
const RETENTION_FLOOR_SEC = 7 * 24 * 60 * 60; // never expire PII sooner than a week
// Abandoned (never-paid) orders shouldn't keep PII forever — they only matter
// until payment completes, which can't happen after the checkout link lapses.
const PENDING_TTL_SEC = 6 * 60 * 60;

/** Seconds until `checkout` + RETENTION_DAYS, floored so it's never too short. */
function retentionTtlSec(checkout: string): number {
  const end = Date.parse(`${checkout}T00:00:00Z`);
  const base = Number.isNaN(end) ? Date.now() : end;
  const secs = Math.floor((base - Date.now()) / 1000) + RETENTION_DAYS * 86400;
  return Math.max(RETENTION_FLOOR_SEC, secs);
}

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

/** Half-open overlap test on YYYY-MM-DD strings. */
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ---------------------------------------------------------------------------
// Confirmed bookings
// ---------------------------------------------------------------------------

export interface ConfirmedBooking {
  checkin: string; // YYYY-MM-DD, inclusive
  checkout: string; // YYYY-MM-DD, exclusive
  guestName?: string;
  guestEmail?: string;
  // ΑΑΔΕ stay-registration ID: Greek TIN (ΑΦΜ) or, for foreigners, passport/ID
  // number. PII — travels with guestName/guestEmail into the bpii: key below.
  isForeign?: boolean;
  taxId?: string;
  amountCents?: number; // amount actually captured, for reconciliation
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
  const { guestName, guestEmail, isForeign, taxId, ...nonPii } = booking;
  // The durable calendar/financial record carries no PII.
  await c.hset(K.confirmed, { [String(orderCode)]: nonPii });
  // Guest PII lives in its own key with a retention TTL (auto-purged).
  if (guestName || guestEmail || taxId) {
    await c.set(
      `${PREFIX.bpii}${orderCode}`,
      { guestName, guestEmail, isForeign, taxId },
      { ex: retentionTtlSec(booking.checkout) }
    );
  }
}

/** Guest PII for a booking, while still within the retention window (else null). */
export async function getBookingPii(
  orderCode: number | string
): Promise<{ guestName?: string; guestEmail?: string; isForeign?: boolean; taxId?: string } | null> {
  const c = getClient();
  if (!c) return null;
  const v = await c.get<
    { guestName?: string; guestEmail?: string; isForeign?: boolean; taxId?: string } | string
  >(`${PREFIX.bpii}${orderCode}`);
  if (!v) return null;
  return typeof v === "string"
    ? safeParse<{ guestName?: string; guestEmail?: string; isForeign?: boolean; taxId?: string }>(v)
    : v;
}

/**
 * Reopens dates by removing a confirmed booking: deletes the calendar/financial
 * record from the hash AND its guest-PII key. Idempotent. Returns true if a
 * booking was actually removed (false if the order code wasn't present).
 */
export async function deleteConfirmedBooking(orderCode: number | string): Promise<boolean> {
  const c = getClient();
  if (!c) return false;
  const removed = await c.hdel(K.confirmed, String(orderCode));
  await c.del(`${PREFIX.bpii}${orderCode}`).catch(() => {});
  return removed > 0;
}

/** A single confirmed booking by order code, or null. Used for idempotency. */
export async function getConfirmedBooking(
  orderCode: number | string
): Promise<ConfirmedBooking | null> {
  const c = getClient();
  if (!c) return null;
  const value = await c.hget<ConfirmedBooking | string>(K.confirmed, String(orderCode));
  if (!value) return null;
  const parsed = typeof value === "string" ? safeParse<ConfirmedBooking>(value) : value;
  return parsed && parsed.checkin && parsed.checkout ? parsed : null;
}

/**
 * All confirmed direct bookings, each tagged with its `id` (the Viva order
 * code used as the hash key) so the published feed can emit a stable UID.
 * Returns [] when the store isn't configured.
 */
export async function getConfirmedBookings(): Promise<(ConfirmedBooking & { id: string })[]> {
  const c = getClient();
  if (!c) return [];

  const all = await c.hgetall<Record<string, ConfirmedBooking | string>>(K.confirmed);
  if (!all) return [];

  const out: (ConfirmedBooking & { id: string })[] = [];
  for (const [id, value] of Object.entries(all)) {
    const parsed = typeof value === "string" ? safeParse<ConfirmedBooking>(value) : value;
    if (parsed && parsed.checkin && parsed.checkout) out.push({ ...parsed, id });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Holds — short-lived tentative locks placed when a pay link is sent, so the
// dates stop being offered to anyone else until the guest pays or the link
// lapses. Upstash hashes can't expire individual fields, so each hold carries
// an `expiresAt` and reads filter (and opportunistically prune) expired ones.
// ---------------------------------------------------------------------------

export interface Hold {
  checkin: string;
  checkout: string;
  createdAt: string; // ISO
  expiresAt: string; // ISO
  orderCode?: number | string;
}

/**
 * Attempts to place a hold on [checkin, checkout). Returns the hold id, or
 * null if the dates already collide with a confirmed booking or another active
 * hold (or the store is off — the caller then proceeds without a hold and
 * relies on the availability re-check it already did).
 *
 * Concurrency: two overlapping approvals racing here both read "free", both
 * write, so we re-read after writing and let the lexicographically smaller id
 * win — the loser deletes its own hold. Not a distributed lock, but for a
 * single-owner site it removes the realistic double-write window cheaply.
 */
export async function createHold(
  range: { checkin: string; checkout: string },
  ttlMs: number
): Promise<string | null> {
  const c = getClient();
  if (!c) return null;

  const [confirmed, holds] = await Promise.all([getConfirmedBookings(), getActiveHolds()]);
  const busy = [
    ...confirmed.map((b) => ({ start: b.checkin, end: b.checkout })),
    ...holds.map((h) => ({ start: h.checkin, end: h.checkout })),
  ];
  if (busy.some((b) => overlaps(range.checkin, range.checkout, b.start, b.end))) {
    return null;
  }

  const now = Date.now();
  const holdId = crypto.randomUUID();
  const hold: Hold = {
    checkin: range.checkin,
    checkout: range.checkout,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };
  await c.hset(K.holds, { [holdId]: hold });

  // Write-then-verify tiebreak against a concurrent overlapping hold.
  const after = (await getActiveHolds()).filter((h) => h.id !== holdId);
  const loser = after.some(
    (h) => overlaps(range.checkin, range.checkout, h.checkin, h.checkout) && h.id < holdId
  );
  if (loser) {
    await c.hdel(K.holds, holdId);
    return null;
  }
  return holdId;
}

/** Active (non-expired) holds, each tagged with its `id`. Prunes expired ones. */
export async function getActiveHolds(): Promise<(Hold & { id: string })[]> {
  const c = getClient();
  if (!c) return [];

  const all = await c.hgetall<Record<string, Hold | string>>(K.holds);
  if (!all) return [];

  const nowIso = new Date().toISOString();
  const active: (Hold & { id: string })[] = [];
  const expired: string[] = [];
  for (const [id, value] of Object.entries(all)) {
    const h = typeof value === "string" ? safeParse<Hold>(value) : value;
    if (!h || !h.checkin || !h.checkout) {
      expired.push(id);
      continue;
    }
    if (h.expiresAt && h.expiresAt <= nowIso) expired.push(id);
    else active.push({ ...h, id });
  }
  if (expired.length) c.hdel(K.holds, ...expired).catch(() => {});
  return active;
}

export async function deleteHold(holdId: string | undefined | null): Promise<void> {
  if (!holdId) return;
  const c = getClient();
  if (!c) return;
  await c.hdel(K.holds, holdId).catch(() => {});
}

// ---------------------------------------------------------------------------
// Pending orders — recorded when a payment order is created, so the webhook
// can look the order up by its authoritative Viva order code and verify the
// paid amount against what we intended to charge (never trusting the wire).
// ---------------------------------------------------------------------------

export interface PendingOrder {
  checkin: string;
  checkout: string;
  expectedAmountCents: number;
  email: string;
  name: string;
  phone?: string;
  guests: number;
  lang: "el" | "en";
  isForeign?: boolean;
  taxId?: string;
  holdId?: string;
  createdAt: string; // ISO
}

export async function savePendingOrder(
  orderCode: number | string,
  order: PendingOrder
): Promise<void> {
  const c = getClient();
  if (!c) return;
  // Per-record key with a short TTL: it's only needed until payment, and this
  // guarantees the guest PII inside an abandoned order is auto-purged.
  await c.set(`${PREFIX.pending}${orderCode}`, order, { ex: PENDING_TTL_SEC });
}

export async function getPendingOrder(
  orderCode: number | string
): Promise<PendingOrder | null> {
  const c = getClient();
  if (!c) return null;
  const value = await c.get<PendingOrder | string>(`${PREFIX.pending}${orderCode}`);
  if (!value) return null;
  const parsed = typeof value === "string" ? safeParse<PendingOrder>(value) : value;
  return parsed && parsed.checkin ? parsed : null;
}

export async function deletePendingOrder(orderCode: number | string): Promise<void> {
  const c = getClient();
  if (!c) return;
  await c.del(`${PREFIX.pending}${orderCode}`).catch(() => {});
}

// ---------------------------------------------------------------------------
// Deposits — the refundable damage hold lifecycle, keyed by the deposit's own
// Viva order code (a separate pre-auth order from the stay payment).
//   link-sent  -> owner sent the guest a hold link
//   authorized -> guest completed the hold; transactionId now known
//   captured   -> owner charged some/all of it (damage)
//   released   -> owner voided the hold (no damage)
// ---------------------------------------------------------------------------

export type DepositStatus = "link-sent" | "authorized" | "captured" | "released";

export interface DepositRecord {
  bookingOrderCode?: number | string;
  checkin: string;
  checkout: string;
  email: string;
  name: string;
  lang: "el" | "en";
  amountCents: number; // authorized hold amount
  status: DepositStatus;
  transactionId?: string; // set once authorized (needed to capture/release)
  capturedCents?: number; // set once captured
  createdAt: string; // ISO
  resolvedAt?: string; // ISO, set on capture/release
}

export async function saveDeposit(
  depositOrderCode: number | string,
  record: DepositRecord
): Promise<void> {
  const c = getClient();
  if (!c) return;
  // Per-record key with the same retention TTL as booking PII (it holds the
  // guest's name/email); recomputed from checkout on each lifecycle update.
  await c.set(`${PREFIX.deposit}${depositOrderCode}`, record, {
    ex: retentionTtlSec(record.checkout),
  });
}

export async function getDeposit(
  depositOrderCode: number | string
): Promise<DepositRecord | null> {
  const c = getClient();
  if (!c) return null;
  const value = await c.get<DepositRecord | string>(`${PREFIX.deposit}${depositOrderCode}`);
  if (!value) return null;
  const parsed = typeof value === "string" ? safeParse<DepositRecord>(value) : value;
  return parsed && parsed.status ? parsed : null;
}

// ---------------------------------------------------------------------------
// Audit log — append-only, capped. Every money- or availability-affecting
// decision writes one entry so a dispute or a "why is this date blocked?"
// question has a trail. Never store card data or full PII bodies here.
// ---------------------------------------------------------------------------

export type AuditEvent =
  | "request.received"
  | "order.created"
  | "payment.confirmed"
  | "payment.amount_mismatch"
  | "payment.duplicate"
  | "hold.conflict"
  | "rate.limited"
  | "deposit.link_sent"
  | "deposit.authorized"
  | "deposit.captured"
  | "deposit.released"
  | "booking.reopened"
  | "admin.login"
  | "admin.login_failed";

export async function audit(
  event: AuditEvent,
  data: Record<string, unknown> = {}
): Promise<void> {
  const entry = { ts: new Date().toISOString(), event, ...data };
  // Always emit a structured line so logs carry the trail even with no store.
  console.log(`[audit] ${JSON.stringify(entry)}`);
  const c = getClient();
  if (!c) return;
  try {
    await c.lpush(K.audit, JSON.stringify(entry));
    await c.ltrim(K.audit, 0, AUDIT_MAX - 1);
  } catch (err) {
    console.error("[audit] failed to persist entry:", err);
  }
}

/** Most recent audit entries (newest first). For an owner review view. */
export async function getRecentAudit(limit = 100): Promise<Record<string, unknown>[]> {
  const c = getClient();
  if (!c) return [];
  const raw = await c.lrange<string>(K.audit, 0, Math.max(0, limit - 1));
  return raw.map((r) => safeParse<Record<string, unknown>>(r)).filter(Boolean) as Record<
    string,
    unknown
  >[];
}

// ---------------------------------------------------------------------------
// Generic KV helpers — used by the token vault (lib/bookingToken.ts) to store
// signed-link payloads server-side so PII stays out of URLs/logs. No-op / null
// when the store isn't configured (caller then falls back to embedding).
// ---------------------------------------------------------------------------

export async function kvPutJSON(key: string, value: unknown, ttlSec: number): Promise<boolean> {
  const c = getClient();
  if (!c) return false;
  try {
    await c.set(key, value, { ex: ttlSec });
    return true;
  } catch (err) {
    console.error("[kv] put failed:", err);
    return false;
  }
}

export async function kvGetJSON<T>(key: string): Promise<T | null> {
  const c = getClient();
  if (!c) return null;
  const v = await c.get<T | string>(key);
  if (v == null) return null;
  return typeof v === "string" ? safeParse<T>(v) : (v as T);
}

function safeParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
