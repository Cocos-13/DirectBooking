"use client";

import { useLanguage } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
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
    <header className="sticky top-0 z-50 h-16 border-b border-sand-200 bg-sand-50/90 backdrop-blur dark:border-ink-border dark:bg-ink-bg/85">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-4 px-4">
        <a
          href="#top"
          className="font-semibold tracking-tight text-aegean-700 transition-colors hover:text-aegean-600 dark:text-aegean-200 dark:hover:text-aegean-100"
        >
          {siteConfig.name}
        </a>
        <nav className="hidden gap-7 text-sm font-medium text-aegean-900/80 md:flex dark:text-ink-text/80">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative py-1 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-terracotta-500 after:transition-transform after:duration-300 hover:text-aegean-900 hover:after:scale-x-100 dark:hover:text-ink-text"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
