"use client";

import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useLanguage } from "./LanguageProvider";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { BookingForm } from "./BookingForm";
import { ContactBlock } from "./ContactChannels";
import { VivaBadge } from "./VivaBadge";
import { evaluateBookingRange } from "@/lib/availability";
import type { MergedRange } from "@/lib/types";

interface AvailabilityResponse {
  merged: MergedRange[];
  disabledDates: string[];
  /** Property-local "today" and booking window, as the server will enforce them. */
  today: string;
  horizonDays: number;
}

export function BookingSection() {
  const { t } = useLanguage();
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    // `no-store` so a back/forward navigation can't resurrect a stale copy of
    // the availability the visitor is about to book against.
    fetch("/api/availability", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then(setData)
      .catch(() => setLoadError(true));
  }, []);

  function handleSelect(newRange: DateRange | undefined) {
    setRange(newRange);
    setRangeError(null);

    if (newRange?.from && newRange?.to && data) {
      const checkin = format(newRange.from, "yyyy-MM-dd");
      const checkout = format(newRange.to, "yyyy-MM-dd");
      // Same guards the server applies in /api/request, using the property's
      // clock rather than the visitor's — so the UI never green-lights a stay
      // the server is about to reject.
      const evaluation = evaluateBookingRange(checkin, checkout, data.merged, {
        today: data.today,
        horizonDays: data.horizonDays,
      });
      if (!evaluation.ok) {
        setRangeError(
          evaluation.reason === "min-stay"
            ? t.form.errorMinStay
            : evaluation.reason === "not-available"
              ? t.form.errorNotAvailable
              : t.form.errorInvalid
        );
      }
    }
  }

  return (
    <section id="book" className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
      <Reveal>
        <SectionHeading eyebrow={t.calendar.eyebrow} subtitle={t.calendar.subtitle}>
          {t.calendar.heading}
        </SectionHeading>
      </Reveal>

      {loadError && <p className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">{t.calendar.error}</p>}
      {!data && !loadError && <p className="mt-4 text-sm text-aegean-900/60 dark:text-ink-muted">{t.calendar.loading}</p>}

      {data && (
        <>
          <div className="mt-8">
            <AvailabilityCalendar
              merged={data.merged}
              disabledDates={data.disabledDates}
              today={data.today}
              horizonDays={data.horizonDays}
              selected={range}
              onSelect={handleSelect}
            />
          </div>

          {rangeError && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{rangeError}</p>}

          <div className="mt-8 rounded-2xl border border-sand-200 bg-white p-5 shadow-elev-1 dark:border-ink-border dark:bg-ink-surface dark:shadow-none">
            <p className="text-sm font-semibold text-aegean-900 dark:text-ink-text">{t.bookingRecap.heading}</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {t.bookingRecap.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-aegean-900/75 dark:text-ink-text/75">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <BookingForm range={range} rangeValid={!!(range?.from && range?.to && !rangeError)} />
          </div>

          <div className="mt-3 flex justify-center">
            <VivaBadge />
          </div>

          <div className="mt-6">
            <ContactBlock />
          </div>
        </>
      )}
    </section>
  );
}
