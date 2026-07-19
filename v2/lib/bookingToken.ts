import crypto from "crypto";

// A booking approval token is an HMAC-signed, URL-safe string embedded in the
// owner's notification email. Because only the owner receives that email, a
// valid token is proof the owner approved this specific booking — no login or
// admin panel required. The amount is deliberately NOT signed here: it's
// recomputed from the (signed) dates at approval time, so pricing stays a
// single source of truth in siteConfig/lib/pricing.

export interface BookingPayload {
  name: string;
  email: string;
  phone?: string;
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
  guests: number;
  lang: "el" | "en";
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

export function signBooking(payload: BookingPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyBooking(token: string): BookingPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as BookingPayload;
  } catch {
    return null;
  }
}
