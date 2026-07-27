"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import { parseISO, addDays, isSameDay } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useLanguage } from "./LanguageProvider";

/** Two 280px months plus their 2em gutter and the picker's own padding need
 *  ~624px; below that they'd wrap or overflow, so phones get a single month.
 *  Kept in sync with the `.rdp-months` centering rule in app/globals.css. */
const TWO_MONTH_QUERY = "(min-width: 768px)";

interface Props {
  /** Days no legal stay can touch — see `getBlockedDates`. */
  disabledDates: string[];
  /** Property-local "today" (YYYY-MM-DD) — the same clock the server books by. */
  today: string;
  horizonDays: number;
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
  /** Bumped by BookingSection each time the guest picks a stay under the
   *  minimum — see `alerting` below. */
  minStayAlert: number;
}

export function AvailabilityCalendar({
  disabledDates,
  today: propertyToday,
  horizonDays,
  selected,
  onSelect,
  minStayAlert,
}: Props) {
  const { t, lang } = useLanguage();
  const twoMonths = useMediaQuery(TWO_MONTH_QUERY);

  // The 2-night rule is already stated once, under the calendar. Picking a
  // single night flashes *that* line red instead of printing a second message
  // that says the same thing in more words: the guest is sent to where the
  // rule lives rather than being handed a new one to read.
  const [alerting, setAlerting] = useState(false);
  useEffect(() => {
    if (minStayAlert === 0) return; // nothing tried yet
    setAlerting(true);
    const timer = setTimeout(() => setAlerting(false), 2600);
    return () => clearTimeout(timer);
  }, [minStayAlert]);

  // Deliberately the property's clock, not the visitor's. A guest browsing
  // from a timezone behind Greece would otherwise be offered a night that has
  // already started in Patras (and be rejected as "past-date" on submit), and
  // one ahead of it would lose a night that is still bookable here.
  const today = parseISO(propertyToday);
  const horizon = addDays(today, horizonDays);

  const blocked = useMemo(() => disabledDates.map((d) => parseISO(d)), [disabledDates]);

  // One set of off-limits days, the same before and after a check-in is picked.
  // This used to narrow in two phases — legal arrivals, then legal departures
  // for that arrival — which is more precise but reads as a moving target: a
  // guest looking for 5–8 August saw only the 5th and 6th open and concluded
  // the place was free for one night, when the 8th was open all along as a
  // checkout. A fixed set means grey always says the same thing: nothing can
  // happen on this day. An illegal *pair* of open days is still possible, and
  // BookingSection answers that with a reason instead of a silent refusal.
  const from = selected?.from;
  const pickingCheckout = !!(from && !selected?.to);

  const disabled: Matcher[] = [{ before: today }, { after: horizon }, ...blocked];

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-aegean-900/70 dark:text-ink-muted">
        {/* The two swatches are the two cell fills the calendar actually uses,
            so the key can be matched against the grid by eye. */}
        <LegendDot
          className="bg-white ring-1 ring-inset ring-sand-200 dark:bg-ink-surface dark:ring-ink-border"
          label={t.calendar.legendAvailable}
        />
        <LegendDot className="bg-sand-200 dark:bg-ink-border" label={t.calendar.legendBooked} />
      </div>

      <DayPicker
        mode="range"
        selected={selected}
        onSelect={(range, selectedDay) => {
          // Clicking the arrival date again clears the stay. Left to itself the
          // picker would hand back a same-day range of zero nights, which is
          // just an error message for something the guest plainly meant as
          // "undo". Clicking any *earlier* open day is left alone: that builds
          // the range backwards, which is a useful way in now that the days
          // before an arrival stay open.
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
        // Marks the booked days apart from the other disabled ones. Without it
        // a night someone else has bought looks exactly like a day in the past,
        // and the "Booked" key below points at nothing on screen.
        modifiers={{ booked: blocked }}
        modifiersClassNames={{ booked: "day-booked" }}
        locale={lang === "el" ? el : enUS}
        numberOfMonths={twoMonths ? 2 : 1}
        // Paging one month at a time (rather than two) keeps the month you were
        // just looking at on screen, so a stay that straddles the seam stays
        // visible while you reach for the second date.
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

      {/* `key` remounts the line on every bump so the shake replays even when
          a second short stay is picked while the first flash is still lit —
          re-adding a class React already sees on the element would not.
          The colour carries the message on its own under
          prefers-reduced-motion, where globals.css cancels the animation. */}
      <p
        key={minStayAlert}
        className={
          alerting
            ? "mt-3 animate-shake text-xs font-semibold text-red-600 dark:text-red-400"
            : "mt-3 text-xs text-aegean-900/60 transition-colors dark:text-ink-muted"
        }
      >
        {t.calendar.minStayNotice}
      </p>
      {/* Nothing on screen changes wording, so a screen reader would otherwise
          get no signal at all that the pick was refused. */}
      {alerting && (
        <span role="alert" className="sr-only">
          {t.form.errorMinStay}
        </span>
      )}
    </div>
  );
}

/**
 * Subscribes to a media query. `useSyncExternalStore` rather than
 * state-in-an-effect so the very first client render already knows the width:
 * this component only mounts once `/api/availability` has answered, well after
 * hydration, so there is no server snapshot to match and no reason to paint a
 * one-month calendar for a frame before widening it.
 */
function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false // server: assume narrow, the layout that fits everywhere
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
