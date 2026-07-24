"use client";

import { useLanguage } from "./LanguageProvider";

// "Secure payments by viva.com" trust mark. Viva's go-live review requires the
// viva.com logo to be shown where payment is presented. The actual card entry
// happens on Viva's hosted Smart Checkout page (which carries Viva's own
// branding); this on-site badge satisfies the requirement on our own pages —
// it sits in the footer (every page) and in the booking section.
//
// The wordmark is rendered as styled text so the badge stays fully
// self-contained (no external asset, no hotlinking). To use Viva's official
// downloadable badge instead, drop it in /public/images and swap the wordmark
// <a> below for an <img>.
export function VivaBadge({ className = "" }: { className?: string }) {
  const { t } = useLanguage();

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs text-aegean-900/60 dark:text-ink-muted ${className}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span>{t.footer.securePayments}</span>
      <a
        href="https://www.viva.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="viva.com"
        className="font-extrabold tracking-tight text-aegean-900 hover:underline dark:text-white"
      >
        viva.com
      </a>
    </span>
  );
}
