"use client";

import Image from "next/image";
import { siteConfig } from "@/content/siteConfig";

export function Gallery() {
  const rest = siteConfig.images.slice(1);
  if (rest.length === 0) return null;

  return (
    <section aria-label="Photo gallery" className="mx-auto max-w-5xl px-4 py-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rest.map((img) => (
          <div key={img.src} className="relative aspect-square overflow-hidden rounded-xl bg-sand-100">
            <Image src={img.src} alt="" fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}
