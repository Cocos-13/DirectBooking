import type { Metadata } from "next";
import { Onest } from "next/font/google";
import localFont from "next/font/local";
import "react-day-picker/dist/style.css";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Analytics } from "@/components/Analytics";
import { ThemeProvider } from "@/components/ThemeProvider";
import { siteConfig } from "@/content/siteConfig";
import { translations } from "@/content/translations";

// Runs before first paint (blocking, in <head>) so the correct theme class is
// on <html> before any styled content renders — no flash of the wrong theme.
// Mirrors the logic in ThemeProvider; keep the storage key in sync.
const themeInitScript = `(function(){try{var k="patras-apartment-theme";var s=localStorage.getItem(k);var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

// Onest — an elegant geometric sans, arguably the closest free stand-in for
// Airbnb's Cereal. Used for statement numerals (e.g. the guest rating).
// Exposed as a CSS variable and referenced via Tailwind's `font-display`.
const displayFont = Onest({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
  variable: "--font-display",
});

// Rapid Response (semi-italic) — a single-style display face used only for
// the SUPERHOST wordmark behind the rating number.
const wordmarkFont = localFont({
  src: "./fonts/RapidResponseSemiItalic.otf",
  display: "swap",
  variable: "--font-wordmark",
});

// Default (Greek) metadata for crawlers and social previews. The visible
// page content still switches with the client-side language toggle.
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: translations.el.meta.title,
  description: translations.el.meta.description,
  keywords: [
    "διαμέρισμα Πάτρα κέντρο",
    "apartment Patras center",
    "Ypsila Alonia",
    "Ψηλά Αλώνια",
    "βραχυχρόνια μίσθωση Πάτρα",
    "short term rental Patras",
  ],
  alternates: {
    canonical: siteConfig.url,
    languages: {
      el: siteConfig.url,
      en: siteConfig.url,
    },
  },
  openGraph: {
    title: translations.el.meta.title,
    description: translations.el.meta.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [{ url: siteConfig.images[0]?.src ?? "/images/placeholder-1.jpg" }],
    locale: "el_GR",
    alternateLocale: ["en_US"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: translations.el.meta.title,
    description: translations.el.meta.description,
    images: [siteConfig.images[0]?.src ?? "/images/placeholder-1.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="el"
      className={`${displayFont.variable} ${wordmarkFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="bg-sand-50 font-sans text-aegean-900 antialiased dark:bg-ink-bg dark:text-ink-text">
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
