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
    "Συμπληρώστε τον ΑΜΑ (Αριθμός Μητρώου Ακινήτων) και το νόμιμο όνομα του υπευθύνου επεξεργασίας στο content/siteConfig.ts.",
    "Ζητήστε από δικηγόρο να ελέγξει και να προσαρμόσει το περιεχόμενο (ευθύνη, ακυρώσεις, εγγύηση, φορολογικά).",
    "Επιβεβαιώστε τη νόμιμη βάση επεξεργασίας, τους χρόνους διατήρησης και τους εκτελούντες την επεξεργασία (Resend, Viva, Upstash).",
    "Θέστε siteConfig.legalDraft = false μόνο μετά τον νομικό έλεγχο.",
  ],
  en: [
    "Fill in the ΑΜΑ (registry number) and the data-controller's legal name in content/siteConfig.ts.",
    "Have a lawyer review and adapt the content (liability, cancellations, deposit, tax).",
    "Confirm the lawful basis, retention periods, and processors listed (Resend, Viva, Upstash).",
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
              "Resend (αποστολή email), Viva.com (πληρωμές), Upstash (αποθήκευση κράτησης). ⟪TODO: επιβεβαιώστε συμβάσεις επεξεργασίας & τοποθεσίες διακομιστών (ΕΕ/εκτός ΕΕ).⟫",
              "Airbnb/Booking.com: μόνο ημερομηνίες διαθεσιμότητας συγχρονίζονται μέσω iCal — χωρίς προσωπικά στοιχεία επισκέπτη.",
            ],
          },
          {
            heading: "Χρόνος διατήρησης",
            body: [
              "Στοιχεία επικοινωνίας επισκέπτη: 12 μήνες μετά την αναχώρηση, μετά διαγράφονται αυτόματα.",
              "Φορολογικά/οικονομικά αρχεία: όσο απαιτεί ο νόμος. ⟪TODO: επιβεβαιώστε τη φορολογική περίοδο διατήρησης.⟫",
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
              "Δεν χρησιμοποιούμε cookies παρακολούθησης. Η ιστοσελίδα αποθηκεύει τοπικά μόνο τις προτιμήσεις σας (γλώσσα/θέμα). Τα στατιστικά (εφόσον ενεργά) είναι ανώνυμα και χωρίς cookies, οπότε δεν απαιτείται banner συγκατάθεσης. ⟪TODO: νομική επιβεβαίωση.⟫",
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
            heading: "Πολιτική ακύρωσης & επιστροφών",
            body: [
              "14+ ημέρες πριν το check-in: πλήρης επιστροφή. 7–13 ημέρες: 50%. Λιγότερο από 7 ημέρες: χωρίς επιστροφή.",
              "Οι επιστροφές γίνονται στην ίδια κάρτα που χρησιμοποιήθηκε, μέσω Viva.com — συνήθως εντός 5–10 εργάσιμων ημερών, ανάλογα με την τράπεζά σας.",
              "⟪TODO: επιβεβαιώστε/προσαρμόστε με δικηγόρο και ευθυγραμμίστε με τη σελίδα κρατήσεων.⟫",
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
              "⟪TODO: όρια ευθύνης, ανωτέρα βία, ασφάλιση — απαιτείται νομική διατύπωση.⟫",
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
              "⟪TODO: check-in/out ώρες, κατοικίδια, επιπλέον επισκέπτες — προσαρμόστε.⟫",
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
            "Resend (email delivery), Viva.com (payments), Upstash (booking storage). ⟪TODO: confirm data-processing agreements & server locations (EU/non-EU).⟫",
            "Airbnb/Booking.com: only availability dates are synced via iCal — no guest personal data.",
          ],
        },
        {
          heading: "Retention",
          body: [
            "Guest contact data: 12 months after checkout, then automatically deleted.",
            "Tax/financial records: as required by law. ⟪TODO: confirm the tax retention period.⟫",
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
            "We use no tracking cookies. The site stores only your language/theme preference locally. Analytics (if enabled) is anonymous and cookieless, so no consent banner is required. ⟪TODO: legal confirmation.⟫",
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
          heading: "Cancellation & refund policy",
          body: [
            "14+ days before check-in: full refund. 7–13 days: 50%. Less than 7 days: non-refundable.",
            "Refunds are returned to the same card used, via Viva.com — typically within 5–10 business days, depending on your bank.",
            "⟪TODO: confirm/adapt with a lawyer and keep aligned with the booking page.⟫",
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
          body: ["⟪TODO: limitation of liability, force majeure, insurance — needs legal wording.⟫"],
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
            "⟪TODO: check-in/out times, pets, extra guests — adapt.⟫",
          ],
        },
      ],
    },
  ];
}
