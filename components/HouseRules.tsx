"use client";

import { useLanguage } from "./LanguageProvider";

export function HouseRules() {
  const { t } = useLanguage();

  return (
    <section id="rules" className="bg-sand-100/60 py-12">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-2xl font-bold text-aegean-900">{t.houseRules.heading}</h2>
        <ul className="mt-6 space-y-2">
          {t.houseRules.items.map((item) => (
            <li key={item} className="flex gap-2 text-aegean-900/90">
              <span aria-hidden className="text-terracotta-500">
                •
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
