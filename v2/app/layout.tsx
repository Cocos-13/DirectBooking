import type { Metadata } from "next";
import "react-day-picker/dist/style.css";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { siteConfig } from "@/content/siteConfig";
import { translations } from "@/content/translations";

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
    <html lang="el">
      <body className="bg-sand-50 font-sans text-aegean-900 antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
