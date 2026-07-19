"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

// Where Viva.com redirects the guest after a failed/cancelled payment.
// Configure the Viva source's failure URL to point here.
export default function BookingFailurePage() {
  const { t } = useLanguage();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-aegean-900 dark:text-ink-text">
        {t.payment.failureHeading}
      </h1>
      <p className="mt-3 text-aegean-900/70 dark:text-ink-text/70">{t.payment.failureText}</p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-terracotta-500 px-6 py-3 text-sm font-semibold text-white shadow-elev-1 transition-all duration-200 hover:-translate-y-0.5 hover:bg-terracotta-600 hover:shadow-elev-2"
      >
        {t.payment.backHome}
      </Link>
    </main>
  );
}
