# Calendar sync

The site keeps its availability in sync with Airbnb and Booking.com in **both
directions** using iCal feeds.

```
Airbnb / Booking.com  --export .ics-->  this site   (inbound: block their bookings)
this site  --/api/calendar.ics-->  Airbnb / Booking.com   (outbound: block direct bookings + manual blocks)
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
| This site's paid bookings + live pay-link holds + owner blocks | **read live, every request** | a guest who just paid must block those nights on the very next page load, a hold has to be visible for its whole lifetime, and an owner who blocks a night needs it gone from the site *now* |

That split is the reason the route can't use `export const revalidate`: a
cached route would keep serving nights that are already sold or held. If you
ever add caching back to `app/api/availability/route.ts`, you reintroduce the
double-booking window it exists to close.

Ranges that have already ended are dropped on read, so the blocked-date list
doesn't grow without bound over the years.

## Outbound — push direct bookings and manual blocks to the platforms

This closes the double-booking loop: a paid direct booking **and any night the
owner blocks by hand** are published, so the platforms block those dates too.

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
- **Manual blocks are published too**, not just paid bookings — that's what
  makes a cleaning buffer reach Airbnb and Booking.com instead of only closing
  the night here. See [Blocking dates by hand](#blocking-dates-by-hand).
- **No echo loop.** The published feed contains **only** what originates on
  this site: `getConfirmedBookings()` + `getManualBlockDates()`. It must never
  contain the ranges imported *from* Airbnb/Booking.com, so importing it back
  into both platforms can't feed a platform its own blocks or ping-pong a block
  between them. Keep it that way: `/api/calendar.ics` must never read
  `getRawBusyRanges()`, which mixes the platform feeds back in.
- **Only future stays are published.** Bookings whose checkout has passed are
  filtered out, and manual blocks on nights that have passed are dropped (and
  pruned from the store) on read, so the file stays small no matter how many
  years accumulate.
- **Refunds/cancellations.** A cancelled or refunded booking is not
  automatically removed from the store yet — unblock those dates manually on
  the platforms (and clear the entry) if you refund a guest.

## Blocking dates by hand

The admin page at **`/api/admin/bookings`** shows the whole booking window as a
month grid, each night coloured by what is holding it — a direct booking, an
Airbnb or Booking.com booking, a live pay link, or a block you made. Tick free
nights to close them, or nights you closed earlier to reopen them, and press
**Block selected nights** / **Reopen selected nights**.

### Blocking a day blocks that *night*

Blocking the 14th means nobody can **arrive** on the 14th, but somebody can
still **check out** on the morning of the 14th. This is the same half-open
convention a real booking uses (`[checkin, checkout)`), and it's what makes the
turnover buffer work:

```
stay:            10 ── 11 ── 12 ── 13 ──▶ 14 (guest leaves in the morning)
block "before":   9                            → nobody may check out on the 10th
block "after":                            14   → nobody may check in on the 14th
```

So for a booking of 10 → 14, the cleaning buffer is the **night before
check-in (the 9th)** and the **checkout night (the 14th)**. The bookings table
has a *Turnover* column with a one-click chip for each; click again to undo.

### Reach and timing

| Where | When it takes effect |
| --- | --- |
| This site | immediately — the store is read live on every availability request |
| Airbnb / Booking.com | next time they re-read `/api/calendar.ics` (every few hours) |

A block is stored one field **per night** (`manualBlocks` hash in Redis), which
makes both directions idempotent and lets a single night be freed out of the
middle of a blocked week without splitting ranges. Consecutive nights are
merged back into ranges only for the published feed, so a fortnight closed for
renovation is one `VEVENT`, not fourteen.

Nights that have already passed are dropped on read and pruned from the store,
so the hash can't grow without bound.

## Booking rules the calendar enforces

The picker greys out **one fixed set of days**, the same before and after a
check-in is picked: the days that can be neither an arrival nor a departure, so
that no legal stay touches them at all (`getBlockedDates` in
`lib/availability.ts`). For a booking on the 10th–14th that is the 11th, 12th
and 13th — you can still check out on the 10th and check in on the 14th, the
handovers we most want to sell. A single free night between two bookings can't
host the 2-night minimum from either side, so it blocks itself with no special
case.

This replaced a two-phase picker that narrowed to legal arrivals, then to legal
departures for the chosen arrival. That was more precise but read as a moving
target: with a booking on the 8th–12th, a guest looking for 5–8 August saw only
the 5th and 6th open, concluded the place was free for one night, and left —
when the 8th was available as a checkout the whole time.

The cost of the simpler rule is that an illegal *pair* of open days is now
reachable: straddling a booking, or shorter than two nights. `BookingSection`
runs `evaluateBookingRange` on every completed range and answers with the
reason ("those dates are no longer available", "minimum stay is 2 nights"),
which is far easier to act on than a day that is silently missing. Submission
stays blocked until the range is legal, and the server re-checks regardless.

From 768px up the picker shows **two months side by side** (Booking.com style),
so a stay that straddles a month boundary can be picked without paging; below
that it falls back to one month, which is all that fits on a phone. Navigation
still steps one month at a time, keeping the month you were just looking at on
screen while you reach for the second date.

Both ends are anchored to the **property's** Europe/Athens clock, not the
visitor's: `/api/availability` publishes `today` and `horizonDays`, and the
picker uses those, so a guest browsing from another timezone is offered exactly
the days the server will accept.

`evaluateBookingRange()` in `lib/availability.ts` is the authority and re-runs
server-side in `/api/request` and `/api/booking/approve` (with the property's
own Europe/Athens clock and the 365-day horizon), so posting JSON straight at
the API doesn't get you around any of it.
