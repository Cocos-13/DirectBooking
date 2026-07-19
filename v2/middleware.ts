import { NextResponse, type NextRequest } from "next/server";

// Edge middleware that attaches security headers — including a per-request
// nonce-based Content-Security-Policy — to every HTML/document response. The
// nonce lets us keep a strict `script-src` (no 'unsafe-inline') while still
// allowing our two inline scripts (theme init + JSON-LD) and Next's own inline
// hydration scripts; Next reads the nonce from the request CSP header and
// applies it to its scripts automatically.
//
// Rate limiting is deliberately NOT here: it needs the request body (per-email
// limits) and runs in the Node routes instead (see lib/rateLimit.ts).

/** Origin of the analytics script, when analytics is enabled. */
function analyticsOrigin(): string | null {
  if (!process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN) return null;
  const src = process.env.NEXT_PUBLIC_ANALYTICS_SRC || "https://plausible.io/js/script.js";
  try {
    return new URL(src).origin;
  } catch {
    return "https://plausible.io";
  }
}

function buildCsp(nonce: string): string {
  const analytics = analyticsOrigin();
  const script = ["'self'", `'nonce-${nonce}'`];
  const connect = ["'self'"];
  if (analytics) {
    script.push(analytics);
    connect.push(analytics);
  }
  // Dev needs eval for React Fast Refresh / HMR; production must not.
  if (process.env.NODE_ENV !== "production") script.push("'unsafe-eval'");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${script.join(" ")}`,
    // Tailwind/react-day-picker ship as static CSS ('self'); inline style
    // attributes and the owner action pages' <style> need 'unsafe-inline'.
    // Style-based injection is far lower risk than script injection.
    "style-src 'self' 'unsafe-inline'",
    // Google Static Maps + Unsplash review images + any https image.
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    // Keyless Google Maps embed iframe (used when no Static Maps key is set).
    "frame-src https://www.google.com",
    "upgrade-insecure-requests",
  ].join("; ");
}

function nonceValue(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function middleware(req: NextRequest) {
  const nonce = nonceValue();
  const csp = buildCsp(nonce);

  // Expose the nonce to server components (via x-nonce) and let Next pick it up
  // for its own scripts (via the request CSP header).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  res.headers.set("content-security-policy", csp);
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set("x-frame-options", "DENY");
  res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
  );
  res.headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("cross-origin-opener-policy", "same-origin");

  return res;
}

export const config = {
  // Run on documents/APIs, but skip Next internals and static asset folders.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|robots.txt|sitemap.xml).*)",
  ],
};
