import crypto from "crypto";

// Minimal owner-only auth for the admin booking tools. A single shared password
// (ADMIN_PASSWORD) is exchanged for a short-lived, HMAC-signed session cookie so
// the password never rides in URLs or repeats on every request. The cookie is
// signed with BOOKING_APPROVAL_SECRET (already required for booking links), so
// no new signing secret is introduced. Admin is OFF unless BOTH are set.

export const ADMIN_COOKIE = "db_admin";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
export const SESSION_TTL_SEC = SESSION_TTL_MS / 1000;

function signingSecret(): string | null {
  return process.env.BOOKING_APPROVAL_SECRET || null;
}

/** True only when a password AND a signing secret exist. */
export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && signingSecret());
}

/** Constant-time password check against ADMIN_PASSWORD. */
export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || !input) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sign(value: string): string {
  const s = signingSecret();
  return s ? crypto.createHmac("sha256", s).update(value).digest("hex") : "";
}

/** Issues a signed `<expiryMs>.<hmac>` session token. */
export function issueSession(): string {
  const exp = String(Date.now() + SESSION_TTL_MS);
  return `${exp}.${sign(exp)}`;
}

/** Verifies a session cookie's signature and that it hasn't expired. */
export function verifySession(cookieValue: string | undefined | null): boolean {
  if (!cookieValue) return false;
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return false;
  const exp = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = sign(exp);
  if (!expected) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  return Number(exp) > Date.now();
}

/** Reads a single cookie value from a request's Cookie header. */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

/** Set-Cookie header value for the session (HttpOnly, Secure, scoped to /api/admin). */
export function sessionCookieHeader(value: string, maxAgeSec = SESSION_TTL_SEC): string {
  return `${ADMIN_COOKIE}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/api/admin; Max-Age=${Math.round(maxAgeSec)}`;
}
