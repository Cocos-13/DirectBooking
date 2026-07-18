import Script from "next/script";

/**
 * Privacy-friendly, cookieless analytics (Plausible-compatible).
 *
 * Renders nothing unless NEXT_PUBLIC_ANALYTICS_DOMAIN is set, so local dev
 * and any deploy without analytics configured stay clean — no script, no
 * cookie banner needed. Works with Plausible cloud, a self-hosted Plausible
 * instance, or any compatible endpoint exposing the same `data-domain`
 * contract (e.g. a proxied script); point NEXT_PUBLIC_ANALYTICS_SRC at it.
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  if (!domain) return null;

  const src = process.env.NEXT_PUBLIC_ANALYTICS_SRC || "https://plausible.io/js/script.js";

  return <Script defer data-domain={domain} src={src} strategy="afterInteractive" />;
}
