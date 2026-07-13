"use client";

import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";

export function Description() {
  const { t } = useLanguage();
  const { capacity } = siteConfig;

  return (
    <section id="description" className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="text-2xl font-bold text-aegean-900">{t.description.heading}</h2>

      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm text-aegean-900/80 sm:grid-cols-4">
        <div>
          <dt className="font-semibold text-aegean-700">70</dt>
          <dd>{t.description.statSqm}</dd>
        </div>
        <div>
          <dt className="font-semibold text-aegean-700">{capacity.bedrooms}</dt>
          <dd>{t.description.statBedrooms}</dd>
        </div>
        <div>
          <dt className="font-semibold text-aegean-700">{capacity.beds}</dt>
          <dd>{t.description.statBeds}</dd>
        </div>
        <div>
          <dt className="font-semibold text-aegean-700">{capacity.maxGuests}</dt>
          <dd>{t.description.statGuests}</dd>
        </div>
      </dl>

      <div className="prose prose-sm mt-6 max-w-none text-aegean-900/90">
        {t.description.paragraphs.map((p, i) => (
          <p key={i} className="mb-4 leading-relaxed">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
