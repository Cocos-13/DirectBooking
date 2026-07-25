"use client";

import Image from "next/image";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { NavDrawer } from "./NavDrawer";
import { siteConfig } from "@/content/siteConfig";

export function Header() {
  const heroImage = siteConfig.images[0];

  return (
    <header className="sticky top-0 z-50 h-16">
      {/* Frosted-glass backdrop, taller than the header itself and alpha-
          masked from opaque at the top to fully transparent by the bottom —
          the glass melts into the page instead of cutting off at a hard
          line. Two stacked pieces:
            1. a plain, uncropped copy of the hero photo, purely so
               backdrop-blur has real image content to blur before the user
               has scrolled (at scroll 0 the actual Hero — a separate,
               untouched component — hasn't reached the header yet). This
               never resizes or repositions the real Hero image.
            2. the translucent + backdrop-blur tint on top, which is what
               actually blurs real page content once scrolled.
          The nav row above stays a fixed h-16. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-44 overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_40%,rgba(0,0,0,0.55)_58%,rgba(0,0,0,0.22)_78%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_40%,rgba(0,0,0,0.55)_58%,rgba(0,0,0,0.22)_78%,transparent_100%)]"
      >
        {heroImage && (
          <Image src={heroImage.src} alt="" fill sizes="100vw" className="object-cover" />
        )}
        <div className="absolute inset-0 bg-sand-50/70 backdrop-blur-xl dark:bg-ink-bg/70" />
      </div>
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
