"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { ChannelButton, useContactChannels } from "./ContactChannels";

// A floating contact button. Tapping it fans out the four channels above it.
// It mirrors the BookingBar's visibility logic so that, whenever the sticky
// booking bar occupies the bottom edge, the button lifts above it instead of
// overlapping.
export function ContactFab() {
  const { t } = useLanguage();
  const channels = useContactChannels();
  const [open, setOpen] = useState(false);
  const [barVisible, setBarVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    const book = document.getElementById("book");
    if (!hero || !book) return;

    let heroVisible = true;
    let bookVisible = false;
    const update = () => setBarVisible(!heroVisible && !bookVisible);

    const ho = new IntersectionObserver(([e]) => {
      heroVisible = e.isIntersecting;
      update();
    });
    const bo = new IntersectionObserver(
      ([e]) => {
        bookVisible = e.isIntersecting;
        update();
      },
      { rootMargin: "0px 0px -25% 0px" }
    );
    ho.observe(hero);
    bo.observe(book);
    return () => {
      ho.disconnect();
      bo.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <button
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-aegean-900/5 dark:bg-black/20"
        />
      )}

      <div
        className="fixed right-4 z-50 flex flex-col items-end gap-3 sm:right-6"
        style={{ bottom: `calc(${barVisible ? "5.25rem" : "1.5rem"} + env(safe-area-inset-bottom))` }}
      >
        <div
          className={`flex flex-col items-end gap-2.5 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        >
          {channels.map((c, i) => (
            <div
              key={c.key}
              className={`transition-all duration-200 ${
                open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
              style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
            >
              <ChannelButton channel={c} onClick={() => setOpen(false)} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? t.contact.fabClose : t.contact.fabLabel}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-terracotta-500 text-white shadow-elev-3 transition-all duration-200 hover:bg-terracotta-600 active:scale-95"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {open ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
            )}
          </svg>
        </button>
      </div>
    </>
  );
}
