"use client";

import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import { parseISO, addDays, format, isSameDay, min as minDate } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useLanguage } from "./LanguageProvider";
import { MIN_NIGHTS } from "@/lib/availability";
import type { MergedRange } from "@/lib/types";

interface Props {
  merged: MergedRange[];
  disabledDates: string[];
  /** Property-local "today" (YYYY-MM-DD) — the same clock the server books by. */
  today: string;
  horizonDays: number;
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
}

export function AvailabilityCalendar({
  merged,
  disabledDates,
  today: propertyToday,
  horizonDays,
  selected,
  onSelect,
}: Props) {
  const { t, lang } = useLanguage();

  // Deliberately the property's clock, not the visitor's. A guest browsing
  // from a timezone behind Greece would otherwise be offered a night that has
  // already started in Patras (and be rejected as "past-date" on submit), and
  // one ahead of it would lose a night that is still bookable here.
  const today = parseISO(propertyToday);
  const horizon = addDays(today, horizonDays);
  // Latest arrival that still leaves room for the minimum stay inside the
  // booking window — without this the final days of the calendar are pickable
  // as a check-in that can never reach a legal check-out.
  const latestArrival = addDays(horizon, -MIN_NIGHTS);

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
    // Arrival: every occupied night is off limits, plus the nights that can't
    // fit the minimum stay in front of them. (A booking's checkout day is not
    // an occupied night, so back-to-back arrivals stay selectable.)
    disabled = [
      { before: today },
      { after: latestArrival },
      ...disabledDates.map((d) => parseISO(d)),
    ];
  }

  return (
    <div>
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
            onSelect(selectedDay ? { from: selectedDay, to: undefined } : undefined);
            return;
          }
          onSelect(range);
        }}
        disabled={disabled}
        locale={lang === "el" ? el : enUS}
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
