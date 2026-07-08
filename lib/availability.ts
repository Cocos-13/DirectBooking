import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { BookingEvaluation, BusyRange, MergedRange } from "./types";

export const MIN_NIGHTS = 2;

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
 */
export function evaluateBookingRange(
  checkin: string,
  checkout: string,
  merged: MergedRange[]
): BookingEvaluation {
  if (!checkin || !checkout || checkout <= checkin) {
    return { ok: false, reason: "invalid-range" };
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
 * Dates to grey out / block in the calendar UI.
 *
 * This is deliberately narrower than "every occupied night": a date that is
 * occupied by one booking but is *also* the checkout boundary of the
 * previous booking (i.e. two reservations sit back-to-back) must stay
 * pickable, because it's a perfectly valid checkout day for a new request
 * ending right before the next guest arrives. `evaluateBookingRange` is the
 * real authority on what's bookable — this is only a UX hint, so it's fine
 * for it to be a little permissive.
 */
export function getDisabledDates(merged: MergedRange[]): string[] {
  const checkoutBoundaries = new Set(merged.map((r) => r.end));
  return getBookedDates(merged).filter((d) => !checkoutBoundaries.has(d));
}
