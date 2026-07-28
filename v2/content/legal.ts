import { siteConfig } from "./siteConfig";

// Bilingual legal-page CONTENT (Privacy, Terms, House Rules). These are
// STRUCTURED TEMPLATES, not legal advice: anything in ⟪TODO … ⟫ needs a real
// value, and the whole set needs a lawyer's review before you rely on it (the
// "draft" banner stays until siteConfig.legalDraft is set false). The copy
// deliberately describes the data flows this codebase actually implements
// (Resend email, Viva payments, Upstash storage, iCal sync, 12-month PII
// retention) so it stays truthful rather than boilerplate.

export type Lang = "el" | "en";

export interface LegalSection {
  heading: string;
  body: string[]; // paragraphs
}

export interface LegalDoc {
  slug: "privacy" | "terms" | "house-rules";
  title: string;
  intro: string;
  sections: LegalSection[];
}

function orTodo(value: string, what: string): string {
  return value.trim() ? value.trim() : `⟪TODO: ${what}⟫`;
}

/** Lawyer/owner checklist surfaced on every legal page while in draft. */
export const LEGAL_CHECKLIST: Record<Lang, string[]> = {
  el: [
    "Ο δικηγόρος να ελέγξει και να εγκρίνει ή να διορθώσει τη συνταγμένη διατύπωση (ευθύνη, ακυρώσεις/επιστροφές, εγγύηση, φορολογικά, ανωτέρα βία). Το κείμενο είναι προσχέδιο, όχι νομική συμβουλή.",
    "Επιβεβαίωση της νόμιμης βάσης, των χρόνων διατήρησης (12 μήνες στοιχεία επισκέπτη / 5 έτη φορολογικά) και των εκτελούντων την επεξεργασία (Resend, Viva, Upstash) με τις αντίστοιχες συμβάσεις DPA.",
    "(Προαιρετικά) Συμπλήρωση ΑΦΜ στο content/siteConfig.ts, αν τιμολογείτε ως επιχείρηση.",
    "Θέστε siteConfig.legalDraft = false μόνο μετά τον νομικό έλεγχο.",
  ],
  en: [
    "Have a lawyer review and approve or correct the drafted wording (liability, cancellation/refunds, deposit, tax, force majeure). The text is a draft, not legal advice.",
    "Confirm the lawful basis, retention periods (12 months guest data / 5 years tax) and the processors (Resend, Viva, Upstash) against their DPAs.",
    "(Optional) Fill in the tax ID (ΑΦΜ) in content/siteConfig.ts if you invoice as a business.",
    "Set siteConfig.legalDraft = false only after legal review.",
  ],
};

