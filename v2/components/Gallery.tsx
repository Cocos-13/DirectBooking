"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { Reveal } from "./Reveal";
import { siteConfig } from "@/content/siteConfig";

// Show at most this many tiles in the on-page grid; any extras collapse into
// a "+N" overlay on the last tile that opens the full-screen viewer.
const MAX_PREVIEW = 6;

export function Gallery() {
  const { t } = useLanguage();
  const images = [...siteConfig.images];
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const hasMultiple = images.length > 1;

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(
    () => setOpenIndex((p) => (p === null ? p : (p + 1) % images.length)),
    [images.length]
  );
  const prev = useCallback(
    () => setOpenIndex((p) => (p === null ? p : (p - 1 + images.length) % images.length)),
    [images.length]
  );

  // While the viewer is open: wire up keyboard nav and lock body scroll.
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openIndex, close, next, prev]);

  if (images.length === 0) return null;

  const preview = images.slice(0, MAX_PREVIEW);
  const hiddenCount = images.length - preview.length;

  return (
    <section aria-label="Photo gallery" className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
      <Reveal className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {preview.map((img, i) => {
          const isOverflowTile = i === preview.length - 1 && hiddenCount > 0;
          return (
            <button
              key={img.src}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-sand-100 shadow-elev-1 transition-shadow duration-300 hover:shadow-elev-2"
            >
              <Image
                src={img.src}
                alt={`${siteConfig.name} — ${i + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 322px"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
              />
              {isOverflowTile && (
                <span className="absolute inset-0 flex items-center justify-center bg-aegean-900/55 text-xl font-semibold text-white">
                  +{hiddenCount}
                </span>
              )}
            </button>
          );
        })}
      </Reveal>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          className="rounded-full border border-aegean-600 px-5 py-2 text-sm font-semibold text-aegean-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-aegean-50 hover:shadow-elev-1 active:translate-y-0"
        >
          {t.gallery.viewAll.replace("{count}", String(images.length))}
        </button>
      </div>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={close}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-aegean-900/95 backdrop-blur-sm"
        >
          <button
            type="button"
            aria-label={t.gallery.close}
            onClick={close}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {hasMultiple && (
            <button
              type="button"
              aria-label={t.gallery.prev}
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          <div
            className="relative h-[78vh] w-[92vw] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[openIndex].src}
              alt={`${siteConfig.name} — ${openIndex + 1}`}
              fill
              sizes="100vw"
              priority
              className="object-contain"
            />
          </div>

          {hasMultiple && (
            <button
              type="button"
              aria-label={t.gallery.next}
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
            {openIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </section>
  );
}
