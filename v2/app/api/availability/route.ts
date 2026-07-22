import { NextResponse } from "next/server";
import { getRawBusyRanges } from "@/lib/ical";
import {
  MIN_NIGHTS,
  getDisabledDates,
  getOrphanGapNights,
  mergeBusyRanges,
  propertyToday,
} from "@/lib/availability";
import { siteConfig } from "@/content/siteConfig";

// Must be fully dynamic. The response mixes two very different clocks: the
// platform iCal feeds (cached 30 min inside lib/ical.ts, where that lifetime
// is stated explicitly) and this site's own bookings + live pay-link holds,
// which have to be read fresh on every request. Caching the route would let a
// second guest see nights a first guest has already paid for or is holding —
// for up to as long as the hold itself lasts.
export const dynamic = "force-dynamic";

export async function GET() {
  // Availability decides whether we take someone's money for nights we don't
  // have. It must never be served from a browser or CDN cache.
  const noStore = { "cache-control": "no-store, max-age=0" };

  try {
    const raw = await getRawBusyRanges();
    const merged = mergeBusyRanges(raw);

    return NextResponse.json(
      {
        merged,
        disabledDates: getDisabledDates(merged),
        orphanGapNights: getOrphanGapNights(merged),
        // The property-local clock and booking window the server will enforce,
        // so the browser validates against exactly the same rules it does.
        today: propertyToday(),
        horizonDays: siteConfig.calendarHorizonDays,
        minNights: MIN_NIGHTS,
        generatedAt: new Date().toISOString(),
      },
      { headers: noStore }
    );
  } catch (err) {
    console.error("[api/availability] failed:", err);
    return NextResponse.json(
      { error: "Could not load availability right now. Please try again shortly." },
      { status: 502, headers: noStore }
    );
  }
}
