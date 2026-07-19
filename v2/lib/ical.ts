import ical from "node-ical";
import type { BusyRange, IcalSource } from "./types";
import { getConfirmedBookings, isStoreConfigured } from "./bookingStore";

// How long Next.js may serve a cached copy of each iCal feed before
// re-fetching. Keeps us well clear of any rate limits and avoids hitting
// Airbnb/Booking.com on every page load.
const REVALIDATE_SECONDS = 60 * 30; // 30 minutes

function toDateOnly(d: Date): string {
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
 * Fetches both platform calendars and returns their raw busy ranges
 * (unmerged, tagged by source). A feed that fails to fetch or parse is
 * dropped rather than failing the whole page — one broken export URL
 * shouldn't take the calendar down.
 */
export async function getRawBusyRanges(): Promise<BusyRange[]> {
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

  // This site's own paid direct bookings — so the calendar and request
  // validation block them immediately, without waiting for Airbnb/Booking.com
  // to import our published feed.
  if (isStoreConfigured()) {
    jobs.push(
      getConfirmedBookings()
        .then((bookings) =>
          bookings.map((b): BusyRange => ({ start: b.checkin, end: b.checkout, source: "direct" }))
        )
        .catch((err) => {
          console.error("[ical] direct-booking store read failed:", err);
          return [];
        })
    );
  }

  if (jobs.length === 0) {
    console.warn("[ical] No ICAL_URL_AIRBNB / ICAL_URL_BOOKING configured — calendar will show fully open.");
  }

  const results = await Promise.all(jobs);
  return results.flat();
}
