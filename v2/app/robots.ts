import type { MetadataRoute } from "next";
import { siteConfig } from "@/content/siteConfig";

export default function robots(): MetadataRoute.Robots {
  return {
    // /api/calendar.ics publishes when the apartment is occupied. It has to be
    // publicly readable (Airbnb and Booking.com fetch it unauthenticated), but
    // there's no reason for it to sit in a search index.
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
