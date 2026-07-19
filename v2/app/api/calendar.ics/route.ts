import { getConfirmedBookings } from "@/lib/bookingStore";
import { siteConfig } from "@/content/siteConfig";

// Published iCal feed of this site's OWN direct bookings. The owner imports
// this URL into Airbnb and Booking.com ("Import calendar") so a direct
// booking blocks those dates on the platforms too. Empty (but valid) when the
// store isn't configured or holds no bookings.
//
// Always regenerated so it reflects the latest bookings; a short CDN cache
// keeps polling platforms from hitting the store on every request.
export const dynamic = "force-dynamic";

export async function GET() {
  const bookings = await getConfirmedBookings().catch(() => []);
  const host = safeHost(siteConfig.url);
  const stamp = icalStamp(new Date());

  const events = bookings.map((b) =>
    [
      "BEGIN:VEVENT",
      `UID:direct-${b.id}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icalDate(b.checkin)}`,
      `DTEND;VALUE=DATE:${icalDate(b.checkout)}`,
      "SUMMARY:Booked (direct)",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ].join("\r\n")
  );

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${siteConfig.name}//Direct Booking//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(calendar, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
      "content-disposition": 'inline; filename="calendar.ics"',
    },
  });
}

// 2026-08-01 -> 20260801 (all-day VALUE=DATE form)
function icalDate(ymd: string): string {
  return ymd.replace(/-/g, "");
}

// Date -> 20260719T143000Z (UTC basic format)
function icalStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "direct-booking";
  }
}
