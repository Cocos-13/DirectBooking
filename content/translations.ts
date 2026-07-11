export type Lang = "el" | "en";

export interface Dictionary {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    description: string;
    amenities: string;
    location: string;
    rules: string;
    book: string;
  };
  hero: {
    kicker: string;
    tagline: string;
    subtitle: string;
    cta: string;
    priceFrom: string;
  };
  description: {
    heading: string;
    // TODO: replace with your real copy — this is placeholder text only.
    paragraphs: string[];
    statSqm: string;
    statBedrooms: string;
    statBeds: string;
    statGuests: string;
  };
  amenities: {
    heading: string;
    items: string[];
  };
  location: {
    heading: string;
    text: string;
    mapCta: string;
  };
  houseRules: {
    heading: string;
    items: string[];
  };
  calendar: {
    heading: string;
    subtitle: string;
    legendBooked: string;
    legendAvailable: string;
    legendOneNight: string;
    minStayNotice: string;
    loading: string;
    error: string;
  };
  form: {
    heading: string;
    subtitle: string;
    name: string;
    email: string;
    phone: string;
    phoneOptional: string;
    checkin: string;
    checkout: string;
    guests: string;
    message: string;
    messagePlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    errorGeneric: string;
    errorMinStay: string;
    errorNotAvailable: string;
    errorInvalid: string;
    disclaimer: string;
  };
  footer: {
    disclaimer: string;
    alsoOn: string;
    rights: string;
  };
}

