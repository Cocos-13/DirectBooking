"use client";

import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import { parseISO, startOfToday, addDays, format, isSameDay, min as minDate } from "date-fns";
import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";
import { MIN_NIGHTS } from "@/lib/availability";
import type { MergedRange } from "@/lib/types";

interface Props {
  merged: MergedRange[];
  disabledDates: string[];
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
}

export function AvailabilityCalendar({
  merged,
  disabledDates,
  selected,
  onSelect,
}: Props) {
  const { t } = useLanguage();

  const today = startOfToday();
  const horizon = addDays(today, siteConfig.calendarHorizonDays);

  // The picker runs in two phases, because the set of legal days is different
  // for each end of the stay. Using one "booked nights are disabled" set for
  // both — as this used to — made the most valuable stay of all unbookable:
  // checking out on the day the next guest checks in.
  const from = selected?.from;
  const pickingCheckout = !!(from && !selected?.to);

  let disabled: Matcher[];
  if (pickingCheckout && from) {
    // Departure: no earlier than the 2-night minimum allows, and no later than
    // the first day that's already booked — you may check out as the next
    // guest checks in, but you can't book straight through them. `from` itself
    // stays enabled so clicking it again clears the selection.
    const checkinYmd = format(from, "yyyy-MM-dd");
    const nextBusy = merged.find((r) => r.start > checkinYmd);
    const latestCheckout = nextBusy ? minDate([parseISO(nextBusy.start), horizon]) : horizon;
    const earliestCheckout = addDays(from, MIN_NIGHTS);
    disabled = [
      (day: Date) => !isSameDay(day, from) && day < earliestCheckout,
      { after: latestCheckout },
    ];
  } else {
    // Arrival: every occupied night is off limits. (A booking's checkout day
    // is not an occupied night, so back-to-back arrivals stay selectable.)
    disabled = [{ before: today }, { after: horizon }, ...disabledDates.map((d) => parseISO(d))];
  }

  return (
    <div className="inline-block">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-aegean-900/70 dark:text-ink-muted">
        <LegendDot className="bg-sand-200 dark:bg-ink-raised" label={t.calendar.legendAvailable} />
        <LegendDot className="bg-aegean-700 dark:bg-aegean-400" label={t.calendar.legendBooked} />
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
        numberOfMonths={1}
        fromDate={today}
        toDate={horizon}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-aegean-900/80 dark:text-ink-text/80">
          {pickingCheckout ? t.calendar.pickCheckout : t.calendar.pickCheckin}
        </p>

        {selected?.from && (
          <button
            type="button"
            onClick={() => onSelect(undefined)}
            className="flex items-center gap-1.5 rounded-full border border-terracotta-400/30 bg-terracotta-50 px-3.5 py-1.5 text-xs font-semibold text-terracotta-600 transition-colors hover:border-terracotta-400/50 hover:bg-terracotta-100 dark:border-terracotta-400/30 dark:bg-terracotta-400/10 dark:text-terracotta-400 dark:hover:bg-terracotta-400/20"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            {t.calendar.clearDates}
          </button>
        )}
      </div>

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
