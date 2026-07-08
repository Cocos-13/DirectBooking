"use client";

import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";

export function LocationSection() {
  const { t } = useLanguage();
  const { latitude, longitude } = siteConfig.geo;
  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const embedSrc = `https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;

  return (
    <section id="location" className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="text-2xl font-bold text-aegean-900">{t.location.heading}</h2>
      <p className="mt-4 leading-relaxed text-aegean-900/90">{t.location.text}</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-sand-200">
        <iframe
          title="Map"
          src={embedSrc}
          width="100%"
          height="320"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-sm font-semibold text-aegean-600 hover:underline"
      >
        {t.location.mapCta} →
      </a>
    </section>
  );
}
