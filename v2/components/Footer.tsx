"use client";

import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";
import { contactLinks } from "@/lib/contact";
import { VivaBadge } from "./VivaBadge";

export function Footer() {
  const { t, lang } = useLanguage();
  const year = new Date().getFullYear();
  const contact = contactLinks();

  const legalLinks =
    lang === "el"
      ? [
          { href: "/legal/privacy", label: "Απόρρητο" },
          { href: "/legal/terms", label: "Όροι" },
          { href: "/legal/house-rules", label: "Κανόνες" },
        ]
      : [
          { href: "/legal/privacy", label: "Privacy" },
          { href: "/legal/terms", label: "Terms" },
          { href: "/legal/house-rules", label: "House rules" },
        ];
  const ama = siteConfig.registration.amaNumber?.trim();

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

        <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {legalLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-medium text-aegean-600 hover:underline dark:text-aegean-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <p className="mt-4">
          <span className="font-semibold text-aegean-900 dark:text-ink-text">
            {t.footer.contactLabel}:
          </span>{" "}
          <a
            href={contact.mailto}
            className="font-medium text-aegean-600 hover:underline dark:text-aegean-200"
          >
            {contact.email}
          </a>
          {" · "}
          <a
            href={contact.tel}
            className="font-medium text-aegean-600 hover:underline dark:text-aegean-200"
          >
            {contact.phoneDisplay}
          </a>
        </p>

        {ama && (
          <p className="mt-3 text-xs text-aegean-900/50 dark:text-ink-muted">
            {lang === "el" ? "Αρ. Μητρώου Ακινήτου (ΑΜΑ)" : "Property registry no. (ΑΜΑ)"}: {ama}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sand-200 pt-4 dark:border-ink-border">
          <p>
            © {year} {siteConfig.name}. {t.footer.rights}
          </p>
          <VivaBadge />
        </div>
      </div>
    </footer>
  );
}
