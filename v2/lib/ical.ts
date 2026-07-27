import ical from "node-ical";
import { unstable_cache } from "next/cache";
import type { BusyRange, IcalSource } from "./types";
import { addDaysYmd, propertyToday } from "./availability";
import {
  getActiveHolds,
  getConfirmedBookings,
  getManualBlockDates,
  isStoreConfigured,
} from "./bookingStore";

// How long a fetched copy of each platform iCal feed may be reused before
// re-fetching. Keeps us well clear of any rate limits and avoids hitting
// Airbnb/Booking.com on every page load.
const REVALIDATE_SECONDS = 60 * 30; // 30 minutes

function toDateOnly(d: Date): string {
  // node-ical materializes a VALUE=DATE property as local midnight, so reading
  // it back with the local getters round-trips to the same calendar day on any
  // server timezone. Do NOT switch these to the UTC getters.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchIcsText(url: string): Promise<string> {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) {
    throw new Error(`Failed to fetch iCal feed (HTTP ${res.status}): ${url}`);
  }
  return res.text();
}

async function parseBusyRanges(url: string, source: IcalSource): Promise<BusyRange[]> {
  const text = await fetchIcsText(url);
  const data = ical.sync.parseICS(text);
  const ranges: BusyRange[] = [];

  for (const key of Object.keys(data)) {
    const event = data[key];
    if (event.type !== "VEVENT" || !event.start || !event.end) continue;
    ranges.push({
      start: toDateOnly(event.start as Date),
      end: toDateOnly(event.end as Date),
      source,
    });
  }

  return ranges;
}

/**
 * Airbnb + Booking.com busy ranges, cached for REVALIDATE_SECONDS.
 *
 * Deliberately wrapped in `unstable_cache` rather than relying on the route's
 * own cache: the availability route has to be fully dynamic (see below), and
 * this keeps the platform-feed cache lifetime an explicit property of *this*
 * function instead of an emergent side effect of route config.
 *
 * A feed that fails to fetch or parse is dropped rather than failing the whole
 * page — one broken export URL shouldn't take the calendar down.
 */
const getPlatformBusyRanges = unstable_cache(
  async (): Promise<BusyRange[]> => {
    const airbnbUrl = process.env.ICAL_URL_AIRBNB;
    const bookingUrl = process.env.ICAL_URL_BOOKING;

    const jobs: Promise<BusyRange[]>[] = [];

    if (airbnbUrl) {
      jobs.push(
        parseBusyRanges(airbnbUrl, "airbnb").catch((err) => {
          console.error("[ical] Airbnb feed failed:", err);
          return [];
        })
      );
    }
    if (bookingUrl) {
      jobs.push(
        parseBusyRanges(bookingUrl, "booking").catch((err) => {
          console.error("[ical] Booking.com feed failed:", err);
          return [];
        })
      );
    }

    if (jobs.length === 0) {
      console.warn(
        "[ical] No ICAL_URL_AIRBNB / ICAL_URL_BOOKING configured — platform bookings will NOT block dates on this site."
      );
      return [];
    }

    const results = await Promise.all(jobs);
    return results.flat();
  },
  ["ical-platform-feeds"],
  { revalidate: REVALIDATE_SECONDS, tags: ["availability"] }
);

/** This site's own paid bookings + live pay-link holds + owner blocks. Never cached. */
async function getDirectBusyRanges(): Promise<BusyRange[]> {
  // Config-gated: with no store there is nothing to read.
  if (!isStoreConfigured()) return [];

  const [bookings, holds, blocks] = await Promise.all([
    // Paid direct bookings — blocked on this site immediately, without waiting
    // for Airbnb/Booking.com to re-import our published feed.
    getConfirmedBookings().catch((err) => {
      console.error("[ical] direct-booking store read failed:", err);
      return [];
    }),
    // Active holds — nights with a live pay link out to a guest. Treated as
    // busy so the same nights aren't offered to (or bookable by) a second
    // guest during the payment window. Expired holds self-prune.
    getActiveHolds().catch((err) => {
      console.error("[ical] hold read failed:", err);
      return [];
    }),
    // Nights the owner closed by hand in the admin calendar (cleaning buffers,
    // personal use). Read live like the two above: the owner blocks a night
    // precisely because they need it gone from the site *now*.
    getManualBlockDates().catch((err) => {
      console.error("[ical] manual block read failed:", err);
      return [] as string[];
    }),
  ]);

  return [
    ...bookings.map((b): BusyRange => ({ start: b.checkin, end: b.checkout, source: "direct" })),
    ...holds.map((h): BusyRange => ({ start: h.checkin, end: h.checkout, source: "hold" })),
    // One blocked night = the half-open range [D, D+1), so the merge/overlap
    // machinery downstream treats it exactly like a 1-night booking.
    ...blocks.map((d): BusyRange => ({ start: d, end: addDaysYmd(d, 1), source: "manual" })),
  ];
}

/**
 * Every busy range relevant to a *future* stay, from all three sources
 * (Airbnb, Booking.com, this site's own bookings/holds), unmerged and tagged.
 *
 * Freshness is deliberately asymmetric: platform feeds are up to 30 minutes
 * stale (they're slow-moving and rate-limited), but our own store is read live
 * on every call, so a booking paid for one second ago blocks its dates on the
 * very next page load.
 */
export async function getRawBusyRanges(): Promise<BusyRange[]> {
  const [platform, direct] = await Promise.all([
    getPlatformBusyRanges().catch((err) => {
      console.error("[ical] platform feeds failed:", err);
      return [] as BusyRange[];
    }),
    getDirectBusyRanges(),
  ]);

  // Drop ranges that are entirely in the past. Nothing downstream can book
  // them (`evaluateBookingRange` rejects past check-ins), and without this the
  // blocked-date list grows without bound as the years accumulate.
  const today = propertyToday();
  return [...platform, ...direct].filter((r) => r.end >= today);
}
