"use client";

import Image from "next/image";
import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";

export function Hero() {
  const { t } = useLanguage();
  const heroImage = siteConfig.images[0];

  return (
    <section id="top" className="relative">
      <div className="relative h-[calc(100dvh-4rem)] min-h-[420px] w-full overflow-hidden bg-aegean-900">
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
        <div className="absolute inset-0 bg-gradient-to-t from-aegean-900/85 via-aegean-900/25 to-aegean-900/10" />
        <div className="absolute inset-0 flex flex-col items-start justify-end gap-3 px-4 pb-2 sm:px-8 sm:pb-12">
          <div className="mx-auto w-full max-w-5xl">
            <p className="mb-3 animate-fade-in-up text-xs font-semibold uppercase tracking-[0.2em] text-sand-100/90">
              {t.hero.kicker}
            </p>
            <h1 className="max-w-2xl animate-fade-in-up text-4xl font-bold leading-[1.05] tracking-tight text-white [animation-delay:80ms] sm:text-6xl">
              {t.hero.tagline}
            </h1>
            <p className="mt-4 max-w-xl animate-fade-in-up text-base leading-relaxed text-sand-50/90 [animation-delay:160ms] sm:text-lg">
              {t.hero.subtitle}
            </p>

            {siteConfig.ratings.airbnbIsSuperhost && (
              <p className="mt-3 inline-flex animate-fade-in-up items-center gap-1.5 text-sm font-medium text-sand-100/85 [animation-delay:220ms]">
                <span className="text-terracotta-400">★</span>
                {siteConfig.ratings.airbnbScore.toFixed(2)} · Airbnb Superhost
              </p>
            )}

            <div className="mt-7 flex animate-fade-in-up flex-wrap items-center gap-4 [animation-delay:300ms]">
              <a
                href="#book"
                className="rounded-full bg-terracotta-500 px-7 py-3.5 text-sm font-semibold text-white shadow-elev-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-terracotta-600 hover:shadow-elev-3 active:translate-y-0"
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
