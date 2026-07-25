import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { BookingEvaluation, BusyRange, MergedRange } from "./types";

export const MIN_NIGHTS = 2;

/**
 * "Today" as a YYYY-MM-DD string in the property's local timezone (Greece).
 * We deliberately anchor to the property clock, not the visitor's or the
 * server's UTC clock: a guest in another timezone must not be able to book a
 * night that has already started in Patras, and a UTC server must not reject a
 * same-day Athens booking just because it's already tomorrow in UTC.
 */
export function propertyToday(timeZone = "Europe/Athens"): string {
  // en-CA formats as YYYY-MM-DD, which is exactly our canonical date shape.
  return new Date().toLocaleDateString("en-CA", { timeZone });
}

/** True only for a real calendar date in strict YYYY-MM-DD form. */
export function isValidYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseISO(value);
  // parseISO tolerates e.g. 2026-02-31 by rolling over; round-trip to catch it.
  return !Number.isNaN(d.getTime()) && format(d, "yyyy-MM-dd") === value;
}

export function addDaysYmd(ymd: string, days: number): string {
  return format(addDays(parseISO(ymd), days), "yyyy-MM-dd");
}

/**
 * Collapses raw per-platform busy ranges into a single sorted timeline,
 * merging overlapping or touching ranges regardless of source. Once merged
 * we no longer care which platform holds a given night — only whether it's
 * free.
 */
export function mergeBusyRanges(ranges: BusyRange[]): MergedRange[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges]
    .map((r) => ({ start: r.start, end: r.end }))
    // Drop degenerate events (end on or before start). A zero-night VEVENT
    // blocks nothing, but left in the timeline it still acts as a wall that
    // caps how far a stay may run — so it would silently shorten real stays.
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start.localeCompare(b.start));

  const merged: MergedRange[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      if (r.end > last.end) last.end = r.end;
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

export function nightsBetween(checkin: string, checkout: string): number {
  return differenceInCalendarDays(parseISO(checkout), parseISO(checkin));
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isDateRangeFree(checkin: string, checkout: string, merged: MergedRange[]): boolean {
  return !merged.some((b) => rangesOverlap(checkin, checkout, b.start, b.end));
}

/**
 * Core availability rule for v1:
 *  - Minimum stay is 2 nights, with no exceptions. 1-night gaps between two
 *    bookings are simply left unsold rather than being offered as a special
 *    case.
 *  - Same-day-turnover weekday restrictions are intentionally NOT enforced
 *    here — handled manually at confirmation time.
 *
 * `opts` adds the time-window guards that must run server-side even though the
 * calendar UI already prevents most bad picks (an attacker posts JSON straight
 * to the API, bypassing the UI):
 *  - `today`      — property-local "today"; defaults to Europe/Athens.
 *  - `horizonDays`— reject stays that fall outside the published horizon.
 */
export function evaluateBookingRange(
  checkin: string,
  checkout: string,
  merged: MergedRange[],
  opts: { today?: string; horizonDays?: number } = {}
): BookingEvaluation {
  if (
    !isValidYmd(checkin) ||
    !isValidYmd(checkout) ||
    checkout <= checkin
  ) {
    return { ok: false, reason: "invalid-range" };
  }

  const today = opts.today ?? propertyToday();
  if (checkin < today) {
    return { ok: false, reason: "past-date" };
  }
  if (opts.horizonDays != null) {
    // Both ends, not just the arrival: the calendar can't offer a departure
    // past the horizon either, and without this bound a request posted
    // straight at the API could start inside the window and then run years
    // past the end of it (nothing is booked out there to collide with).
    const lastBookableDay = addDaysYmd(today, opts.horizonDays);
    if (checkin > lastBookableDay || checkout > lastBookableDay) {
      return { ok: false, reason: "too-far" };
    }
  }

  if (!isDateRangeFree(checkin, checkout, merged)) {
    return { ok: false, reason: "not-available" };
  }

  if (nightsBetween(checkin, checkout) < MIN_NIGHTS) {
    return { ok: false, reason: "min-stay" };
  }

  return { ok: true };
}

/** Every individual night (YYYY-MM-DD) currently occupied by a booking. */
export function getBookedDates(merged: MergedRange[]): string[] {
  const dates: string[] = [];
  for (const r of merged) {
    let cursor = r.start;
    while (cursor < r.end) {
      dates.push(cursor);
      cursor = format(addDays(parseISO(cursor), 1), "yyyy-MM-dd");
    }
  }
  return dates;
}

/**
 * Dates that cannot be an ARRIVAL day: every occupied night, plus every free
 * night that sits too close in front of the next booking to fit the 2-night
 * minimum (with MIN_NIGHTS = 2 that's the single night before a booking
 * starts, which covers 1-night gaps between two bookings). Offering those as
 * check-in dates would only ever lead to a "min-stay" rejection.
 *
 * A range's `end` is its checkout day, which is not an occupied night, so
 * back-to-back arrivals (moving in the morning the last guest leaves) are
 * already pickable and need no special case here.
 *
 * This is only the arrival-side constraint. Legal DEPARTURE days are a
 * different set — you may check out on a day that is booked, as long as it's
 * the first booked day after your arrival — which the calendar computes from
 * `merged` directly. `evaluateBookingRange` remains the real authority on
 * what's bookable; both of these are UX affordances in front of it.
 */
export function getDisabledDates(merged: MergedRange[]): string[] {
  const booked = new Set(getBookedDates(merged));
  const disabled = new Set(booked);

  for (const r of merged) {
    for (let back = 1; back < MIN_NIGHTS; back++) {
      const day = addDaysYmd(r.start, -back);
      if (!booked.has(day)) disabled.add(day);
    }
  }

  return [...disabled].sort();
}
