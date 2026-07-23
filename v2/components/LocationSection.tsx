"use client";

import { useLanguage } from "./LanguageProvider";
import { useTheme } from "./ThemeProvider";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { siteConfig } from "@/content/siteConfig";

// A muted, warm map skin that matches the sand/aegean palette so the map reads
// as part of the design rather than a stock Google embed. Each entry is one
// Google Static Maps `style` directive.
const MAP_STYLE = [
  "feature:water|element:geometry|color:0xbfe0e4",
  "feature:landscape|element:geometry|color:0xf4efe4",
  "feature:poi|element:geometry|color:0xe8dfc9",
  "feature:poi|element:labels|visibility:off",
  "feature:poi.park|element:geometry|color:0xd6e6cf",
  "feature:road|element:geometry.fill|color:0xffffff",
  "feature:road|element:geometry.stroke|color:0xe8dfc9",
  "feature:road.highway|element:geometry|color:0xf1d9cd",
  "feature:transit|visibility:off",
  "feature:administrative|element:geometry.stroke|color:0xc3e0e3",
  "element:labels.text.fill|color:0x204e57",
  "element:labels.text.stroke|color:0xffffff|weight:2",
];

// Dark counterpart of MAP_STYLE, built from the "ink" palette so the map keeps
// belonging to the design in dark mode instead of glowing as a light rectangle.
const MAP_STYLE_DARK = [
  "feature:water|element:geometry|color:0x0e2e34",
  "feature:landscape|element:geometry|color:0x0c2024",
  "feature:poi|element:geometry|color:0x14323a",
  "feature:poi|element:labels|visibility:off",
  "feature:poi.park|element:geometry|color:0x143028",
  "feature:road|element:geometry.fill|color:0x274d55",
  "feature:road|element:geometry.stroke|color:0x1c414a",
  "feature:road.highway|element:geometry|color:0x3a2c24",
  "feature:transit|visibility:off",
  "feature:administrative|element:geometry.stroke|color:0x274d55",
  "element:labels.text.fill|color:0xa3bcc1",
  "element:labels.text.stroke|color:0x0c2024|weight:2",
];

export function LocationSection() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { latitude, longitude } = siteConfig.geo;
  const { streetAddress, addressLocality, postalCode } = siteConfig.address;

  // "Open in Google Maps" should read as the real street address, not raw
  // coordinates. We search by the human address (postcode disambiguates the
  // street); the static image below still drops its pin on the exact geo coords.
  const mapsQuery = encodeURIComponent(`${streetAddress}, ${addressLocality} ${postalCode}`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const embedSrc = `https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;

  // Static Maps needs a browser-key. When it's set we render a branded static
  // image (terracotta pin + custom skin); otherwise we fall back to the
  // keyless interactive embed so the section always works. The key is exposed
  // client-side by design — restrict it to your domain via an HTTP-referrer
  // restriction in the Google Cloud console.
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const staticMapUrl = mapsKey
    ? "https://maps.googleapis.com/maps/api/staticmap?" +
      [
        `center=${latitude},${longitude}`,
        "zoom=15",
        "size=640x360",
        "scale=2",
        "maptype=roadmap",
        // Brand-terracotta pin dropped on the exact coordinates.
        `markers=${encodeURIComponent(`color:0xcc6440|${latitude},${longitude}`)}`,
        ...(theme === "dark" ? MAP_STYLE_DARK : MAP_STYLE).map(
          (s) => `style=${encodeURIComponent(s)}`
        ),
        `key=${mapsKey}`,
      ].join("&")
    : null;

  return (
    <section id="location" className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
      <Reveal>
        <SectionHeading eyebrow={t.location.eyebrow} subtitle={t.location.text}>
          {t.location.heading}
        </SectionHeading>
      </Reveal>

      <Reveal delay={80}>
        <div className="group relative mt-8 overflow-hidden rounded-2xl border border-sand-200 shadow-elev-2 ring-1 ring-aegean-900/5 dark:border-ink-border dark:shadow-none dark:ring-white/5">
          {staticMapUrl ? (
            // Static preview that opens the full interactive map on tap.
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" aria-label={t.location.mapCta}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={staticMapUrl}
                alt={`${streetAddress}, ${addressLocality}`}
                width={640}
                height={360}
                loading="lazy"
                className="h-[320px] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] sm:h-[380px]"
              />
            </a>
          ) : (
            <iframe
              title="Map"
              src={embedSrc}
              width="100%"
              height="360"
              style={{ border: 0, display: "block" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}

          {/* Floating address chip — kept top-left so it never covers Google's
              required bottom attribution. */}
          <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/95 py-2 pl-3 pr-4 shadow-elev-1 backdrop-blur dark:bg-ink-surface/95 dark:ring-1 dark:ring-ink-border">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-terracotta-500"
              fill="currentColor"
            >
              <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
            </svg>
            <span className="text-sm font-semibold text-aegean-900 dark:text-ink-text">
              {streetAddress}, {addressLocality}
            </span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-aegean-600 transition-colors hover:text-aegean-700 dark:text-aegean-200 dark:hover:text-aegean-100"
        >
          {t.location.mapCta}
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </a>
      </Reveal>
    </section>
  );
}
