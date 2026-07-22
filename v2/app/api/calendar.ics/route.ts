import { getConfirmedBookings } from "@/lib/bookingStore";
import { propertyToday } from "@/lib/availability";
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
  const all = await getConfirmedBookings().catch(() => []);

  // Only publish stays that haven't ended yet. Past bookings can't affect
  // anyone's availability, and emitting them forever would grow the feed
  // without bound — the platforms re-download this file every few hours.
  const today = propertyToday();
  const bookings = all.filter((b) => b.checkout >= today);

  const host = safeHost(siteConfig.url);
  const stamp = icalStamp(new Date());

  const events = bookings.map((b) =>
    [
      "BEGIN:VEVENT",
      `UID:direct-${icalText(String(b.id))}@${host}`,
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
    `PRODID:-//${icalText(siteConfig.name)}//Direct Booking//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icalText(siteConfig.name)} - direct bookings`,
    // Hint to importers how often this is worth re-reading. Airbnb and
    // Booking.com use their own schedule regardless, but it costs nothing.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  // RFC 5545 wants the stream to end with a CRLF after END:VCALENDAR.
  return new Response(`${calendar}\r\n`, {
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

// RFC 5545 §3.3.11: backslash, semicolon, comma and newlines are special
// inside a TEXT value and must be escaped, or an importer silently truncates
// the property at the first comma.
function icalText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "direct-booking";
  }
}
