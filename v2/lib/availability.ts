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

function addDaysYmd(ymd: string, days: number): string {
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
 *  - Minimum stay is 2 nights.
 *  - Exception: a 1-night stay is allowed only if it exactly fills a
 *    1-night gap between two already-booked ranges (the "orphan gap" rule
 *    mirrored from the PriceLabs setup). A 1-night stay at the edge of the
 *    calendar (nothing booked on one side) does NOT qualify.
 *  - Same-day-turnover weekday restrictions are intentionally NOT enforced
 *    here — handled manually at confirmation time.
 *
 * `opts` adds the time-window guards that must run server-side even though the
 * calendar UI already prevents most bad picks (an attacker posts JSON straight
 * to the API, bypassing the UI):
 *  - `today`      — property-local "today"; defaults to Europe/Athens.
 *  - `horizonDays`— reject check-ins further out than the published horizon.
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
  if (opts.horizonDays != null && checkin > addDaysYmd(today, opts.horizonDays)) {
    return { ok: false, reason: "too-far" };
  }

  if (!isDateRangeFree(checkin, checkout, merged)) {
    return { ok: false, reason: "not-available" };
  }

  const nights = nightsBetween(checkin, checkout);

  if (nights >= MIN_NIGHTS) {
    return { ok: true };
  }

  if (nights === 1 && isOrphanGap(checkin, checkout, merged)) {
    return { ok: true };
  }

  return { ok: false, reason: "min-stay" };
}

/**
 * True if [checkin, checkout) is exactly the 1-night gap sitting between
 * two existing busy ranges (i.e. bounded on both sides — not a dangling
 * edge before the first booking or after the last one).
 */
function isOrphanGap(checkin: string, checkout: string, merged: MergedRange[]): boolean {
  const sorted = [...merged].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 0; i < sorted.length - 1; i++) {
    const prevEnd = sorted[i].end;
    const nextStart = sorted[i + 1].start;
    if (prevEnd === checkin && nextStart === checkout && nightsBetween(prevEnd, nextStart) === 1) {
      return true;
    }
  }
  return false;
}

/** Every 1-night gap currently open between two bookings, as its check-in date. */
export function getOrphanGapNights(merged: MergedRange[]): string[] {
  const sorted = [...merged].sort((a, b) => a.start.localeCompare(b.start));
  const singles: string[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const prevEnd = sorted[i].end;
    const nextStart = sorted[i + 1].start;
    if (nightsBetween(prevEnd, nextStart) === 1) singles.push(prevEnd);
  }
  return singles;
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
 * Dates that cannot be an ARRIVAL day — every occupied night.
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
  return getBookedDates(merged);
}
