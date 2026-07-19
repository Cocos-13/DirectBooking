"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

// Where Viva.com redirects the guest after a successful payment. The real
// confirmation of record is the webhook (server-side); this page is just the
// friendly landing. Configure the Viva source's success URL to point here.
export default function BookingSuccessPage() {
  const { t } = useLanguage();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-aegean-600 text-white dark:bg-aegean-500">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-aegean-900 dark:text-ink-text">
        {t.payment.successHeading}
      </h1>
      <p className="mt-3 text-aegean-900/70 dark:text-ink-text/70">{t.payment.successText}</p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-terracotta-500 px-6 py-3 text-sm font-semibold text-white shadow-elev-1 transition-all duration-200 hover:-translate-y-0.5 hover:bg-terracotta-600 hover:shadow-elev-2"
      >
        {t.payment.backHome}
      </Link>
    </main>
  );
}
