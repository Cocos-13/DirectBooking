"use client";

import { useLanguage } from "./LanguageProvider";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { siteConfig } from "@/content/siteConfig";

export function Description() {
  const { t } = useLanguage();
  const { capacity } = siteConfig;

  const stats = [
    { value: "70", label: t.description.statSqm },
    { value: capacity.bedrooms, label: t.description.statBedrooms },
    { value: capacity.beds, label: t.description.statBeds },
    { value: capacity.maxGuests, label: t.description.statGuests },
  ];

  return (
    <section id="description" className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
      <Reveal>
        <SectionHeading eyebrow={t.description.eyebrow}>
          {t.description.heading}
        </SectionHeading>
      </Reveal>

      <Reveal delay={80}>
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-sand-200 bg-white px-4 py-4 text-center shadow-elev-1 dark:border-ink-border dark:bg-ink-surface dark:shadow-none"
            >
              <dt className="text-3xl font-bold tracking-tight text-aegean-700 dark:text-aegean-200">{stat.value}</dt>
              <dd className="mt-0.5 text-xs font-medium uppercase tracking-wide text-aegean-900/55 dark:text-ink-muted">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal delay={120}>
        <div className="mt-8 max-w-none text-[15px] text-aegean-900/80 dark:text-ink-text/80">
          {t.description.paragraphs.map((p, i) => (
            <p key={i} className="mb-4 leading-relaxed last:mb-0">
              {p}
            </p>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
