// Non-translatable facts about the property. Update freely — none of this
// needs a code change elsewhere, everything else reads from here.
export const siteConfig = {
  name: "Patras Center Apartment",

  // Used for canonical URLs, Open Graph, and JSON-LD. Falls back to a
  // placeholder until NEXT_PUBLIC_SITE_URL is set (see .env.local.example).
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://your-site.vercel.app",

  address: {
    streetAddress: "TODO: street & number",
    addressLocality: "Πάτρα",
    addressRegion: "Αχαΐα",
    postalCode: "TODO",
    addressCountry: "GR",
  },

  // Approximate coordinates near Psila Alonia square — replace with the
  // exact building location for the map embed and schema.org geo tags.
  geo: {
    latitude: 38.2466,
    longitude: 21.7346,
  },

  contact: {
    email: "TODO@example.com",
    phone: "+30 6900000000",
  },

  capacity: {
    maxGuests: 5,
    bedrooms: 2,
    beds: 3, // 1 double + 1 single + 1 sofa bed
    bathrooms: 1,
  },

  // Simple placeholder pricing — no dynamic pricing in v1.
  priceFromEur: 55,

  // Cross-links to the existing listings (used in the footer / schema
  // sameAs — also a soft trust signal: "already trusted by X guests").
  listings: {
    airbnbUrl: "https://www.airbnb.com/rooms/TODO",
    bookingUrl: "https://www.booking.com/hotel/gr/TODO.html",
  },

  ratings: {
    airbnbScore: 4.95,
    airbnbIsSuperhost: true,
  },

  images: [
    // Add real photos to /public/images and list them here in display
    // order. The first image is used as the hero/OG image.
    { src: "/images/placeholder-1.jpg", altKey: "gallery.alt1" },
    { src: "/images/placeholder-2.jpg", altKey: "gallery.alt2" },
    { src: "/images/placeholder-3.jpg", altKey: "gallery.alt3" },
  ],

  // How far ahead the availability calendar shows.
  calendarHorizonDays: 365,
} as const;
