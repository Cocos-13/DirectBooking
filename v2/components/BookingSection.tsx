"use client";

import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useLanguage } from "./LanguageProvider";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { BookingForm } from "./BookingForm";
import { evaluateBookingRange } from "@/lib/availability";
import type { MergedRange } from "@/lib/types";

interface AvailabilityResponse {
  merged: MergedRange[];
  disabledDates: string[];
  orphanGapNights: string[];
}

export function BookingSection() {
  const { t } = useLanguage();
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/availability")
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
      const evaluation = evaluateBookingRange(checkin, checkout, data.merged);
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

      {loadError && <p className="mt-4 text-sm font-medium text-red-600">{t.calendar.error}</p>}
      {!data && !loadError && <p className="mt-4 text-sm text-aegean-900/60">{t.calendar.loading}</p>}

      {data && (
        <>
          <div className="mt-8">
            <AvailabilityCalendar
              disabledDates={data.disabledDates}
              orphanGapNights={data.orphanGapNights}
              selected={range}
              onSelect={handleSelect}
            />
          </div>

          {rangeError && <p className="mt-3 text-sm font-medium text-red-600">{rangeError}</p>}

          <div className="mt-8">
            <BookingForm range={range} rangeValid={!!(range?.from && range?.to && !rangeError)} />
          </div>
        </>
      )}
    </section>
  );
}
