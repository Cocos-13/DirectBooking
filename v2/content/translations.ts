export type Lang = "el" | "en";

export interface Dictionary {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    description: string;
    amenities: string;
    reviews: string;
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
    eyebrow: string;
    heading: string;
    // TODO: replace with your real copy — this is placeholder text only.
    paragraphs: string[];
    statSqm: string;
    statBedrooms: string;
    statBeds: string;
    statGuests: string;
  };
  amenities: {
    eyebrow: string;
    heading: string;
    groups: {
      key: string;
      label: string;
      items: string[];
    }[];
  };
  reviews: {
    eyebrow: string;
    heading: string;
    ratingCount: string;
    ratingScale: string;
    superhost: string;
    viewAllCta: string;
    guestLabel: string;
  };
  gallery: {
    viewAll: string;
    close: string;
    prev: string;
    next: string;
  };
  location: {
    eyebrow: string;
    heading: string;
    text: string;
    mapCta: string;
  };
  houseRules: {
    eyebrow: string;
    heading: string;
    items: string[];
  };
  whyDirect: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    benefits: {
      key: string;
      title: string;
      text: string; // "trust" uses {score}
    }[];
  };
  cancellation: {
    heading: string;
    intro: string;
    tiers: { label: string; detail: string }[];
    reassure: string;
  };
  bookingRecap: {
    heading: string;
    items: string[];
  };
  calendar: {
    eyebrow: string;
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
    price: {
      heading: string;
      weekdayLine: string; // uses {count} and {rate}
      weekendLine: string; // uses {count} and {rate}
      total: string;
      totalNights: string; // uses {count}
    };
    submit: string;
    submitting: string;
    successHeading: string;
    successSteps: string[];
    successContact: string;
    errorGeneric: string;
    errorMinStay: string;
    errorNotAvailable: string;
    errorInvalid: string;
    disclaimer: string;
  };
  contact: {
    heading: string;
    subtitle: string;
    whatsapp: string;
    viber: string;
    call: string;
    email: string;
    fabLabel: string;
    fabClose: string;
    waPrefill: string;
  };
  payment: {
    successHeading: string;
    successText: string;
    failureHeading: string;
    failureText: string;
    backHome: string;
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
      reviews: "Κριτικές",
      location: "Τοποθεσία",
      rules: "Κανόνες",
      book: "Κράτηση",
    },
    hero: {
      kicker: "Πάτρα, κέντρο — κοντά σε Ψηλά Αλώνια",
      tagline: "Το σπίτι σας στην καρδιά της Πάτρας",
      subtitle:
        "Άνετο διαμέρισμα 70τμ, 2 υπνοδωμάτια, έως 5 άτομα. Airbnb Superhost με βαθμολογία 4.96★ από 23 κριτικές.",
      cta: "Δείτε διαθεσιμότητα",
      priceFrom: "από {price}€ / διανυκτέρευση",
    },
    description: {
      eyebrow: "Με μια ματιά",
      heading: "Το διαμέρισμα",
      paragraphs: [
        "Ιδανικό για παρέες, οικογένειες και επαγγελματίες που θέλουν άνεση και στυλ στο κέντρο της πόλης. ✨ Πλήρως ανακαινισμένο διαμέρισμα στην καρδιά της Πάτρας, πάνω στην πλατεία Ψηλών Αλωνίων! Απολαύστε τη θέα από το μπαλκόνι και χαλαρώστε σε μοντέρνους & φωτεινούς χώρους. 📍 Εξαιρετικό σημείο για να εξερευνήσετε την πόλη, δίπλα σε πολυσύχναστους δρόμους με αμέτρητες επιλογές για φαγητό, καφέ ή ποτό.",
        "Το διαμέρισμα βρίσκεται στην οδό Αθανασίου Διάκου 32, πάνω στην πλατεία Ψηλών Αλωνίων, σε ένα από τα πιο όμορφα και κεντρικά σημεία της Πάτρας. Πλήρως ανακαινισμένο, 70τ.μ., με δύο υπνοδωμάτια, φωτεινό σαλόνι, πλήρως εξοπλισμένη κουζίνα και μικρό μπαλκόνι με τραπεζάκι και θέα την πλατεία. Οι επισκέπτες έχουν πλήρη πρόσβαση σε ολόκληρο το διαμέρισμα, με self check-in μέσω κλειδοθήκης για ευέλικτη άφιξη.",
      ],
      statSqm: "τ.μ.",
      statBedrooms: "υπνοδωμάτια",
      statBeds: "κρεβάτια",
      statGuests: "άτομα",
    },
    amenities: {
      eyebrow: "Τι περιλαμβάνεται",
      heading: "Παροχές",
      groups: [
        {
          key: "kitchen",
          label: "Κουζίνα & φαγητό",
          items: [
            "Πλήρως εξοπλισμένη κουζίνα",
            "Ψυγείο και καταψύκτης",
            "Φούρνος και ηλεκτρική εστία",
            "Βραστήρας",
            "Καφετιέρα Nespresso",
            "Κατσαρόλες, τηγάνια, πιάτα και μαχαιροπίρουνα",
          ],
        },
        {
          key: "comfort",
          label: "Άνεση & βασικά",
          items: [
            "Wifi",
            "Ειδικός χώρος εργασίας",
            "Κλιματισμός",
            "Τηλεόραση",
            "Ζεστό νερό",
            "Πλυντήριο ρούχων και απλώστρα",
            "Σίδερο",
            "Πιστολάκι για τα μαλλιά",
            "Αφρόλουτρο και προϊόντα καθαρισμού",
            "Πετσέτες, σεντόνια, σαπούνι και χαρτί υγείας",
          ],
        },
        {
          key: "safety",
          label: "Ασφάλεια",
          items: [
            "Θυρίδα ασφαλείας",
            "Ανιχνευτής καπνού και πυροσβεστήρας",
            "Κουτί πρώτων βοηθειών",
          ],
        },
        {
          key: "access",
          label: "Πρόσβαση & πρακτικά",
          items: [
            "Ασανσέρ",
            "Δωρεάν πάρκινγκ στον δρόμο",
            "Self check-in με κλειδοθήκη",
            "Επιτρέπονται διαμονές 28+ διανυκτερεύσεων",
          ],
        },
      ],
    },
    reviews: {
      eyebrow: "Τι λένε οι επισκέπτες",
      heading: "Κριτικές επισκεπτών",
      ratingCount: "{count} κριτικές",
      ratingScale: "στα 5",
      superhost: "Airbnb Superhost",
      viewAllCta: "Δείτε όλες τις κριτικές στο Airbnb",
      guestLabel: "Επισκέπτης Airbnb",
    },
    gallery: {
      viewAll: "Δείτε και τις {count} φωτογραφίες",
      close: "Κλείσιμο",
      prev: "Προηγούμενη",
      next: "Επόμενη",
    },
    location: {
      eyebrow: "Πού θα μείνετε",
      heading: "Τοποθεσία",
      text: "Το διαμέρισμα βρίσκεται στην οδό Αθανασίου Διάκου 32, πάνω στην πλατεία Ψηλών Αλωνίων — μία από τις πιο όμορφες και κεντρικές πλατείες της Πάτρας. Λίγα λεπτά με τα πόδια από την παραλιακή, το λιμάνι και τους πεζόδρομους με εστιατόρια, καφέ και μπαρ.",
      mapCta: "Άνοιγμα στο Google Maps",
    },
    houseRules: {
      eyebrow: "Καλό να ξέρετε",
      heading: "Κανόνες Σπιτιού",
      items: [
        "Check-in: από 15:00",
        "Check-out: έως 12:00",
        "Self check-in μέσω κλειδοθήκης — άφιξη χωρίς την παρουσία οικοδεσπότη",
        "Επιτρέπονται διαμονές μεγάλης διάρκειας (28+ διανυκτερεύσεις)",
        "Σύμφωνα με την ελληνική νομοθεσία, απαιτείται το ΑΦΜ του βασικού επισκέπτη κατά το check-in (δήλωση διαμονής στην ΑΑΔΕ)",
      ],
    },
    whyDirect: {
      eyebrow: "Κράτηση απευθείας",
      heading: "Γιατί να κλείσετε απευθείας",
      subtitle: "Ίδιο διαμέρισμα, ίδιος Superhost — χωρίς τις χρεώσεις των πλατφορμών ανάμεσά μας.",
      benefits: [
        {
          key: "price",
          title: "Καλύτερη τιμή, χωρίς προμήθειες",
          text: "Πληρώνετε απευθείας τον οικοδεσπότη, χωρίς τις χρεώσεις υπηρεσίας που προσθέτουν το Airbnb και το Booking.com.",
        },
        {
          key: "host",
          title: "Απευθείας επικοινωνία",
          text: "Ερωτήσεις, ώρα άφιξης, τοπικές συμβουλές — τα κανονίζετε απευθείας με τον οικοδεσπότη, χωρίς μεσάζοντες.",
        },
        {
          key: "flexible",
          title: "Ευελιξία & εξυπηρέτηση",
          text: "Ειδικά αιτήματα, μεγαλύτερες διαμονές ή προσαρμοσμένες ρυθμίσεις τακτοποιούνται πιο εύκολα ένας προς έναν.",
        },
        {
          key: "trust",
          title: "Ίδιο κατάλυμα, ίδιος Superhost",
          text: "Ακριβώς το κατάλυμα που θα βρείτε στο Airbnb ({score}★), κρατημένο κατευθείαν από την πηγή.",
        },
      ],
    },
    cancellation: {
      heading: "Πολιτική ακύρωσης",
      intro: "Τα σχέδια αλλάζουν — δείτε πώς λειτουργούν οι ακυρώσεις μόλις επιβεβαιωθούν οι ημερομηνίες σας.",
      tiers: [
        { label: "14+ ημέρες πριν την άφιξη", detail: "Πλήρης επιστροφή" },
        { label: "7–13 ημέρες πριν", detail: "Επιστροφή 50%" },
        { label: "Λιγότερο από 7 ημέρες πριν", detail: "Χωρίς επιστροφή" },
      ],
      reassure: "Δεν προκαταβάλλεται κανένα ποσό μέχρι να επιβεβαιώσουμε τις ημερομηνίες σας — το αίτημα είναι πάντα δωρεάν.",
    },
    bookingRecap: {
      heading: "Καλό να ξέρετε",
      items: [
        "Check-in από 15:00 · check-out έως 12:00",
        "Ελάχιστη διαμονή 2 διανυκτερεύσεις",
        "Δωρεάν ακύρωση έως 14 ημέρες πριν την άφιξη",
        "Καμία πληρωμή τώρα — πληρώνετε μετά την επιβεβαίωση",
      ],
    },
    calendar: {
      eyebrow: "Κράτηση απευθείας",
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
      price: {
        heading: "Εκτίμηση κόστους",
        weekdayLine: "Καθημερινές (Κυρ–Πέμ) × {count}  ·  {rate}€/βράδυ",
        weekendLine: "Σαββατοκύριακο (Παρ–Σαβ) × {count}  ·  {rate}€/βράδυ",
        total: "Σύνολο",
        totalNights: "{count} διανυκτερεύσεις",
      },
      submit: "Αποστολή αιτήματος",
      submitting: "Αποστολή…",
      successHeading: "Το αίτημά σας στάλθηκε!",
      successSteps: [
        "Θα λάβετε ένα email επιβεβαίωσης λήψης στο email που δηλώσατε.",
        "Ο οικοδεσπότης θα επικοινωνήσει μαζί σας για να επιβεβαιώσει τη διαθεσιμότητα και να σας στείλει οδηγίες πληρωμής.",
        "Η κράτησή σας οριστικοποιείται μόνο μετά από αυτή την επιβεβαίωση.",
      ],
      successContact: "Αν δεν λάβετε απάντηση σύντομα, επικοινωνήστε απευθείας:",
      errorGeneric: "Κάτι πήγε στραβά. Δοκιμάστε ξανά ή στείλτε μας email απευθείας.",
      errorMinStay: "Η ελάχιστη διαμονή είναι 2 διανυκτερεύσεις (εκτός από κενά 1 βραδιάς ανάμεσα σε κρατήσεις).",
      errorNotAvailable: "Οι ημερομηνίες αυτές δεν είναι πλέον διαθέσιμες.",
      errorInvalid: "Παρακαλούμε επιλέξτε έγκυρες ημερομηνίες.",
      disclaimer: "Δεν απαιτείται πληρωμή τώρα. Η πληρωμή κανονίζεται μετά την επιβεβαίωση.",
    },
    contact: {
      heading: "Προτιμάτε να μας γράψετε;",
      subtitle: "Στείλτε μας μήνυμα ή καλέστε μας απευθείας — απαντάμε γρήγορα.",
      whatsapp: "WhatsApp",
      viber: "Viber",
      call: "Κλήση",
      email: "Email",
      fabLabel: "Επικοινωνία",
      fabClose: "Κλείσιμο",
      waPrefill: "Γεια σας! Ενδιαφέρομαι για κράτηση στο διαμέρισμά σας στην Πάτρα.",
    },
    payment: {
      successHeading: "Η πληρωμή ολοκληρώθηκε!",
      successText: "Ευχαριστούμε — η κράτησή σας επιβεβαιώθηκε. Θα λάβετε email με απόδειξη και οδηγίες άφιξης.",
      failureHeading: "Η πληρωμή δεν ολοκληρώθηκε",
      failureText: "Κάτι πήγε στραβά με την πληρωμή και δεν χρεωθήκατε. Δοκιμάστε ξανά τον σύνδεσμο ή επικοινωνήστε μαζί μας.",
      backHome: "Επιστροφή στην αρχική",
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
      reviews: "Reviews",
      location: "Location",
      rules: "House rules",
      book: "Book",
    },
    hero: {
      kicker: "Patras, city center — near Ypsila Alonia",
      tagline: "Your home in the heart of Patras",
      subtitle:
        "Comfortable 70m² apartment, 2 bedrooms, sleeps up to 5. Airbnb Superhost, 4.96★ from 23 reviews.",
      cta: "Check availability",
      priceFrom: "from €{price} / night",
    },
    description: {
      eyebrow: "At a glance",
      heading: "The apartment",
      paragraphs: [
        "Ideal for groups, families, and professionals looking for comfort and style in the city center. ✨ Fully renovated apartment in the heart of Patras, right on Ypsila Alonia square! Enjoy the view from the balcony and relax in modern, bright spaces. 📍 A prime spot for exploring the city, next to bustling streets with countless options for food, coffee, or drinks.",
        "The apartment is located at Athanasiou Diakou 32, right on Ypsila Alonia square, one of the most beautiful and central spots in Patras. Fully renovated, 70m², with two bedrooms, a bright living room, a fully equipped kitchen, and a small balcony with a table overlooking the square. Guests have full access to the whole apartment, with flexible self check-in via a lockbox.",
      ],
      statSqm: "m²",
      statBedrooms: "bedrooms",
      statBeds: "beds",
      statGuests: "guests",
    },
    amenities: {
      eyebrow: "What's included",
      heading: "Amenities",
      groups: [
        {
          key: "kitchen",
          label: "Kitchen & dining",
          items: [
            "Fully equipped kitchen",
            "Fridge and freezer",
            "Oven and stove",
            "Kettle",
            "Nespresso coffee machine",
            "Pots, pans, dishes and cutlery",
          ],
        },
        {
          key: "comfort",
          label: "Comfort & essentials",
          items: [
            "Wifi",
            "Dedicated workspace",
            "Air conditioning",
            "TV",
            "Hot water",
            "Washing machine and drying rack",
            "Iron",
            "Hair dryer",
            "Body soap and cleaning products",
            "Towels, bed linen, soap and toilet paper",
          ],
        },
        {
          key: "safety",
          label: "Safety",
          items: [
            "Safe",
            "Smoke alarm and fire extinguisher",
            "First aid kit",
          ],
        },
        {
          key: "access",
          label: "Access & practical",
          items: [
            "Elevator",
            "Free street parking",
            "Self check-in with lockbox",
            "Long-term stays allowed (28+ nights)",
          ],
        },
      ],
    },
    reviews: {
      eyebrow: "What guests say",
      heading: "Guest reviews",
      ratingCount: "{count} reviews",
      ratingScale: "out of 5",
      superhost: "Airbnb Superhost",
      viewAllCta: "See all reviews on Airbnb",
      guestLabel: "Airbnb guest",
    },
    gallery: {
      viewAll: "View all {count} photos",
      close: "Close",
      prev: "Previous",
      next: "Next",
    },
    location: {
      eyebrow: "Where you'll stay",
      heading: "Location",
      text: "The apartment is located at Athanasiou Diakou 32, right on Ypsila Alonia square — one of the most beautiful and central squares in Patras. Just a few minutes' walk from the waterfront, the port, and the pedestrian streets full of restaurants, cafés and bars.",
      mapCta: "Open in Google Maps",
    },
    houseRules: {
      eyebrow: "Good to know",
      heading: "House Rules",
      items: [
        "Check-in: from 3:00 PM",
        "Check-out: until 12:00 PM",
        "Self check-in via lockbox — arrive without meeting the host",
        "Long-term stays allowed (28+ nights)",
        "Under Greek law, the main guest's tax ID (ΑΦΜ) is required at check-in for stay registration with the tax authority (ΑΑΔΕ)",
      ],
    },
    whyDirect: {
      eyebrow: "Direct booking",
      heading: "Why book direct",
      subtitle: "Same apartment, same Superhost — without the platform fees in between.",
      benefits: [
        {
          key: "price",
          title: "Best price, no platform fees",
          text: "You pay the host directly, with none of the service fees Airbnb and Booking.com add on top.",
        },
        {
          key: "host",
          title: "Talk to your host directly",
          text: "Questions, arrival time, local tips — arrange everything one-to-one, with no middleman.",
        },
        {
          key: "flexible",
          title: "Flexible & personal",
          text: "Special requests, longer stays or custom arrangements are simply easier to sort out directly.",
        },
        {
          key: "trust",
          title: "Same home, same Superhost",
          text: "The exact listing you'll find on Airbnb ({score}★), booked straight from the source.",
        },
      ],
    },
    cancellation: {
      heading: "Cancellation policy",
      intro: "Plans change — here's how cancellations work once your dates are confirmed.",
      tiers: [
        { label: "14+ days before check-in", detail: "Full refund" },
        { label: "7–13 days before", detail: "50% refund" },
        { label: "Less than 7 days before", detail: "Non-refundable" },
      ],
      reassure: "No payment is taken until we confirm your dates, so sending a request is always free.",
    },
    bookingRecap: {
      heading: "Good to know",
      items: [
        "Check-in from 3 PM · check-out by 12 PM",
        "Minimum stay 2 nights",
        "Free cancellation up to 14 days before arrival",
        "No payment now — you pay after we confirm",
      ],
    },
    calendar: {
      eyebrow: "Book direct",
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
      price: {
        heading: "Price estimate",
        weekdayLine: "Weeknights (Sun–Thu) × {count}  ·  €{rate}/night",
        weekendLine: "Weekend (Fri–Sat) × {count}  ·  €{rate}/night",
        total: "Total",
        totalNights: "{count} nights",
      },
      submit: "Send request",
      submitting: "Sending…",
      successHeading: "Request sent!",
      successSteps: [
        "You'll receive a confirmation email at the address you provided.",
        "The host will get in touch to confirm availability and send payment instructions.",
        "Your booking is only final after that confirmation.",
      ],
      successContact: "If you don't hear back soon, reach out directly:",
      errorGeneric: "Something went wrong. Please try again or email us directly.",
      errorMinStay: "Minimum stay is 2 nights (except 1-night gaps between existing bookings).",
      errorNotAvailable: "Those dates are no longer available.",
      errorInvalid: "Please select valid dates.",
      disclaimer: "No payment is required now. Payment is arranged after confirmation.",
    },
    contact: {
      heading: "Prefer to message us?",
      subtitle: "Send a message or call us directly — we reply quickly.",
      whatsapp: "WhatsApp",
      viber: "Viber",
      call: "Call",
      email: "Email",
      fabLabel: "Contact us",
      fabClose: "Close",
      waPrefill: "Hi! I'm interested in booking your apartment in Patras.",
    },
    payment: {
      successHeading: "Payment complete!",
      successText: "Thank you — your booking is confirmed. You'll receive an email receipt and arrival instructions.",
      failureHeading: "Payment didn't go through",
      failureText: "Something went wrong with the payment and you weren't charged. Try the link again or contact us.",
      backHome: "Back to home",
    },
    footer: {
      disclaimer: "Prices and availability are subject to confirmation.",
      alsoOn: "You'll also find us on",
      rights: "All rights reserved.",
    },
  },
};
