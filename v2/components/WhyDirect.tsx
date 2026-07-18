"use client";

import type { ReactNode } from "react";
import { useLanguage } from "./LanguageProvider";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { siteConfig } from "@/content/siteConfig";

// One line-icon per benefit key, keyed to the `benefits` array in
// translations. Same visual language as HouseRules/Amenities (24×24,
// stroked, currentColor) so the icon set stays coherent across the page.
const ICONS: Record<string, ReactNode> = {
  price: <path d="M20.59 13.41 12 22l-9-9V4a1 1 0 0 1 1-1h9zM7.5 7.5h.01" />,
  host: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />,
  flexible: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  trust: <path d="M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z" />,
};

const FALLBACK_ICON = <path d="M20 6 9 17l-5-5" />;

export function WhyDirect() {
  const { t } = useLanguage();
  const score = siteConfig.ratings.airbnbScore.toFixed(2);

  return (
    <section id="why-direct" className="bg-sand-100/60 py-16 sm:py-24 dark:bg-ink-surface/25">
      <div className="mx-auto max-w-5xl px-4">
        <Reveal>
          <SectionHeading eyebrow={t.whyDirect.eyebrow} subtitle={t.whyDirect.subtitle} align="center">
            {t.whyDirect.heading}
          </SectionHeading>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.whyDirect.benefits.map((benefit, i) => (
            <Reveal key={benefit.key} delay={80 + i * 60}>
              <div className="h-full rounded-2xl border border-sand-200 bg-white p-6 shadow-elev-1 dark:border-ink-border dark:bg-ink-surface dark:shadow-none">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-terracotta-500/10 text-terracotta-500 dark:bg-terracotta-500/15 dark:text-terracotta-400">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {ICONS[benefit.key] ?? FALLBACK_ICON}
                  </svg>
                </span>
                <h3 className="mt-4 text-base font-semibold text-aegean-900 dark:text-ink-text">{benefit.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-aegean-900/70 dark:text-ink-text/70">
                  {benefit.text.replace("{score}", score)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
