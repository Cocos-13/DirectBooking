"use client";

import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-sand-200 bg-sand-50 py-10 dark:border-ink-border dark:bg-ink-bg">
      <div className="mx-auto max-w-5xl px-4 text-sm text-aegean-900/70 dark:text-ink-text/70">
        <p>{t.footer.disclaimer}</p>

        <p className="mt-3">
          {t.footer.alsoOn}{" "}
          <a
            href={siteConfig.listings.airbnbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-aegean-600 hover:underline dark:text-aegean-200"
          >
            Airbnb
          </a>{" "}
          &{" "}
          <a
            href={siteConfig.listings.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-aegean-600 hover:underline dark:text-aegean-200"
          >
            Booking.com
          </a>
        </p>

        <p className="mt-3">
          © {year} {siteConfig.name}. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
