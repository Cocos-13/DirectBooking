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

/**
 * Inverse of `getBookedDates`: collapses individual nights back into half-open
 * ranges, so a run of separately-stored nights (the owner's manual blocks) can
 * be published as a handful of iCal events instead of one VEVENT per night.
 * Input need not be sorted or unique.
 */
export function datesToRanges(dates: string[]): MergedRange[] {
  const sorted = [...new Set(dates)].sort();
  const ranges: MergedRange[] = [];
  for (const day of sorted) {
    const last = ranges[ranges.length - 1];
    // `last.end` is the morning after the previous night — if this night starts
    // exactly then, the two are contiguous and extend the same range.
    if (last && last.end === day) last.end = addDaysYmd(day, 1);
    else ranges.push({ start: day, end: addDaysYmd(day, 1) });
  }
  return ranges;
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
 * The days the calendar greys out: those that can be **neither** an arrival nor
 * a departure, so no legal stay touches them at all.
 *
 * Deliberately *not* "every occupied night". The day a booking starts is still
 * a legal checkout (you sleep the night before and leave in the morning), and
 * the day it ends is still a legal check-in. Blocking a whole booking made the
 * days on either side of it look dead too, so a guest looking at a booking on
 * 8–12 saw the 7th and 8th greyed out and concluded that a stay ending on the
 * 8th was impossible — when it is exactly the handover we most want to sell.
 *
 * So for a booking on the 10th–14th only the 11th, 12th and 13th go dark: you
 * can still check out on the 10th and check in on the 14th. Short gaps between
 * two bookings fall out of the same rule — a single free night can't host the
 * 2-night minimum from either side, so it blocks itself without a special case.
 *
 * `evaluateBookingRange` remains the authority. This set only marks days that
 * are hopeless on their own; a guest can still pick an illegal *pair* of open
 * days (straddling a booking, or too short) and is told why, which is far
 * easier to act on than a day that is silently missing.
 */
export function getBlockedDates(
  merged: MergedRange[],
  opts: { today?: string; horizonDays: number }
): string[] {
  const today = opts.today ?? propertyToday();
  const lastBookableDay = addDaysYmd(today, opts.horizonDays);

  const bookedNights = new Set(getBookedDates(merged));
  /** MIN_NIGHTS free nights in a row starting on `night` — the shortest legal stay. */
  const fitsMinStay = (night: string) => {
    for (let i = 0; i < MIN_NIGHTS; i++) {
      if (bookedNights.has(addDaysYmd(night, i))) return false;
    }
    return true;
  };

  const blocked: string[] = [];
  for (let day = today; day <= lastBookableDay; day = addDaysYmd(day, 1)) {
    // As an arrival: the minimum stay must fit ahead of it, checkout included,
    // inside the published window — the same bound the server applies.
    const canArrive = addDaysYmd(day, MIN_NIGHTS) <= lastBookableDay && fitsMinStay(day);
    // As a departure: the same nights behind it, with an arrival not in the past.
    const earliestArrival = addDaysYmd(day, -MIN_NIGHTS);
    const canDepart = earliestArrival >= today && fitsMinStay(earliestArrival);
    if (!canArrive && !canDepart) blocked.push(day);
  }

  return blocked;
}
