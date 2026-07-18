"use client";

import { useLanguage } from "./LanguageProvider";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

export function HouseRules() {
  const { t } = useLanguage();

  return (
    <section id="rules" className="bg-sand-100/60 py-16 sm:py-24 dark:bg-ink-surface/25">
      <div className="mx-auto max-w-3xl px-4">
        <Reveal>
          <SectionHeading eyebrow={t.houseRules.eyebrow}>{t.houseRules.heading}</SectionHeading>
        </Reveal>

        <Reveal delay={80}>
          <ul className="mt-8 divide-y divide-sand-200 overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-elev-1 dark:divide-ink-border dark:border-ink-border dark:bg-ink-surface dark:shadow-none">
            {t.houseRules.items.map((item) => (
              <li key={item} className="flex items-start gap-3 px-5 py-4 text-[15px] text-aegean-900/85 dark:text-ink-text/85">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-5 w-5 shrink-0 text-terracotta-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
