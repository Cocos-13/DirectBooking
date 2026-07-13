"use client";

import { useLanguage } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { siteConfig } from "@/content/siteConfig";

export function Header() {
  const { t } = useLanguage();

  const links = [
    { href: "#description", label: t.nav.description },
    { href: "#amenities", label: t.nav.amenities },
    { href: "#reviews", label: t.nav.reviews },
    { href: "#location", label: t.nav.location },
    { href: "#rules", label: t.nav.rules },
  ];

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-sand-200 bg-sand-50/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-4 px-4">
        <a href="#top" className="font-semibold text-aegean-700">
          {siteConfig.name}
        </a>
        <nav className="hidden gap-6 text-sm font-medium text-aegean-900/80 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-aegean-600">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="#book"
            className="hidden rounded-full bg-terracotta-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-terracotta-600 sm:inline-block"
          >
            {t.nav.book}
          </a>
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
