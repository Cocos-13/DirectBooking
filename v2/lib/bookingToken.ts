import crypto from "crypto";

// HMAC-signed, URL-safe tokens embedded in the OWNER's emails. Because only the
// owner receives those emails, a valid token is proof the owner authorized this
// specific action — no login or admin panel required.
//
// Every token is a typed envelope: a `kind` discriminator (so a deposit token
// can never be replayed as a booking-approval token), a `jti` nonce, and an
// `exp` expiry (so a stale/forwarded link goes inert). Amounts and prices are
// deliberately NOT signed — they're recomputed from the signed dates at use
// time, keeping pricing a single source of truth in siteConfig/lib/pricing.

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

/** Signs `payload` under a namespace `kind`, valid for `ttlSeconds`. */
export function signToken<T>(
  kind: string,
  payload: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string {
  const now = Math.floor(Date.now() / 1000);
  const envelope: Envelope<T> = {
    v: 1,
    kind,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + ttlSeconds,
    p: payload,
  };
  const data = Buffer.from(JSON.stringify(envelope)).toString("base64url");
  return `${data}.${sign(data)}`;
}

/**
 * Verifies signature, version, matching `kind`, and expiry (constant-time on
 * the signature). Returns the payload or null. A token minted for a different
 * `kind` fails here even though the signature is valid.
 */
export function verifyToken<T>(kind: string, token: string): T | null {
  const [data, sig] = (token ?? "").split(".");
  if (!data || !sig) return null;

  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let envelope: Envelope<T>;
  try {
    envelope = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Envelope<T>;
  } catch {
    return null;
  }

  if (envelope.v !== 1 || envelope.kind !== kind || envelope.p == null) return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof envelope.exp !== "number" || envelope.exp < now) return null; // expired

  return envelope.p;
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
}

export function signBooking(
  payload: BookingPayload,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string {
  return signToken("booking", payload, ttlSeconds);
}

export function verifyBooking(token: string): BookingPayload | null {
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

export function signDepositSend(payload: DepositSendPayload, ttlSeconds: number): string {
  return signToken("deposit-send", payload, ttlSeconds);
}

export function verifyDepositSend(token: string): DepositSendPayload | null {
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

export function signDepositResolve(payload: DepositResolvePayload, ttlSeconds: number): string {
  return signToken("deposit-resolve", payload, ttlSeconds);
}

export function verifyDepositResolve(token: string): DepositResolvePayload | null {
  return verifyToken<DepositResolvePayload>("deposit-resolve", token);
}
