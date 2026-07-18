"use client";

import type { ReactNode } from "react";
import { useLanguage } from "./LanguageProvider";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

// Category icons — inline so there's no icon-library dependency. Each is a
// 24×24 line glyph that inherits the surrounding text color via currentColor.
const ICONS: Record<string, ReactNode> = {
  kitchen: (
    <>
      <path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </>
  ),
  comfort: (
    <>
      <path d="M12 20h.01" />
      <path d="M2 8.82a15 15 0 0 1 20 0" />
      <path d="M5 12.86a10 10 0 0 1 14 0" />
      <path d="M8.5 16.43a5 5 0 0 1 7 0" />
    </>
  ),
  safety: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  access: (
    <>
      <path d="M2.59 17.41A2 2 0 0 0 2 18.83V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.17a2 2 0 0 0 1.42-.59l.81-.81a6.5 6.5 0 1 0-4-4z" />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
    </>
  ),
};

const FALLBACK_ICON: ReactNode = <circle cx="12" cy="12" r="9" />;

export function Amenities() {
  const { t } = useLanguage();

  return (
    <section id="amenities" className="bg-sand-100/60 py-16 sm:py-24 dark:bg-ink-surface/25">
      <div className="mx-auto max-w-5xl px-4">
        <Reveal>
          <SectionHeading eyebrow={t.amenities.eyebrow}>{t.amenities.heading}</SectionHeading>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {t.amenities.groups.map((group, i) => (
            <Reveal key={group.key} delay={i * 80} className="h-full">
              <div className="group h-full rounded-2xl border border-sand-200 bg-white p-6 shadow-elev-1 transition-all duration-300 hover:-translate-y-1 hover:border-aegean-100 hover:shadow-elev-2 dark:border-ink-border dark:bg-ink-surface dark:shadow-none dark:hover:border-aegean-500/40">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-aegean-50 text-aegean-600 transition-colors duration-300 group-hover:bg-aegean-100 dark:bg-aegean-500/15 dark:text-aegean-200 dark:group-hover:bg-aegean-500/25">
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
                      {ICONS[group.key] ?? FALLBACK_ICON}
                    </svg>
                  </span>
                  <h3 className="text-base font-semibold text-aegean-900 dark:text-ink-text">{group.label}</h3>
                </div>

                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-aegean-900/70 dark:text-ink-text/70">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