export const translations: Record<Lang, Dictionary> = {
  el: {
    meta: {
      title: "Διαμέρισμα Πάτρα Κέντρο | Κοντά στην Πλατεία Ψηλά Αλώνια",
      description:
        "Άνετο διαμέρισμα 70τμ στο κέντρο της Πάτρας, κοντά στην Πλατεία Ψηλά Αλώνια. 2 υπνοδωμάτια, έως 5 άτομα. Κράτηση απευθείας, χωρίς προμήθεια πλατφόρμας.",
    },
    nav: {
      description: "Το διαμέρισμα",
      amenities: "Παροχές",
      location: "Τοποθεσία",
      rules: "Κανόνες",
      book: "Κράτηση",
    },
    hero: {
      kicker: "Πάτρα, κέντρο — κοντά σε Ψηλά Αλώνια",
      tagline: "Το σπίτι σας στην καρδιά της Πάτρας",
      subtitle:
        "Άνετο διαμέρισμα 70τμ, 2 υπνοδωμάτια, έως 5 άτομα. Superhost στο Airbnb με βαθμολογία 4.95★.",
      cta: "Δείτε διαθεσιμότητα",
      priceFrom: "από {price}€ / διανυκτέρευση",
    },
    description: {
      heading: "Το διαμέρισμα",
      paragraphs: [
        "Ιδανικό για παρέες, οικογένειες και επαγγελματίες που θέλουν άνεση και στυλ στο κέντρο της πόλης.✨ Πλήρως ανακαινισμένο διαμέρισμα στην καρδιά της Πάτρας, πάνω στην πλατεία Ψηλαλωνίων! Απολαύστε τη θέα από το μπαλκόνι και χαλαρώστε σε μοντέρνους & φωτεινούς χώρους.📍Εξαιρετικό σημείο για να εξερευνήσετε την πόλη, δίπλα σε πολυσύχναστους δρόμους με αμέτρητες επιλογές για φαγητό, καφέ ή ποτό.Ο χώρος Το διαμέρισμα βρίσκεται πάνω στην πλατεία Ψηλαλωνίων, σε ένα από τα πιο όμορφα και κεντρικά σημεία της Πάτρας. Πλήρως ανακαινισμένο, 70τ.μ., με δύο υπνοδωμάτια, φωτεινό σαλόνι, πλήρως εξοπλισμένη κουζίνα και μικρό μπαλκόνι με τραπεζάκι και θέα την πλατεία.",
        "TODO: Δεύτερη παράγραφος — γειτονιά, κοντινά αξιοθέατα, εύκολη πρόσβαση.",
      ],
      statSqm: "τ.μ.",
      statBedrooms: "υπνοδωμάτια",
      statBeds: "κρεβάτια",
      statGuests: "άτομα",
    },
    amenities: {
      heading: "Παροχές",
      items: [
        "Wi-Fi",
        "Πλήρως εξοπλισμένη κουζίνα",
        "Κλιματισμός",
        "Πλυντήριο ρούχων",
        "Smart TV",
        "Ασανσέρ",
      ],
    },
    location: {
      heading: "Τοποθεσία",
      text: "TODO: Περιγραφή τοποθεσίας — απόσταση από Πλατεία Ψηλά Αλώνια, παραλιακό μέτωπο, λιμάνι, φοιτητικές εστίες, εστιατόρια.",
      mapCta: "Άνοιγμα στο Google Maps",
    },
    houseRules: {
      heading: "Κανόνες Σπιτιού",
      items: [
        "Check-in: TODO ώρα (π.χ. από 15:00)",
        "Check-out: TODO ώρα (π.χ. έως 11:00)",
        "TODO: Απαγορεύεται το κάπνισμα",
        "TODO: Κατοικίδια κατόπιν συνεννόησης",
        "TODO: Χωρίς πάρτι / εκδηλώσεις",
      ],
    },
    calendar: {
      heading: "Διαθεσιμότητα",
      subtitle: "Ενημερώνεται αυτόματα από τα ημερολόγια Airbnb και Booking.com.",
      legendBooked: "Κρατημένο",
      legendAvailable: "Διαθέσιμο",
      legendOneNight: "Διαθέσιμο για 1 διανυκτέρευση",
      minStayNotice: "Ελάχιστη διαμονή 2 διανυκτερεύσεις, εκτός αν καλύπτει ακριβώς ένα κενό 1 βραδιάς ανάμεσα σε δύο κρατήσεις.",
      loading: "Φόρτωση διαθεσιμότητας…",
      error: "Δεν ήταν δυνατή η φόρτωση της διαθεσιμότητας. Δοκιμάστε ξανά αργότερα.",
    },
    form: {
      heading: "Αίτημα κράτησης",
      subtitle:
        "Αυτό είναι ένα αίτημα, όχι άμεση κράτηση. Θα επικοινωνήσουμε μαζί σας για επιβεβαίωση και οδηγίες πληρωμής.",
      name: "Ονοματεπώνυμο",
      email: "Email",
      phone: "Τηλέφωνο",
      phoneOptional: "(προαιρετικό)",
      checkin: "Άφιξη",
      checkout: "Αναχώρηση",
      guests: "Αριθμός ατόμων",
      message: "Μήνυμα",
      messagePlaceholder: "Οτιδήποτε θέλετε να μας πείτε (προαιρετικό)",
      submit: "Αποστολή αιτήματος",
      submitting: "Αποστολή…",
      success: "Ευχαριστούμε! Λάβαμε το αίτημά σας και θα επικοινωνήσουμε σύντομα.",
      errorGeneric: "Κάτι πήγε στραβά. Δοκιμάστε ξανά ή στείλτε μας email απευθείας.",
      errorMinStay: "Η ελάχιστη διαμονή είναι 2 διανυκτερεύσεις (εκτός από κενά 1 βραδιάς ανάμεσα σε κρατήσεις).",
      errorNotAvailable: "Οι ημερομηνίες αυτές δεν είναι πλέον διαθέσιμες.",
      errorInvalid: "Παρακαλούμε επιλέξτε έγκυρες ημερομηνίες.",
      disclaimer: "Δεν απαιτείται πληρωμή τώρα. Η πληρωμή κανονίζεται μετά την επιβεβαίωση.",
    },
    footer: {
      disclaimer: "Οι τιμές και η διαθεσιμότητα υπόκεινται σε επιβεβαίωση.",
      alsoOn: "Θα μας βρείτε επίσης στο",
      rights: "Με επιφύλαξη παντός δικαιώματος.",
    },
  },
  en: {
    meta: {
      title: "Apartment Patras Center | Near Ypsila Alonia Square",
      description:
        "Comfortable 70m² apartment in central Patras, near Ypsila Alonia square. 2 bedrooms, sleeps up to 5. Book direct, no platform commission.",
    },
    nav: {
      description: "The apartment",
      amenities: "Amenities",
      location: "Location",
      rules: "House rules",
      book: "Book",
    },
    hero: {
      kicker: "Patras, city center — near Ypsila Alonia",
      tagline: "Your home in the heart of Patras",
      subtitle: "Comfortable 70m² apartment, 2 bedrooms, sleeps up to 5. Airbnb Superhost, 4.95★.",
      cta: "Check availability",
      priceFrom: "from €{price} / night",
    },
    description: {
      heading: "The apartment",
      paragraphs: [
        "TODO: Add your English description here — size, layout, atmosphere, what makes it stand out.",
        "TODO: Second paragraph — neighborhood, nearby sights, easy access.",
      ],
      statSqm: "m²",
      statBedrooms: "bedrooms",
      statBeds: "beds",
      statGuests: "guests",
    },
    amenities: {
      heading: "Amenities",
      items: [
        "TODO: Wi-Fi",
        "TODO: Fully equipped kitchen",
        "TODO: Air conditioning",
        "TODO: Washing machine",
        "TODO: Smart TV",
        "TODO: Elevator",
      ],
    },
    location: {
      heading: "Location",
      text: "TODO: Location description — distance to Ypsila Alonia square, waterfront, port, university, restaurants.",
      mapCta: "Open in Google Maps",
    },
    houseRules: {
      heading: "House Rules",
      items: [
        "Check-in: TODO time (e.g. from 3:00 PM)",
        "Check-out: TODO time (e.g. until 11:00 AM)",
        "TODO: No smoking",
        "TODO: Pets by arrangement",
        "TODO: No parties / events",
      ],
    },
    calendar: {
      heading: "Availability",
      subtitle: "Updates automatically from the Airbnb and Booking.com calendars.",
      legendBooked: "Booked",
      legendAvailable: "Available",
      legendOneNight: "Available for 1 night",
      minStayNotice: "2-night minimum stay, unless it exactly fills a 1-night gap between two bookings.",
      loading: "Loading availability…",
      error: "Couldn't load availability. Please try again shortly.",
    },
    form: {
      heading: "Booking request",
      subtitle: "This is a request, not an instant booking. We'll get in touch to confirm and arrange payment.",
      name: "Full name",
      email: "Email",
      phone: "Phone",
      phoneOptional: "(optional)",
      checkin: "Check-in",
      checkout: "Check-out",
      guests: "Number of guests",
      message: "Message",
      messagePlaceholder: "Anything you'd like us to know (optional)",
      submit: "Send request",
      submitting: "Sending…",
      success: "Thank you! We received your request and will be in touch shortly.",
      errorGeneric: "Something went wrong. Please try again or email us directly.",
      errorMinStay: "Minimum stay is 2 nights (except 1-night gaps between existing bookings).",
      errorNotAvailable: "Those dates are no longer available.",
      errorInvalid: "Please select valid dates.",
      disclaimer: "No payment is required now. Payment is arranged after confirmation.",
    },
    footer: {
      disclaimer: "Prices and availability are subject to confirmation.",
      alsoOn: "You'll also find us on",
      rights: "All rights reserved.",
    },
  },
};
