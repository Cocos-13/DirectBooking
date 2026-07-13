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
    postalCode: "TODO",
    addressCountry: "GR",
  },

  // Coordinates for Athanasiou Diakou 32, right on Psila Alonia square.
  geo: {
    latitude: 38.2406534,
    longitude: 21.7327531,
  },

  contact: {
    email: "TODO@example.com",
    phone: "+30 6900000000",
  },

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

  // Simple placeholder pricing — no dynamic pricing in v1.
  priceFromEur: 55,

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
    { src: "/images/living-room.jpg", altKey: "gallery.alt1" },
    { src: "/images/bedroom-balcony.jpg", altKey: "gallery.alt2" },
    { src: "/images/patras-square.jpg", altKey: "gallery.alt3" },
  ],

  // How far ahead the availability calendar shows.
  calendarHorizonDays: 365,
} as const;
