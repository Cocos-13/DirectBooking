"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";

// A persistent booking CTA that slides up once the hero scrolls out of view
// and slides away again when the booking section comes into view — so there's
// always exactly one primary booking action on screen, never two competing.
export function BookingBar() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    const book = document.getElementById("book");
    if (!hero || !book) return;

    let heroVisible = true;
    let bookVisible = false;
    const update = () => setVisible(!heroVisible && !bookVisible);

    const heroObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      update();
    });
    const bookObserver = new IntersectionObserver(
      ([entry]) => {
        bookVisible = entry.isIntersecting;
        update();
      },
      // Reveal the form a touch before it's fully in view so the bar doesn't
      // linger on top of it.
      { rootMargin: "0px 0px -25% 0px" }
    );

    heroObserver.observe(hero);
    bookObserver.observe(book);
    return () => {
      heroObserver.disconnect();
      bookObserver.disconnect();
    };
  }, []);

  const price = t.hero.priceFrom.replace("{price}", String(siteConfig.priceFromEur));

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-sand-200 bg-sand-50/95 backdrop-blur transition-transform duration-300 ease-out dark:border-ink-border dark:bg-ink-bg/95 ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-aegean-900 dark:text-ink-text">{price}</p>
          {siteConfig.ratings.airbnbIsSuperhost && (
            <p className="text-xs text-aegean-900/60 dark:text-ink-muted">
              ★ {siteConfig.ratings.airbnbScore.toFixed(2)} · Airbnb Superhost
            </p>
          )}
        </div>
        <a
          href="#book"
          tabIndex={visible ? 0 : -1}
          className="shrink-0 rounded-full bg-terracotta-500 px-6 py-3 text-sm font-semibold text-white shadow-elev-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-terracotta-600 hover:shadow-elev-3 active:translate-y-0"
        >
          {t.hero.cta}
        </a>
      </div>
    </div>
  );
}
