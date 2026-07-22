# Calendar sync

The site keeps its availability in sync with Airbnb and Booking.com in **both
directions** using iCal feeds.

```
Airbnb / Booking.com  --export .ics-->  this site   (inbound: block their bookings)
this site  --/api/calendar.ics-->  Airbnb / Booking.com   (outbound: block direct bookings)
```

## Inbound — show platform bookings on this site

Set the platforms' **export** URLs as environment variables:

| Variable | Where to get it |
| --- | --- |
| `ICAL_URL_AIRBNB` | Airbnb → Host → Calendar → (listing) → Availability → *Connect to another website* → **Export Calendar** |
| `ICAL_URL_BOOKING` | Booking.com → Extranet → Rates & Availability → **Sync calendars** → Export |

> ⚠️ With both unset the calendar shows **fully open** — the site will happily
> take a request for nights Airbnb already sold. These must be set in the
> **hosting environment** (Vercel), not just in a local `.env.local`.

Platform feeds are cached ~30 min, so a new Airbnb/Booking.com booking can take
up to half an hour to appear here.

## Freshness — what is cached and what is not

`/api/availability` is a **dynamic, `no-store`** route, and the two things it
merges have deliberately different lifetimes:

| Source | Freshness | Why |
| --- | --- | --- |
| Airbnb / Booking.com feeds | cached 30 min (`unstable_cache` in `lib/ical.ts`) | slow-moving and rate-limited; no reason to refetch per page load |
| This site's paid bookings + live pay-link holds | **read live, every request** | a guest who just paid must block those nights on the very next page load, and a hold has to be visible for its whole lifetime |

That split is the reason the route can't use `export const revalidate`: a
cached route would keep serving nights that are already sold or held. If you
ever add caching back to `app/api/availability/route.ts`, you reintroduce the
double-booking window it exists to close.

Ranges that have already ended are dropped on read, so the blocked-date list
doesn't grow without bound over the years.

## Outbound — push direct bookings to the platforms

This closes the double-booking loop: a paid direct booking is published so the
platforms block those dates too.

### 1. Turn on the store

Direct bookings must be persisted. Configure a Redis store (see
`.env.local.example`):

- **On Vercel:** add a Redis store from the Marketplace (Upstash). It injects
  `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
- **Elsewhere:** create an Upstash Redis DB and set those two variables (the
  `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` pair also works).

With the store unset, direct bookings aren't recorded and the feed below is
empty (but valid) — the site simply behaves as before.

### 2. Import the feed into each platform

The site publishes its direct bookings at:

```
https://YOUR_SITE/api/calendar.ics
```

Add that URL as an **imported** calendar:

- **Airbnb** → Host → Calendar → (listing) → Availability → *Connect to another
  website* → **Import Calendar** → paste the URL.
- **Booking.com** → Extranet → Rates & Availability → **Sync calendars** →
  *Import calendar* → paste the URL.

## Good to know

- **Requires payments configured.** A booking is recorded when its Viva payment
  is confirmed (see [PAYMENTS.md](./PAYMENTS.md)). No payment → nothing to
  publish.
- **Not instant.** Airbnb/Booking.com re-read imported calendars every few
  hours, so the outbound block isn't immediate — it shrinks the double-booking
  window rather than eliminating it. The site's **own** calendar blocks a
  direct booking immediately.
- **No echo loop.** The published feed contains **only** this site's own direct
  bookings — never the ranges imported from Airbnb/Booking.com. So importing it
  back into both platforms can't feed a platform its own blocks, and can't
  ping-pong a block between them. Keep it that way: `/api/calendar.ics` must
  read `getConfirmedBookings()`, never `getRawBusyRanges()`.
- **Only future stays are published.** Bookings whose checkout has passed are
  filtered out, so the file stays small no matter how many years accumulate.
- **Refunds/cancellations.** A cancelled or refunded booking is not
  automatically removed from the store yet — unblock those dates manually on
  the platforms (and clear the entry) if you refund a guest.

## Booking rules the calendar enforces

The picker works in two phases, because the legal days differ per end of the
stay — see `components/AvailabilityCalendar.tsx`:

- **Arrival** — any day that is not an occupied night. A booking's *checkout*
  day is not occupied, so you can arrive the morning the last guest leaves.
- **Departure** — any day after arrival, **up to and including** the first
  booked day that follows. You may check out the day the next guest checks in;
  you may not book straight through them.

`evaluateBookingRange()` in `lib/availability.ts` is the authority and re-runs
server-side in `/api/request` and `/api/booking/approve` (with the property's
own Europe/Athens clock and the 365-day horizon), so posting JSON straight at
the API doesn't get you around any of it.
