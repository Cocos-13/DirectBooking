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

With both unset the calendar shows **fully open**. Feeds are cached ~30 min, so
a new platform booking can take up to half an hour to appear here.

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
- **Refunds/cancellations.** A cancelled or refunded booking is not
  automatically removed from the store yet — unblock those dates manually on
  the platforms (and clear the entry) if you refund a guest.
