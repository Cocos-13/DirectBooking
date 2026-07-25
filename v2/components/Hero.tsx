"use client";

import Image from "next/image";
import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";

export function Hero() {
  const { t } = useLanguage();
  const heroImage = siteConfig.images[0];

  return (
    <section id="top" className="relative">
      {/* Starts at the very top of the viewport and runs behind the glass
          header instead of below it: -mt-16 cancels the header's 64px of
          flow, and h-[100dvh] (was h-[calc(100dvh-4rem)]) puts the bottom
          edge back exactly where it was, so nothing below the fold moves.

          Growing the box must not re-crop the photo. object-cover takes its
          scale from the *image element's* box, not the section's, so the
          image gets its own box: 4rem taller than the hero and anchored to
          the hero's top, spending the extra 4rem entirely above the old top
          edge — precisely the strip the header now floats over. The photo
          therefore keeps its previous size and position to the pixel, and
          the only new thing on screen is 4rem of its formerly-cropped top.

          That upper bound is only right while object-cover is driven by
          width (landscape: the photo is cropped top and bottom, so there IS
          hidden top to reveal). On portrait viewports it's driven by height
          — the full photo height already shows, nothing is cropped off the
          top — so the clamp collapses the box back to the hero's own height,
          keeping the photo's bottom edge pinned to the hero's bottom and the
          scale-up to the minimum needed to cover. 75vw is the crossover
          point: viewport width x 1200/1600, living-room.jpg's 4:3 aspect.
          The 100% lower bound is what guarantees the box always covers the
          hero, so this can never open a gap under the header. */}
      <div className="relative -mt-16 h-[100dvh] min-h-[484px] w-full overflow-hidden bg-aegean-900">
        {heroImage && (
          <div className="absolute inset-x-0 top-0 h-[clamp(100%,75vw,calc(100%_+_4rem))]">
            <Image
              src={heroImage.src}
              alt={t.hero.tagline}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-90"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-aegean-900/85 via-aegean-900/25 to-aegean-900/10" />
        <div className="absolute inset-0 flex flex-col items-start justify-end gap-3 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-8 sm:pb-12">
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

          {/* Clearance for the ContactFab, which floats in the bottom-right
              corner on mobile (1.5rem up, 3.5rem tall) and used to sit on top
              of the "from €72 / night" line. A shrinkable spacer rather than
              bottom padding: on a short viewport — or once a mobile browser's
              chrome eats into 100dvh — it collapses toward zero instead of
              pushing the kicker up behind the header. */}
          <div aria-hidden className="h-[5.5rem] shrink sm:hidden" />
        </div>
      </div>
    </section>
  );
}
