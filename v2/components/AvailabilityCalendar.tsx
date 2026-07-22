"use client";

import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import { parseISO, startOfToday, addDays, format, isSameDay, min as minDate } from "date-fns";
import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";
import type { MergedRange } from "@/lib/types";

interface Props {
  merged: MergedRange[];
  disabledDates: string[];
  orphanGapNights: string[];
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
}

export function AvailabilityCalendar({
  merged,
  disabledDates,
  orphanGapNights,
  selected,
  onSelect,
}: Props) {
  const { t } = useLanguage();

  const orphan = orphanGapNights.map((d) => parseISO(d));
  const today = startOfToday();
  const horizon = addDays(today, siteConfig.calendarHorizonDays);

  // The picker runs in two phases, because the set of legal days is different
  // for each end of the stay. Using one "booked nights are disabled" set for
  // both — as this used to — made the two most valuable stays unbookable:
  // checking out on the day the next guest checks in, and the 1-night gaps
  // this calendar goes out of its way to highlight in terracotta.
  const from = selected?.from;
  const pickingCheckout = !!(from && !selected?.to);

  let disabled: Matcher[];
  if (pickingCheckout && from) {
    // Departure: any day after arrival, up to and including the first day
    // that's already booked — you may check out as the next guest checks in,
    // but you can't book straight through them. `from` itself stays enabled
    // so clicking it again clears the selection.
    const checkinYmd = format(from, "yyyy-MM-dd");
    const nextBusy = merged.find((r) => r.start > checkinYmd);
    const latestCheckout = nextBusy ? minDate([parseISO(nextBusy.start), horizon]) : horizon;
    disabled = [{ before: from }, { after: latestCheckout }];
  } else {
    // Arrival: every occupied night is off limits. (A booking's checkout day
    // is not an occupied night, so back-to-back arrivals stay selectable.)
    disabled = [{ before: today }, { after: horizon }, ...disabledDates.map((d) => parseISO(d))];
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-aegean-900/70 dark:text-ink-muted">
        <LegendDot className="bg-sand-200 dark:bg-ink-raised" label={t.calendar.legendAvailable} />
        <LegendDot className="bg-aegean-700 dark:bg-aegean-400" label={t.calendar.legendBooked} />
        <LegendDot className="bg-terracotta-400" label={t.calendar.legendOneNight} />
      </div>

      <DayPicker
        mode="range"
        selected={selected}
        onSelect={(range, selectedDay) => {
          // Clicking the arrival date again clears the stay — with the
          // departure-phase matchers in place, earlier days are disabled, so
          // this is the only way back out of a half-finished selection.
          if (from && !selected?.to && selectedDay && isSameDay(selectedDay, from)) {
            onSelect(undefined);
            return;
          }
          // If a complete range was already selected, clicking any date starts
          // a fresh check-in instead of extending the existing stay
          // (matches Booking.com's picker behavior).
          if (selected?.from && selected?.to) {
            onSelect({ from: selectedDay, to: undefined });
            return;
          }
          onSelect(range);
        }}
        disabled={disabled}
        modifiers={{ orphan }}
        modifiersClassNames={{ orphan: "rdp-orphan" }}
        numberOfMonths={1}
        fromDate={today}
        toDate={horizon}
      />

      <p className="mt-3 text-xs font-medium text-aegean-900/80 dark:text-ink-text/80">
        {pickingCheckout ? t.calendar.pickCheckout : t.calendar.pickCheckin}
      </p>

      {selected?.from && (
        <button
          type="button"
          onClick={() => onSelect(undefined)}
          className="mt-2 text-xs font-medium text-terracotta-600 underline underline-offset-2 hover:text-terracotta-700 dark:text-terracotta-400 dark:hover:text-terracotta-300"
        >
          {t.calendar.clearDates}
        </button>
      )}

      <p className="mt-3 text-xs text-aegean-900/60 dark:text-ink-muted">{t.calendar.minStayNotice}</p>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
