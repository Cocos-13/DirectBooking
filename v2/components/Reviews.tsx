"use client";

import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";

// Deterministic warm-palette avatar tint per reviewer, so colors are stable
// across renders rather than random.
const AVATAR_COLORS = [
  "bg-aegean-500",
  "bg-terracotta-500",
  "bg-aegean-600",
  "bg-terracotta-400",
  "bg-aegean-400",
];

function Stars() {
  return (
    <div className="flex items-center gap-1 text-terracotta-400" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export function Reviews() {
  const { t } = useLanguage();
  const { airbnbScore, airbnbReviewCount, airbnbIsSuperhost } = siteConfig.ratings;

  return (
    <section id="reviews" className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="text-2xl font-bold text-aegean-900 sm:text-3xl">{t.reviews.heading}</h2>

      {/* Rating anchor — the primary trust signal */}
      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-sand-200 bg-white px-6 py-8 text-center">
        <div className="text-5xl font-bold tracking-tight text-aegean-900">
          {airbnbScore.toFixed(2)}
        </div>
        <Stars />
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-aegean-900/70">
          <span>{t.reviews.ratingCount.replace("{count}", String(airbnbReviewCount))}</span>
          {airbnbIsSuperhost && (
            <>
              <span aria-hidden className="text-aegean-900/30">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-aegean-50 px-3 py-1 text-xs font-semibold text-aegean-700">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                  <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
                </svg>
                {t.reviews.superhost}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Individual reviews — masonry so varied-length quotes pack cleanly */}
      <div className="mt-8 gap-4 sm:columns-2">
        {siteConfig.reviews.map((review, i) => (
          <figure
            key={review.name}
            className="mb-4 break-inside-avoid rounded-2xl border border-sand-200 bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                aria-hidden
              >
                {review.name.charAt(0)}
              </span>
              <figcaption className="font-semibold text-aegean-900">{review.name}</figcaption>
            </div>
            <blockquote className="mt-3 text-sm leading-relaxed text-aegean-900/80">
              “{review.text}”
            </blockquote>
          </figure>
        ))}
      </div>

      <div className="mt-4 text-center">
        <a
          href={siteConfig.listings.airbnbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-semibold text-aegean-600 hover:underline"
        >
          {t.reviews.viewAllCta} →
        </a>
      </div>
    </section>
  );
}
