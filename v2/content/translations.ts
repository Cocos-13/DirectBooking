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
    minStayNotice: string;
    pickCheckin: string;
    pickCheckout: string;
    clearDates: string;
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
    notGreekResident: string;
    taxIdLabelGreek: string;
    taxIdLabelForeign: string;
    taxIdHint: string;
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
    errorRateLimited: string;
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
    contactLabel: string;
    securePayments: string;
  };
}

export const translations: Record<Lang, Dictionary> = {
  el: {
    meta: {
      title: "Άνετο 3άρι Κέντρο Πάτρας • Υψηλά Αλώνια",
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
      kicker: "Πάτρα, κέντρο — Ψηλά Αλώνια",
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
        "Ιδανικό για παρέες, οικογένειες και επαγγελματίες που θέλουν άνεση και στυλ στο κέντρο της πόλης. Πλήρως ανακαινισμένο διαμέρισμα στην καρδιά της Πάτρας, πάνω στην πλατεία Ψηλών Αλωνίων, με θέα από το μπαλκόνι και μοντέρνους, φωτεινούς χώρους.",
        "Βρίσκεται στην οδό Αθανασίου Διάκου 32, σε ένα από τα πιο όμορφα και κεντρικά σημεία της Πάτρας — δίπλα σε πολυσύχναστους δρόμους με αμέτρητες επιλογές για φαγητό, καφέ ή ποτό, ιδανικό σημείο για να εξερευνήσετε την πόλη με τα πόδια. 📍",
        "70τ.μ., με δύο υπνοδωμάτια, φωτεινό σαλόνι, πλήρως εξοπλισμένη κουζίνα και μικρό μπαλκόνι με τραπεζάκι και θέα την πλατεία. Οι επισκέπτες έχουν πλήρη πρόσβαση σε ολόκληρο το διαμέρισμα, με self check-in μέσω κλειδοθήκης για ευέλικτη άφιξη.",
      ],
      statSqm: "τ.μ.",
      statBedrooms: "υπνοδωμάτια",
      statBeds: "κρεβάτια",
      statGuests: "άτομα",
    },
    amenities: {
      eyebrow: "Τι προσφέρει αυτός ο χώρος",
      heading: "Παροχές",
      groups: [
        {
          key: "bathroom",
          label: "Μπάνιο",
          items: [
            "Πιστολάκι για τα μαλλιά",
            "Προϊόντα καθαρισμού",
            "Ζεστό νερό",
            "Αφρόλουτρο",
          ],
        },
        {
          key: "bedroomLaundry",
          label: "Υπνοδωμάτιο και πλύσιμο ρούχων",
          items: [
            "Πλυντήριο ρούχων",
            "Βασικά είδη: πετσέτες, σεντόνια, σαπούνι και χαρτί υγείας",
            "Κρεμάστρες",
            "Κλινοσκεπάσματα",
            "Σίδερο",
            "Απλώστρα ρούχων",
            "Θυρίδα ασφαλείας",
            "Χώρος αποθήκευσης ρούχων: γκαρνταρόμπα",
          ],
        },
        {
          key: "entertainment",
          label: "Ψυχαγωγία",
          items: ["Τηλεόραση"],
        },
        {
          key: "heatingCooling",
          label: "Θέρμανση και κλιματισμός",
          items: ["Κλιματισμός"],
        },
        {
          key: "safety",
          label: "Ασφάλεια καταλύματος",
          items: ["Ανιχνευτής καπνού", "Πυροσβεστήρας", "Κουτί πρώτων βοηθειών"],
        },
        {
          key: "internetOffice",
          label: "Διαδίκτυο και γραφείο",
          items: ["Wifi", "Ειδικός χώρος εργασίας"],
        },
        {
          key: "kitchenDining",
          label: "Κουζίνα και τραπεζαρία",
          items: [
            "Κουζίνα: χώρος όπου οι επισκέπτες μπορούν να μαγειρέψουν",
            "Ψυγείο",
            "Καταψύκτης",
            "Μαγειρικά είδη: κατσαρόλες και τηγάνια, λάδι, αλάτι και πιπέρι",
            "Πιάτα και μαχαιροπίρουνα",
            "Ηλεκτρική εστία",
            "Φούρνος",
            "Βραστήρας",
            "Καφετιέρα: Nespresso",
            "Ποτήρια κρασιού",
            "Ταψί",
            "Τραπεζαρία",
            "Καφές",
          ],
        },
        {
          key: "parkingFacilities",
          label: "Πάρκινγκ και παροχές",
          items: ["Δωρεάν πάρκινγκ στον δρόμο", "Ασανσέρ"],
        },
        {
          key: "services",
          label: "Υπηρεσίες",
          items: [
            "Επιτρέπονται οι διαμονές μεγάλης διάρκειας: 28 ή περισσότερες διανυκτερεύσεις",
            "Check-in χωρίς παρουσία οικοδεσπότη: κουτί φύλαξης κλειδιών",
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
      minStayNotice: "Ελάχιστη διαμονή 2 διανυκτερεύσεις.",
      pickCheckin: "Επιλέξτε ημερομηνία άφιξης.",
      pickCheckout: "Τώρα επιλέξτε ημερομηνία αναχώρησης.",
      clearDates: "Καθαρισμός ημερομηνιών",
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
      notGreekResident: "Δεν είμαι φορολογικός κάτοικος Ελλάδας",
      taxIdLabelGreek: "ΑΦΜ",
      taxIdLabelForeign: "Αριθμός διαβατηρίου / ταυτότητας",
      taxIdHint: "Απαιτείται από την ΑΑΔΕ για τη δήλωση της βραχυχρόνιας μίσθωσης.",
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
      errorRateLimited: "Πολλά αιτήματα σε σύντομο διάστημα. Περιμένετε λίγο και δοκιμάστε ξανά.",
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
      contactLabel: "Επικοινωνία",
      securePayments: "Ασφαλείς πληρωμές με",
    },
  },
  en: {
    meta: {
      title: "Comfy 3BR Apt • Downtown Patras • Ypsila Alonia",
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
        "Ideal for groups, families, and professionals looking for comfort and style in the city center. Fully renovated apartment in the heart of Patras, right on Ypsila Alonia square, with a balcony view and bright, modern spaces.",
        "Located at Athanasiou Diakou 32, one of the most beautiful and central spots in Patras — next to bustling streets with countless options for food, coffee, or drinks, and a great base for exploring the city on foot. 📍",
        "70m², with two bedrooms, a bright living room, a fully equipped kitchen, and a small balcony with a table overlooking the square. Guests have full access to the whole apartment, with flexible self check-in via a lockbox.",
      ],
      statSqm: "m²",
      statBedrooms: "bedrooms",
      statBeds: "beds",
      statGuests: "guests",
    },
    amenities: {
      eyebrow: "What this place offers",
      heading: "Amenities",
      groups: [
        {
          key: "bathroom",
          label: "Bathroom",
          items: ["Hair dryer", "Cleaning products", "Hot water", "Body soap"],
        },
        {
          key: "bedroomLaundry",
          label: "Bedroom and laundry",
          items: [
            "Washing machine",
            "Essentials: towels, bed sheets, soap and toilet paper",
            "Hangers",
            "Bed linens",
            "Iron",
            "Drying rack for clothing",
            "Safe",
            "Clothing storage: wardrobe",
          ],
        },
        {
          key: "entertainment",
          label: "Entertainment",
          items: ["TV"],
        },
        {
          key: "heatingCooling",
          label: "Heating and cooling",
          items: ["Air conditioning"],
        },
        {
          key: "safety",
          label: "Home safety",
          items: ["Smoke alarm", "Fire extinguisher", "First aid kit"],
        },
        {
          key: "internetOffice",
          label: "Internet and office",
          items: ["Wifi", "Dedicated workspace"],
        },
        {
          key: "kitchenDining",
          label: "Kitchen and dining",
          items: [
            "Kitchen: space where guests can cook their own meals",
            "Refrigerator",
            "Freezer",
            "Cooking basics: pots and pans, oil, salt and pepper",
            "Dishes and silverware",
            "Stove",
            "Oven",
            "Kettle",
            "Coffee maker: Nespresso",
            "Wine glasses",
            "Baking sheet",
            "Dining table",
            "Coffee",
          ],
        },
        {
          key: "parkingFacilities",
          label: "Parking and facilities",
          items: ["Free street parking", "Elevator"],
        },
        {
          key: "services",
          label: "Services",
          items: [
            "Long-term stays allowed: 28 nights or more",
            "Self check-in: lockbox",
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
      minStayNotice: "2-night minimum stay.",
      pickCheckin: "Pick your arrival date.",
      pickCheckout: "Now pick your departure date.",
      clearDates: "Clear dates",
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
      notGreekResident: "I'm not a Greek tax resident",
      taxIdLabelGreek: "TIN",
      taxIdLabelForeign: "Passport / ID number",
      taxIdHint: "Required by the Greek tax authority (ΑΑΔΕ) to register this short-term stay.",
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
      errorRateLimited: "Too many requests in a short time. Please wait a moment and try again.",
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
      contactLabel: "Contact",
      securePayments: "Secure payments by",
    },
  },
};
