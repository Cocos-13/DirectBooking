import crypto from "crypto";
import { isStoreConfigured, kvGetJSON, kvPutJSON } from "./bookingStore";

// HMAC-signed, URL-safe tokens embedded in the OWNER's emails. Because only the
// owner receives those emails, a valid token is proof the owner authorized this
// specific action — no login or admin panel required.
//
// Two on-the-wire formats (chosen automatically):
//   "2.<id>.<sig(id)>"     — VAULTED: the payload lives in KV under tok:<id>;
//                            the URL carries only an opaque id, so guest PII
//                            (name/email/phone) never lands in a URL or an
//                            access log. Used whenever the store is configured.
//   "1.<data>.<sig(data)>" — EMBEDDED: payload base64url in the token itself.
//                            Fallback when there's no store (degrades to the
//                            previous behaviour). Also legacy "<data>.<sig>"
//                            (2-part) tokens still verify, for links in flight.
//
// Every payload is a typed envelope: a `kind` discriminator (so a deposit token
// can never be replayed as a booking token), a `jti` nonce, and an `exp`. Prices
// are never signed — recomputed from the signed dates at use time.

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface Envelope<T> {
  v: 1;
  kind: string;
  jti: string;
  iat: number;
  exp: number;
  p: T;
}

/** Present only when BOOKING_APPROVAL_SECRET is configured. */
export function isApprovalConfigured(): boolean {
  return Boolean(process.env.BOOKING_APPROVAL_SECRET);
}

function sign(data: string): string {
  const secret = process.env.BOOKING_APPROVAL_SECRET;
  if (!secret) throw new Error("BOOKING_APPROVAL_SECRET not set");
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

function sigMatches(value: string, expected: string): boolean {
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function makeEnvelope<T>(kind: string, payload: T, ttlSeconds: number): Envelope<T> {
  const now = Math.floor(Date.now() / 1000);
  return { v: 1, kind, jti: crypto.randomUUID(), iat: now, exp: now + ttlSeconds, p: payload };
}

function validate<T>(kind: string, env: Envelope<T> | null): T | null {
  if (!env || env.v !== 1 || env.kind !== kind || env.p == null) return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof env.exp !== "number" || env.exp < now) return null; // expired
  return env.p;
}

/** Signs `payload` under a namespace `kind`. Vaults it in KV when available. */
export async function signToken<T>(
  kind: string,
  payload: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string> {
  const env = makeEnvelope(kind, payload, ttlSeconds);

  if (isStoreConfigured()) {
    const id = crypto.randomUUID();
    const stored = await kvPutJSON(`tok:${id}`, env, ttlSeconds);
    if (stored) return `2.${id}.${sign(id)}`;
    // else fall through to embedded (store write failed) — better a working
    // link with PII in the URL than a broken approval flow.
  }

  const data = Buffer.from(JSON.stringify(env)).toString("base64url");
  return `1.${data}.${sign(data)}`;
}

/** Verifies a token of the given `kind` and returns its payload, or null. */
export async function verifyToken<T>(kind: string, token: string): Promise<T | null> {
  const parts = (token ?? "").split(".");

  // Legacy 2-part embedded token: "<data>.<sig>".
  if (parts.length === 2) {
    const [data, sig] = parts;
    if (!data || !sig || !sigMatches(sig, sign(data))) return null;
    return validate(kind, decodeEmbedded<T>(data));
  }

  if (parts.length === 3) {
    const [mode, mid, sig] = parts;
    if (!mid || !sig || !sigMatches(sig, sign(mid))) return null;
    if (mode === "2") return validate(kind, await kvGetJSON<Envelope<T>>(`tok:${mid}`));
    if (mode === "1") return validate(kind, decodeEmbedded<T>(mid));
  }

  return null;
}

function decodeEmbedded<T>(data: string): Envelope<T> | null {
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Envelope<T>;
  } catch {
    return null;
  }
}

// --- Booking approval (the "Approve & send payment link" button) ------------

export interface BookingPayload {
  name: string;
  email: string;
  phone?: string;
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
  guests: number;
  lang: "el" | "en";
  // Required for the owner's ΑΑΔΕ (short-term-let) stay registration: the
  // Greek TIN (ΑΦΜ) for tax residents, or passport/ID number for foreigners.
  isForeign: boolean;
  taxId: string;
}

export function signBooking(payload: BookingPayload, ttlSeconds: number = DEFAULT_TTL_SECONDS) {
  return signToken("booking", payload, ttlSeconds);
}

export function verifyBooking(token: string) {
  return verifyToken<BookingPayload>("booking", token);
}

// --- Deposit hold: "Send hold link" (owner → guest) -------------------------

export interface DepositSendPayload {
  bookingOrderCode: number | string;
  email: string;
  name: string;
  phone?: string;
  checkin: string;
  checkout: string;
  lang: "el" | "en";
}

export function signDepositSend(payload: DepositSendPayload, ttlSeconds: number) {
  return signToken("deposit-send", payload, ttlSeconds);
}

export function verifyDepositSend(token: string) {
  return verifyToken<DepositSendPayload>("deposit-send", token);
}

// --- Deposit hold: "Release / Capture" (owner action after checkout) --------

export interface DepositResolvePayload {
  depositOrderCode: number | string;
  transactionId: string;
  amountCents: number; // the authorized hold amount
  email: string;
  name: string;
  checkin: string;
  checkout: string;
  lang: "el" | "en";
}

export function signDepositResolve(payload: DepositResolvePayload, ttlSeconds: number) {
  return signToken("deposit-resolve", payload, ttlSeconds);
}

export function verifyDepositResolve(token: string) {
  return verifyToken<DepositResolvePayload>("deposit-resolve", token);
}
