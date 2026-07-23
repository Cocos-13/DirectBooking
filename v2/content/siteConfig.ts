// Non-translatable facts about the property. Update freely — none of this
// needs a code change elsewhere, everything else reads from here.
export const siteConfig = {
  name: "Patras Center Apartment",

  // Used for canonical URLs, Open Graph, and JSON-LD. Falls back to a
  // placeholder until NEXT_PUBLIC_SITE_URL is set (see .env.local.example).
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://your-site.vercel.app",

  address: {
    streetAddress: "Αθανασίου Διάκου 32",
    addressLocality: "Πάτρα",
    addressRegion: "Αχαΐα",
    postalCode: "26222",
    addressCountry: "GR",
  },

  // Exact building point for Athanasiou Diakou 32, from the owner's Google Maps
  // pin (verified 2026-07-23). Drives the map pin AND the schema.org
  // GeoCoordinates in app/page.tsx — keep it precise.
  geo: {
    latitude: 38.242015,
    longitude: 21.7348596,
  },

  contact: {
    email: "mavridiskon14@gmail.com",
    phone: "+30 6936983364",
  },

  // Legal / registration identity. Greek law 4446/2016 (art. 111) requires the
  // short-term-rental registry number (ΑΜΑ — Αριθμός Μητρώου Ακινήτων) to be
  // displayed. Fill these in; empty values render a visible TODO in the legal
  // pages and are omitted from the footer until set.
  registration: {
    amaNumber: "00003559420", // ΑΜΑ (Αριθμός Μητρώου Ακινήτου) — displayed in the footer.
    controllerName: "ΜΑΥΡΙΔΗΣ ΛΕΩΝΙ ΚΩΝ.", // Administrator / data-controller (as registered).
    controllerEmail: "mavridiskon14@gmail.com", // Where privacy/GDPR requests go.
    taxId: "", // ΑΦΜ, only if you invoice as a business (optional).
  },

  // Version stamp for the guest-facing Terms/Privacy/House-Rules. Bump this
  // whenever their content changes; the version each guest accepted is recorded
  // with their booking as consent evidence. Keep as YYYY-MM-DD.
  policyVersion: "2026-07-19",

  // Set false once a lawyer has reviewed the legal pages — hides the "draft,
  // pending legal review" banner. Keep true until then.
  legalDraft: true,

  capacity: {
    maxGuests: 5,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
  },

  host: {
    name: "Κωνσταντίνος",
    hostingSinceMonths: 9,
    responseRate: 100,
    responseTime: "within an hour",
  },

  // Nightly pricing. Each night is priced by the weekday it *falls on*:
  //   - Weekend nights = Friday & Saturday
  //   - Weekday nights = Sunday through Thursday
  // No dynamic/seasonal pricing in v1 — these two flat rates drive the
  // booking-form estimate (see lib/pricing.ts).
  pricing: {
    weekdayRateEur: 72, // Sun–Thu nights
    weekendRateEur: 85, // Fri & Sat nights
  },

  // Lowest nightly rate — shown as the hero/booking-bar "from" price.
  // Keep in sync with the cheaper of the two rates above.
  priceFromEur: 72,

  // Refundable damage deposit. Collected as a card PRE-AUTHORIZATION (a hold,
  // not a charge) via a link the owner sends the guest shortly before arrival —
  // pre-auth holds fall off cards within days, so they can't be placed months
  // ahead. Released after checkout if there's no damage, or captured up to this
  // amount if there is. Set to 0 to disable the deposit flow entirely.
  deposit: {
    amountEur: 200,
  },

  // Cross-links to the existing listings (used in the footer / schema
  // sameAs — also a soft trust signal: "already trusted by X guests").
  listings: {
    airbnbUrl: "https://www.airbnb.gr/rooms/903662123074717726",
    bookingUrl: "https://www.booking.com/hotel/gr/comfy-3br-downtown-patras-ypsila-alonia-view.el.html?aid=2311236",
  },

  ratings: {
    airbnbScore: 4.96,
    airbnbReviewCount: 23,
    airbnbIsSuperhost: true,
  },

  // Quoted verbatim from Airbnb guest reviews — left in their original
  // language rather than translated, since they're direct quotes.
  reviews: [
    {
      name: "Errietta",
      text: "Μείναμε πέντε ημέρες την Πρωτοχρονιά στο διαμέρισμα με τον σύζυγό μου και τα δίδυμα αγόρια μας (28 μηνών) και η εμπειρία μας ήταν εξαιρετική. Το σπίτι ήταν πεντακάθαρο, ζεστό, πλήρως εξοπλισμένο και ιδιαίτερα πρακτικό. Ο Κωνσταντίνος ήταν εξαιρετικός οικοδεσπότης: πολύ φιλικός, άμεσος και ευγενικός. Το συστήνουμε ανεπιφύλακτα, ειδικά σε οικογένειες.",
    },
    {
      name: "Paulina",
      text: "We had a great stay! The place was clean, comfortable, and exactly as described. The host was friendly, responsive, and made check-in easy. We'd happily stay here again and highly recommend it to others! 👌🏽",
    },
    {
      name: "Juela",
      text: "Ενα από τα καλύτερα καταλύματα που έχω επισκεφθεί, ο χώρος ήταν πεντακάθαρος και εξαιρετικά τακτοποιημένος, ο δε οικοδεσπότης ευγενέστατος και πολύ φιλικός παρέχοντας λεπτομερείς οδηγίες για ό,τι χρειαζόμασταν. Ευελπιστώ να μείνω ξανά σύντομα!",
    },
    {
      name: "Athanasia",
      text: "Μείναμε με την οικογένειά μου στο κατάλυμα του Κωνσταντίνου και μείναμε κατενθουσιασμένοι! Ο χώρος ήταν πεντακάθαρος, όμορφος και πολύ προσεγμένος. Ο Κωνσταντίνος ήταν εξαιρετικός οικοδεσπότης – ευγενικός, εξυπηρετικός και πάντα άμεσος στην επικοινωνία.",
    },
    {
      name: "Tasos",
      text: "Εξαιρετικός",
    },
    {
      name: "James",
      text: "Great space to stay in Patras. The flat was easy to get to, clean and had everything needed. The location was ideal, and lots to do around.",
    },
  ],

  images: [
    // Add real photos to /public/images and list them here in display
    // order. The first image is used as the hero/OG image.
    { src: "/images/living-room.jpg", altKey: "gallery.livingRoom" },
    { src: "/images/living-room-1.jpg", altKey: "gallery.livingRoom" },
    { src: "/images/living-room-tv.jpg", altKey: "gallery.livingRoom" },
    { src: "/images/living-room-3.jpg", altKey: "gallery.livingRoom" },
    { src: "/images/living-room-detail-1.jpg", altKey: "gallery.livingRoom" },
    { src: "/images/living-room-detail-2.jpg", altKey: "gallery.livingRoom" },
    { src: "/images/living-room-evening.jpg", altKey: "gallery.livingRoom" },
    { src: "/images/dining-living.jpg", altKey: "gallery.dining" },
    { src: "/images/dining-table.jpg", altKey: "gallery.dining" },
    { src: "/images/dining-detail.jpg", altKey: "gallery.dining" },
    { src: "/images/kitchen.jpg", altKey: "gallery.kitchen" },
    { src: "/images/kitchen-coffee.jpg", altKey: "gallery.kitchen" },
    { src: "/images/bedroom-master.jpg", altKey: "gallery.bedroom" },
    { src: "/images/bedroom-single-1.jpg", altKey: "gallery.bedroom" },
    { src: "/images/bedroom-single-2.jpg", altKey: "gallery.bedroom" },
    { src: "/images/workspace-1.jpg", altKey: "gallery.bedroom" },
    { src: "/images/workspace-2.jpg", altKey: "gallery.bedroom" },
    { src: "/images/wardrobe.jpg", altKey: "gallery.bedroom" },
    { src: "/images/bathroom-sink.jpg", altKey: "gallery.bathroom" },
    { src: "/images/bathroom-shower-1.jpg", altKey: "gallery.bathroom" },
    { src: "/images/balcony-view-1.jpg", altKey: "gallery.location" },
    { src: "/images/balcony-view-2.jpg", altKey: "gallery.location" },
    { src: "/images/hallway.jpg", altKey: "gallery.amenity" },
    { src: "/images/entry-decor.jpg", altKey: "gallery.amenity" },
    { src: "/images/smart-lock.jpg", altKey: "gallery.amenity" },
    { src: "/images/safe.jpg", altKey: "gallery.amenity" },
    { src: "/images/patras-square-1.jpg", altKey: "gallery.location" },
    { src: "/images/patras-square-2.jpg", altKey: "gallery.location" },
  ],

  // How far ahead the availability calendar shows.
  calendarHorizonDays: 365,
} as const;
