"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import { Footer } from "./Footer";
import { getLegalDocs, LEGAL_CHECKLIST, type LegalDoc as Doc } from "@/content/legal";
import { siteConfig } from "@/content/siteConfig";

/** Renders one legal document (privacy / terms / house-rules) in the active language. */
export function LegalDoc({ slug }: { slug: Doc["slug"] }) {
  const { lang } = useLanguage();
  const doc = getLegalDocs(lang).find((d) => d.slug === slug);
  if (!doc) return null;

  const updatedLabel = lang === "el" ? "Τελευταία ενημέρωση / έκδοση" : "Last updated / version";
  const backLabel = lang === "el" ? "← Επιστροφή στην αρχική" : "← Back to home";
  const draftTitle = lang === "el" ? "Προσχέδιο — εκκρεμεί νομικός έλεγχος" : "Draft — pending legal review";

  return (
    <>
      <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <Link
          href="/"
          className="text-sm font-medium text-aegean-600 hover:underline dark:text-aegean-200"
        >
          {backLabel}
        </Link>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-aegean-900 dark:text-ink-text sm:text-3xl">
          {doc.title}
        </h1>
        <p className="mt-1 text-xs text-aegean-900/50 dark:text-ink-muted">
          {updatedLabel}: {siteConfig.policyVersion}
        </p>

        {siteConfig.legalDraft && (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-semibold">⚠️ {draftTitle}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {LEGAL_CHECKLIST[lang].map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-aegean-900/80 dark:text-ink-text/80">{doc.intro}</p>

        <div className="mt-8 space-y-8">
          {doc.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-aegean-900 dark:text-ink-text">
                {section.heading}
              </h2>
              <div className="mt-2 space-y-2">
                {section.body.map((para, j) => (
                  <p
                    key={j}
                    className={
                      para.includes("⟪TODO")
                        ? "rounded bg-amber-100 px-2 py-1 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
                        : "text-aegean-900/80 dark:text-ink-text/80"
                    }
                  >
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
