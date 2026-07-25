"use client";

import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { NavDrawer } from "./NavDrawer";
import { siteConfig } from "@/content/siteConfig";

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-sand-200/40 bg-sand-50/55 backdrop-blur-xl dark:border-ink-border/40 dark:bg-ink-bg/55">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2">
          {/* Hamburger + slide-out drawer — the site's navigation at every breakpoint. */}
          <NavDrawer />
          <a
            href="#top"
            className="font-semibold tracking-tight text-aegean-700 transition-colors hover:text-aegean-600 dark:text-aegean-200 dark:hover:text-aegean-100"
          >
            {siteConfig.name}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
