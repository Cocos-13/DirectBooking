"use client";

import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";

export function Reviews() {
  const { t } = useLanguage();

  return (
    <section id="reviews" className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="text-2xl font-bold text-aegean-900">{t.reviews.heading}</h2>
      <p className="mt-1 text-sm text-aegean-900/70">{t.reviews.subtitle}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {siteConfig.reviews.map((review) => (
          <blockquote
            key={review.name}
            className="rounded-xl border border-sand-200 bg-white p-4 text-sm text-aegean-900/90"
          >
            <p className="leading-relaxed">“{review.text}”</p>
            <cite className="mt-3 block text-xs font-semibold not-italic text-aegean-700">
              {review.name}
            </cite>
          </blockquote>
        ))}
      </div>

      <a
        href={siteConfig.listings.airbnbUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-block text-sm font-semibold text-aegean-600 hover:underline"
      >
        {t.reviews.viewAllCta} →
      </a>
    </section>
  );
}
