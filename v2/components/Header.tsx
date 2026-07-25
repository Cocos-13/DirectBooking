"use client";

import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { NavDrawer } from "./NavDrawer";
import { siteConfig } from "@/content/siteConfig";

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-16">
      {/* Backdrop is taller than the header itself and alpha-masked from
          opaque at the top to fully transparent by the bottom, so the
          glass/blur melts into the page instead of cutting off at a hard
          edge. The nav row above stays a fixed h-16. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-28 bg-sand-50/70 backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_0%,black_40%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_40%,transparent_100%)] dark:bg-ink-bg/70"
      />
      <div className="relative mx-auto flex h-full max-w-5xl items-center justify-between gap-4 px-4">
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
