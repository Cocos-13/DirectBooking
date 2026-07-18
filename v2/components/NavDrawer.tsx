"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";

// The site's primary navigation at every breakpoint, delivered as a left
// off-canvas drawer (the header's horizontal link list was retired in favor of
// this). The trigger is an animated hamburger that morphs into an X — the
// geometry is lifted from the skyleen77 "Menu Icon" on 21st.dev, but
// reimplemented as a plain SVG driven by CSS transforms instead of pulling in
// motion/react, so it stays dependency-free and inherits the site palette.
// (Same trade-off already made for CircularTestimonials.) Reduced-motion is
// handled globally by the rule in globals.css.
//
// The scrim + drawer are rendered into document.body via a portal, NOT inline:
// the sticky <header> uses backdrop-blur, and a backdrop-filter ancestor becomes
// the containing block for position:fixed descendants (same as transform would).
// Left inline, the drawer's inset-y-0 would resolve against the 64px header
// instead of the viewport, so it could only ever be header-tall. The portal
// lifts it out to <body>, where `fixed` is viewport-relative again.
export function NavDrawer() {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerId = useId();

  const links = [
    { href: "#description", label: t.nav.description },
    { href: "#amenities", label: t.nav.amenities },
    { href: "#reviews", label: t.nav.reviews },
    { href: "#location", label: t.nav.location },
    { href: "#rules", label: t.nav.rules },
  ];

  // A11y strings are inlined per-language, matching the pattern in ThemeToggle.
  const openLabel = lang === "el" ? "Άνοιγμα μενού" : "Open menu";
  const closeLabel = lang === "el" ? "Κλείσιμο μενού" : "Close menu";
  const navLabel = lang === "el" ? "Πλοήγηση" : "Navigation";

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    // preventScroll: never yank the page back to the top just to restore focus.
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  // Portal target (document.body) only exists on the client.
  useEffect(() => setMounted(true), []);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Keep the (always-mounted) drawer out of the tab order + a11y tree while it's
  // closed — it stays in the DOM so the slide transition can play both ways.
  useEffect(() => {
    if (drawerRef.current) drawerRef.current.inert = !open;
  }, [open, mounted]);

  // Esc closes; focus the drawer's close button when it opens.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    drawerRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const navigate = useCallback((href: string) => {
    close(false); // scrolling *is* the focus move; don't fight it by refocusing the trigger
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Next frame: let the drawer begin closing + the scroll-lock lift first.
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", href);
    });
  }, [close]);

  const linkClass =
    "rounded-xl px-4 py-3 text-base font-medium text-aegean-900/85 transition-colors hover:bg-sand-100 hover:text-aegean-900 dark:text-ink-text/85 dark:hover:bg-ink-surface dark:hover:text-ink-text";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={openLabel}
        aria-expanded={open}
        aria-controls={drawerId}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-aegean-700/15 bg-white/80 text-aegean-700 shadow-sm backdrop-blur transition-colors hover:bg-aegean-50 dark:border-ink-border dark:bg-ink-surface/80 dark:text-ink-text dark:hover:bg-ink-raised"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[20px] w-[20px]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden
        >
          <line
            x1="4"
            y1="6"
            x2="20"
            y2="6"
            className={`origin-center [transform-box:fill-box] transition-transform duration-300 ease-out ${
              open ? "translate-y-[6px] rotate-45" : ""
            }`}
          />
          <line
            x1="4"
            y1="12"
            x2="20"
            y2="12"
            className={`transition-opacity duration-200 ${open ? "opacity-0" : "opacity-100"}`}
          />
          <line
            x1="4"
            y1="18"
            x2="20"
            y2="18"
            className={`origin-center [transform-box:fill-box] transition-transform duration-300 ease-out ${
              open ? "-translate-y-[6px] -rotate-45" : ""
            }`}
          />
        </svg>
      </button>

      {mounted &&
        createPortal(
          <>
            {/* Scrim — dims + blurs the page behind the drawer; tap to close. */}
            <div
              aria-hidden
              onClick={() => close()}
              className={`fixed inset-0 z-[60] bg-aegean-900/40 backdrop-blur-sm transition-opacity duration-300 ${
                open ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            />

            {/* Drawer */}
            <div
              ref={drawerRef}
              id={drawerId}
              role="dialog"
              aria-modal="true"
              aria-label={navLabel}
              className={`fixed inset-y-0 left-0 z-[70] flex w-[min(20rem,82vw)] flex-col border-r border-sand-200 bg-sand-50 shadow-elev-3 transition-transform duration-300 ease-out dark:border-ink-border dark:bg-ink-bg ${
                open ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div
                className="flex h-16 items-center justify-between gap-4 border-b border-sand-200 px-5 dark:border-ink-border"
                style={{ paddingTop: "env(safe-area-inset-top)" }}
              >
                <a
                  href="#top"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("#top");
                  }}
                  className="font-semibold tracking-tight text-aegean-700 transition-colors hover:text-aegean-600 dark:text-aegean-200 dark:hover:text-aegean-100"
                >
                  {siteConfig.name}
                </a>
                <button
                  data-autofocus
                  type="button"
                  onClick={() => close()}
                  aria-label={closeLabel}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-aegean-700/15 bg-white/80 text-aegean-700 shadow-sm transition-colors hover:bg-aegean-50 dark:border-ink-border dark:bg-ink-surface/80 dark:text-ink-text dark:hover:bg-ink-raised"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[20px] w-[20px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(link.href);
                    }}
                    className={linkClass}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <div
                className="border-t border-sand-200 p-4 dark:border-ink-border"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <a
                  href="#book"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("#book");
                  }}
                  className="flex w-full items-center justify-center rounded-full bg-terracotta-500 px-6 py-3 text-sm font-semibold text-white shadow-elev-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-terracotta-600 hover:shadow-elev-3 active:translate-y-0"
                >
                  {t.nav.book}
                </a>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
