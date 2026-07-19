import { Redis } from "@upstash/redis";
import crypto from "crypto";

// Lightweight fixed-window rate limiter. Backed by the same Upstash/Vercel KV
// store as the rest of the app; falls back to a per-instance in-memory window
// when no store is configured (best-effort only — serverless runs many
// instances, so provision KV for real protection).
//
// Fixed-window (INCR + EXPIRE) is intentionally simple: it can allow a 2x burst
// at a window boundary, which is fine for abuse mitigation (email-bombing,
// brute force) where we care about sustained rate, not perfect smoothing.

function creds(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

let client: Redis | null = null;
function getClient(): Redis | null {
  if (client) return client;
  const c = creds();
  if (!c) return null;
  client = new Redis({ url: c.url, token: c.token });
  return client;
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  limit: number;
}

interface Window {
  count: number;
  resetAt: number;
}
const mem = new Map<string, Window>();

function memHit(key: string, limit: number, windowSec: number): RateResult {
  const now = Date.now();
  // Opportunistic sweep so the map can't grow without bound.
  if (mem.size > 5000) {
    for (const [k, w] of mem) if (w.resetAt <= now) mem.delete(k);
  }
  const existing = mem.get(key);
  if (!existing || existing.resetAt <= now) {
    mem.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: limit >= 1, remaining: Math.max(0, limit - 1), limit };
  }
  existing.count += 1;
  return { ok: existing.count <= limit, remaining: Math.max(0, limit - existing.count), limit };
}

/** Consumes one unit against `key`. Returns whether the request is allowed. */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateResult> {
  const c = getClient();
  if (c) {
    try {
      const k = `rl:${key}`;
      const n = await c.incr(k);
      if (n === 1) await c.expire(k, windowSec);
      return { ok: n <= limit, remaining: Math.max(0, limit - n), limit };
    } catch (err) {
      console.error("[rateLimit] store error, falling back to memory:", err);
    }
  }
  return memHit(key, limit, windowSec);
}

export interface RateRule {
  key: string;
  limit: number;
  windowSec: number;
}

/**
 * Applies several rules; returns the first that is exceeded (so the caller can
 * log which limit tripped), or null if all pass. Cheapest/most-specific rule
 * should come first.
 */
export async function firstExceeded(rules: RateRule[]): Promise<RateRule | null> {
  for (const r of rules) {
    const res = await rateLimit(r.key, r.limit, r.windowSec);
    if (!res.ok) return r;
  }
  return null;
}

/** Stable, non-reversible key fragment — keeps raw IPs/emails out of the store. */
export function hashId(value: string): string {
  return crypto.createHash("sha256").update(value).digest("base64url").slice(0, 16);
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}
