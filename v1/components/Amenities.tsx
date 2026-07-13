"use client";

import { useLanguage } from "./LanguageProvider";

export function Amenities() {
  const { t } = useLanguage();

  return (
    <section id="amenities" className="bg-sand-100/60 py-12">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-2xl font-bold text-aegean-900">{t.amenities.heading}</h2>
        <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {t.amenities.items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-aegean-900/90">
              <span aria-hidden className="text-aegean-500">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