export function getLegalDocs(lang: Lang): LegalDoc[] {
  const controller = orTodo(
    siteConfig.registration.controllerName,
    lang === "el" ? "νόμιμο όνομα υπευθύνου" : "controller legal name"
  );
  const ama = orTodo(siteConfig.registration.amaNumber, lang === "el" ? "ΑΜΑ" : "ΑΜΑ registry no.");
  const email = siteConfig.registration.controllerEmail || siteConfig.contact.email;
  const addr = siteConfig.address;
  const addressLine = `${addr.streetAddress}, ${addr.postalCode} ${addr.addressLocality}, ${addr.addressCountry}`;

  if (lang === "el") {
    return [
      {
        slug: "privacy",
        title: "Πολιτική Απορρήτου",
        intro: `Η παρούσα εξηγεί πώς ο/η ${controller} (“εμείς”) επεξεργάζεται τα προσωπικά σας δεδομένα για κρατήσεις στο ${siteConfig.name}, σύμφωνα με τον GDPR (ΕΕ 2016/679).`,
        sections: [
          {
            heading: "Υπεύθυνος επεξεργασίας",
            body: [
              `${controller}, ${addressLine}. Επικοινωνία: ${email}. ΑΜΑ ακινήτου: ${ama}.`,
            ],
          },
          {
            heading: "Ποια δεδομένα συλλέγουμε",
            body: [
              "Στοιχεία κράτησης: όνομα, email, τηλέφωνο (προαιρετικό), ημερομηνίες, αριθμός επισκεπτών και τυχόν μήνυμά σας.",
              "Δεδομένα πληρωμής: τα διαχειρίζεται αποκλειστικά η Viva.com στη δική της ασφαλή σελίδα — δεν βλέπουμε ούτε αποθηκεύουμε στοιχεία κάρτας.",
              "Τεχνικά: διεύθυνση IP (σε ψευδωνυμοποιημένη μορφή για όρια χρήσης/ασφάλεια) και ελάχιστα αρχεία καταγραφής.",
            ],
          },
          {
            heading: "Σκοπός και νόμιμη βάση",
            body: [
              "Διαχείριση της κράτησης και επικοινωνία μαζί σας — εκτέλεση σύμβασης (άρθ. 6§1β).",
              "Πρόληψη απάτης, ασφάλεια, όρια χρήσης — έννομο συμφέρον (άρθ. 6§1στ).",
              "Φορολογικές/λογιστικές υποχρεώσεις — νομική υποχρέωση (άρθ. 6§1γ).",
            ],
          },
          {
            heading: "Αποδέκτες / Εκτελούντες την επεξεργασία",
            body: [
              "Resend (αποστολή email), Viva.com (πληρωμές), Upstash (αποθήκευση κράτησης). Καθένας ενεργεί ως εκτελών την επεξεργασία βάσει γραπτής σύμβασης (DPA). Η Viva.com είναι εγκατεστημένη στην ΕΕ (Ελλάδα) και πιστοποιημένη κατά PCI-DSS. Η Resend και η Upstash ενδέχεται να επεξεργάζονται δεδομένα σε διακομιστές εκτός ΕΕ (ΗΠΑ)· όπου συμβαίνει, η διαβίβαση στηρίζεται στις Τυποποιημένες Συμβατικές Ρήτρες (SCC) της Ευρωπαϊκής Επιτροπής. Επιλέγουμε περιοχές ΕΕ όπου ο πάροχος τις προσφέρει.",
              "Airbnb/Booking.com: μόνο ημερομηνίες διαθεσιμότητας συγχρονίζονται μέσω iCal — χωρίς προσωπικά στοιχεία επισκέπτη.",
            ],
          },
          {
            heading: "Χρόνος διατήρησης",
            body: [
              "Στοιχεία επικοινωνίας επισκέπτη: 12 μήνες μετά την αναχώρηση, μετά διαγράφονται αυτόματα.",
              "Φορολογικά/οικονομικά αρχεία: 5 έτη από το τέλος του αντίστοιχου οικονομικού έτους, όπως απαιτεί η ελληνική φορολογική νομοθεσία.",
            ],
          },
          {
            heading: "Τα δικαιώματά σας",
            body: [
              "Πρόσβαση, διόρθωση, διαγραφή, περιορισμός, φορητότητα, εναντίωση. Ασκήστε τα στο " + email + ".",
              "Δικαίωμα καταγγελίας στην Αρχή Προστασίας Δεδομένων (dpa.gr).",
            ],
          },
          {
            heading: "Cookies / τοπική αποθήκευση",
            body: [
              "Δεν χρησιμοποιούμε cookies παρακολούθησης. Η ιστοσελίδα αποθηκεύει τοπικά μόνο τις προτιμήσεις σας (γλώσσα/θέμα). Τα στατιστικά (εφόσον ενεργά) είναι ανώνυμα και χωρίς cookies, οπότε δεν απαιτείται banner συγκατάθεσης. Μπορείτε να διαγράψετε αυτές τις τοπικές προτιμήσεις οποιαδήποτε στιγμή από τις ρυθμίσεις του προγράμματος περιήγησής σας.",
            ],
          },
        ],
      },
      {
        slug: "terms",
        title: "Όροι Κράτησης",
        intro: `Με την υποβολή αιτήματος κράτησης στο ${siteConfig.name} αποδέχεστε τους παρακάτω όρους.`,
        sections: [
          {
            heading: "Κράτηση & πληρωμή",
            body: [
              "Το αίτημα δεσμεύει τις ημερομηνίες μόνο μετά την έγκρισή μας και την πλήρη εξόφληση μέσω του ασφαλούς συνδέσμου Viva.com.",
              "Η τιμή υπολογίζεται από τις ημερομηνίες που επιλέγετε και επιβεβαιώνεται πριν την πληρωμή.",
            ],
          },
          {
            heading: "Παράδοση της κράτησης",
            body: [
              "Πρόκειται για υπηρεσία διαμονής — δεν αποστέλλονται φυσικά προϊόντα. Αμέσως μετά την πληρωμή λαμβάνετε email επιβεβαίωσης με την απόδειξη και τα στοιχεία της κράτησης.",
              `Η «παράδοση» είναι η πρόσβαση στο κατάλυμα κατά την ημέρα άφιξης (check-in) στη διεύθυνση ${addressLine}. Λεπτομερείς οδηγίες άφιξης και κλειδιών αποστέλλονται με email πριν την άφιξη.`,
            ],
          },
          {
            heading: "Πολιτική ακύρωσης",
            body: [
              "Όλες οι κρατήσεις είναι μη επιστρεπτέες. Μετά την πληρωμή, το ποσό δεν επιστρέφεται σε περίπτωση ακύρωσης, συντόμευσης της διαμονής, καθυστερημένης άφιξης ή μη εμφάνισης.",
              "Μέχρι την πληρωμή, το αίτημα κράτησης είναι δωρεάν και μπορεί να ακυρωθεί οποτεδήποτε χωρίς κόστος. Καμία χρέωση δεν γίνεται πριν επιβεβαιώσουμε τις ημερομηνίες σας.",
              "Αυτό δεν επηρεάζει την προέγκριση της εγγύησης, η οποία αποδεσμεύεται μετά την αναχώρηση όπως περιγράφεται παρακάτω, ούτε τυχόν δικαιώματά σας βάσει αναγκαστικού δικαίου εφόσον δεν μπορέσουμε να παρέχουμε τη διαμονή.",
              "Οι όροι αυτοί αντιστοιχούν στην πολιτική ακύρωσης που εμφανίζεται στη σελίδα κράτησης κατά την υποβολή του αιτήματός σας· η έκδοση που αποδεχθήκατε καταγράφεται μαζί με την κράτησή σας.",
            ],
          },
          {
            heading: "Εγγύηση (προέγκριση)",
            body: [
              `Επιστρεφόμενη εγγύηση ${siteConfig.deposit.amountEur}€ ως προέγκριση κάρτας κοντά στην άφιξη· αποδεσμεύεται μετά την αναχώρηση εφόσον δεν υπάρχουν ζημιές, ή παρακρατείται έως το ποσό αυτό σε περίπτωση ζημιάς/παραβίασης κανόνων.`,
            ],
          },
          {
            heading: "Ευθύνη",
            body: [
              "Στον βαθμό που επιτρέπει ο νόμος, η ευθύνη μας για οποιαδήποτε αξίωση σχετική με τη διαμονή σας περιορίζεται στο συνολικό ποσό που καταβάλατε για την κράτηση. Δεν ευθυνόμαστε για έμμεσες ή επακόλουθες ζημίες.",
              "Δεν φέρουμε ευθύνη για αδυναμία ή καθυστέρηση εκτέλεσης λόγω γεγονότων εκτός του εύλογου ελέγχου μας (ανωτέρα βία), όπως φυσικές καταστροφές, απεργίες, διακοπές παροχών ή συγκοινωνιών, ή κρατικά μέτρα.",
              "Οι επισκέπτες είναι υπεύθυνοι για τα προσωπικά τους αντικείμενα και για κάθε ζημία που προκαλούν οι ίδιοι ή τα μέλη της παρέας τους στο κατάλυμα. Συνιστούμε στους επισκέπτες να διαθέτουν δική τους ταξιδιωτική/αστική ασφάλιση.",
            ],
          },
        ],
      },
      {
        slug: "house-rules",
        title: "Κανόνες Καταλύματος",
        intro: "Για μια ομαλή διαμονή, ισχύουν οι εξής κανόνες.",
        sections: [
          {
            heading: "Βασικά",
            body: [
              `Μέγιστος αριθμός επισκεπτών: ${siteConfig.capacity.maxGuests}. Απαγορεύεται το κάπνισμα εντός. Ησυχία 23:00–08:00. Χωρίς πάρτι/εκδηλώσεις.`,
              "Check-in από τις 15:00, check-out έως τις 12:00 (self check-in μέσω κλειδοθήκης· άλλες ώρες κατόπιν συνεννόησης). Ελάχιστη διαμονή 2 βράδια.",
              "Δεν επιτρέπονται κατοικίδια. Διανυκτερεύουν μόνο οι επισκέπτες που δηλώθηκαν στην κράτηση· δεν επιτρέπονται επιπλέον μη δηλωμένοι επισκέπτες.",
            ],
          },
        ],
      },
    ];
  }

  // English
  return [
    {
      slug: "privacy",
      title: "Privacy Policy",
      intro: `This explains how ${controller} (“we”) processes your personal data for bookings at ${siteConfig.name}, under the GDPR (EU 2016/679).`,
      sections: [
        {
          heading: "Data controller",
          body: [`${controller}, ${addressLine}. Contact: ${email}. Property registry no. (ΑΜΑ): ${ama}.`],
        },
        {
          heading: "What we collect",
          body: [
            "Booking details: name, email, phone (optional), dates, guest count and any message.",
            "Payment data: handled solely by Viva.com on their secure page — we never see or store card details.",
            "Technical: IP address (pseudonymized for rate-limiting/security) and minimal logs.",
          ],
        },
        {
          heading: "Purpose & lawful basis",
          body: [
            "Managing your booking and communicating with you — contract performance (Art. 6(1)(b)).",
            "Fraud prevention, security, rate-limiting — legitimate interest (Art. 6(1)(f)).",
            "Tax/accounting duties — legal obligation (Art. 6(1)(c)).",
          ],
        },
        {
          heading: "Recipients / processors",
          body: [
            "Resend (email delivery), Viva.com (payments), Upstash (booking storage). Each acts as a data processor under a written data-processing agreement (DPA). Viva.com is EU-based (Greece) and PCI-DSS certified. Resend and Upstash may process data on servers outside the EU (United States); where they do, transfers rely on the European Commission's Standard Contractual Clauses (SCCs). We choose EU regions where the provider offers them.",
            "Airbnb/Booking.com: only availability dates are synced via iCal — no guest personal data.",
          ],
        },
        {
          heading: "Retention",
          body: [
            "Guest contact data: 12 months after checkout, then automatically deleted.",
            "Tax/financial records: 5 years from the end of the relevant financial year, as required by Greek tax law.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            `Access, rectification, erasure, restriction, portability, objection. Exercise them at ${email}.`,
            "Right to lodge a complaint with the Hellenic Data Protection Authority (dpa.gr).",
          ],
        },
        {
          heading: "Cookies / local storage",
          body: [
            "We use no tracking cookies. The site stores only your language/theme preference locally. Analytics (if enabled) is anonymous and cookieless, so no consent banner is required. You can clear these local preferences at any time from your browser settings.",
          ],
        },
      ],
    },
    {
      slug: "terms",
      title: "Booking Terms",
      intro: `By submitting a booking request for ${siteConfig.name}, you accept the terms below.`,
      sections: [
        {
          heading: "Booking & payment",
          body: [
            "A request holds dates only after we approve it and you pay in full via the secure Viva.com link.",
            "The price is computed from the dates you choose and confirmed before payment.",
          ],
        },
        {
          heading: "Delivery of your booking",
          body: [
            "This is an accommodation service — no physical goods are shipped. Immediately after payment you receive a confirmation email with your receipt and booking details.",
            `“Delivery” is access to the apartment on your arrival date (check-in) at ${addressLine}. Detailed arrival and key instructions are emailed before arrival.`,
          ],
        },
        {
          heading: "Cancellation policy",
          body: [
            "All bookings are non-refundable. Once payment is made, the amount paid is not refunded if you cancel, shorten your stay, arrive late or do not show up.",
            "Until payment is made, a booking request is free and can be cancelled at any time at no cost. Nothing is charged before we confirm your dates.",
            "This does not affect the damage deposit pre-authorization, which is released after checkout as described below, nor any rights you have under mandatory law where we cannot deliver the stay.",
            "These terms mirror the cancellation policy shown on the booking page when you submit your request; the version you accepted is recorded with your booking.",
          ],
        },
        {
          heading: "Refundable deposit (pre-authorization)",
          body: [
            `A refundable ${siteConfig.deposit.amountEur}€ deposit is placed as a card pre-authorization near arrival; released after checkout if there's no damage, or captured up to that amount for damage/rule breaches.`,
          ],
        },
        {
          heading: "Liability",
          body: [
            "To the extent permitted by law, our liability for any claim relating to your stay is limited to the total amount you paid for the booking. We are not liable for indirect or consequential losses.",
            "We are not responsible for any failure or delay caused by events beyond our reasonable control (force majeure), such as natural disasters, strikes, utility or transport disruptions, or government measures.",
            "Guests are responsible for their own belongings and for any damage they, or members of their party, cause to the apartment. We recommend guests hold their own travel/liability insurance.",
          ],
        },
      ],
    },
    {
      slug: "house-rules",
      title: "House Rules",
      intro: "For a smooth stay, the following rules apply.",
      sections: [
        {
          heading: "Essentials",
          body: [
            `Maximum ${siteConfig.capacity.maxGuests} guests. No smoking indoors. Quiet hours 23:00–08:00. No parties/events.`,
            "Check-in from 15:00, check-out by 12:00 (self check-in via lockbox; other times by arrangement). Minimum stay 2 nights.",
            "No pets. Only the guests listed on the booking may stay overnight; extra unregistered guests are not allowed.",
          ],
        },
      ],
    },
  ];
}
