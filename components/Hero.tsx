"use client";

import Image from "next/image";
import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";

export function Hero() {
  const { t } = useLanguage();
  const heroImage = siteConfig.images[0];

  return (
    <section id="top" className="relative">
      <div className="relative h-[62vh] min-h-[420px] w-full overflow-hidden bg-aegean-900">
        {heroImage && (
          <Image
            src={heroImage.src}
            alt={t.hero.tagline}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-90"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-aegean-900/80 via-aegean-900/20 to-aegean-900/10" />
        <div className="absolute inset-0 flex flex-col items-start justify-end gap-3 px-4 pb-10 sm:px-8 sm:pb-14">
          <div className="mx-auto w-full max-w-5xl">
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-sand-100/90">
              {t.hero.kicker}
            </p>
            <h1 className="max-w-2xl text-3xl font-bold text-white sm:text-5xl">{t.hero.tagline}</h1>
            <p className="mt-3 max-w-xl text-base text-sand-50/90 sm:text-lg">{t.hero.subtitle}</p>

            {siteConfig.ratings.airbnbIsSuperhost && (
              <p className="mt-2 text-sm text-sand-100/80">
                ★ {siteConfig.ratings.airbnbScore.toFixed(2)} · Airbnb Superhost
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href="#book"
                className="rounded-full bg-terracotta-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-terracotta-600"
              >
                {t.hero.cta}
              </a>
              <span className="text-sm font-medium text-sand-50/90">
                {t.hero.priceFrom.replace("{price}", String(siteConfig.priceFromEur))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
