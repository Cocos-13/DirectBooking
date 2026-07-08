# Patras Center Apartment — Direct Booking Site

A lean, mobile-first landing page for a single short-term rental apartment
in central Patras. Guests browse photos/amenities/location, check a live
availability calendar (synced from your Airbnb & Booking.com iCal feeds),
and submit a booking **request** — you confirm manually and arrange
payment separately. No payment processing, no database, no admin panel.

Stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS, deployed on
Vercel's free tier. Availability comes from `node-ical` parsing the two
platform export feeds server-side, cached ~30 minutes. Booking requests are
emailed to you via [Resend](https://resend.com).

---

## 0. Prerequisite: install Node.js

This machine doesn't have Node.js installed yet. Install the current LTS
version from **https://nodejs.org** (or via `winget install OpenJS.NodeJS.LTS`
in PowerShell), then re-open your terminal so `node`/`npm` are on PATH.
Verify with:

```powershell
node --version   # should print v20.x or v18.18+
npm --version
```

Then install dependencies from the project folder:

```powershell
npm install
```

---

## 1. Plug in your content

### a) iCal URLs (availability sync)

Copy the env template and fill in your two calendar export URLs:

```powershell
Copy-Item .env.local.example .env.local
```

Edit `.env.local`:

- **Airbnb**: Listing → *Availability* → *Sync calendars* → copy the
  "Export calendar" link → `ICAL_URL_AIRBNB`
- **Booking.com**: Extranet → *Calendar* → *Sync calendars* → copy the
  iCal export URL → `ICAL_URL_BOOKING`

`.env.local` is gitignored — it never gets committed or deployed via git;
you'll re-enter these as Vercel environment variables in step 3.

### b) Booking request emails (Resend)

1. Create a free account at [resend.com](https://resend.com) (3,000
   emails/month free — plenty for booking requests).
2. Verify a sending domain under *Domains* (add the DNS records they give
   you at your domain registrar). Until you have a custom domain attached,
   you can send test emails from `onboarding@resend.dev`, but for real
   guest-facing acknowledgement emails you'll want your own verified
   domain.
3. Create an API key under *API Keys*.
4. Fill in `.env.local`:
   - `RESEND_API_KEY` — the key from step 3
   - `RESEND_FROM_EMAIL` — e.g. `"Patras Apartment <bookings@yourdomain.com>"`
   - `OWNER_NOTIFICATION_EMAIL` — your inbox, where new requests land

Every submitted request emails you the full details (dates, guest count,
name, email, phone, message) with **reply-to set to the guest's email**, so
you can just hit reply to respond. The guest also gets a short automatic
"we received your request" acknowledgement in their chosen language
(best-effort — if it fails, your notification still goes through).

### c) Text content (Greek & English)

Edit [`content/translations.ts`](content/translations.ts). Every visible
string lives in the `el` (Greek) and `en` (English) dictionaries there —
search for `TODO` to find every placeholder that needs your real copy
(description paragraphs, amenities list, location blurb, house rules).

Property facts that aren't language-specific (address, coordinates, contact
info, capacity, listing URLs, starting price) live in
[`content/siteConfig.ts`](content/siteConfig.ts) — also marked with `TODO`
where a real value is needed.

### d) Photos

See [`public/images/README.md`](public/images/README.md) — drop your real
photos into `public/images/` and list them in `content/siteConfig.ts`. The
first image becomes the hero banner and the social-share (Open Graph)
image.

---

## 2. Run it locally

```powershell
npm run dev
```

Open http://localhost:3000. Try both languages (EL/EN toggle, top right),
and check the availability calendar reflects your real Airbnb/Booking.com
bookings once the iCal URLs are set.

**Note on the 30-minute cache:** changes you make on Airbnb/Booking.com
won't appear instantly here — the server caches each feed for ~30 minutes
so the site isn't hammering those URLs on every visit. That's expected.

---

## 3. Deploy to Vercel (free tier)

1. Push this project to a GitHub repo (create one on GitHub, then
   `git remote add origin <url>` and `git push -u origin main` — see the
   git section below).
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, click
   **Add New → Project**, and import the repo. Vercel auto-detects Next.js;
   no build config changes needed.
3. Before the first deploy (or right after, then redeploy), add the same
   environment variables from your `.env.local` under **Project Settings →
   Environment Variables**:
   - `ICAL_URL_AIRBNB`
   - `ICAL_URL_BOOKING`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `OWNER_NOTIFICATION_EMAIL`
   - `NEXT_PUBLIC_SITE_URL` — set this to your real Vercel URL (e.g.
     `https://patras-apartment.vercel.app`) or your custom domain once you
     have one (step 4). This feeds the SEO/Open Graph tags and JSON-LD.
4. Deploy. Vercel gives you a free `*.vercel.app` subdomain immediately —
   that's a fully working URL you can share right away.

Every subsequent `git push` to your main branch auto-deploys.

---

## 4. Point a custom domain at it (later)

1. Buy a domain (e.g. from Namecheap, Google Domains successor Squarespace,
   or a Greek registrar for a `.gr`/`.com.gr`).
2. In Vercel: **Project Settings → Domains → Add**, enter your domain.
   Vercel shows you the DNS records to add (usually an `A` record to
   Vercel's IP, or a `CNAME` if using a subdomain).
3. Add those records at your domain registrar's DNS settings. Propagation
   is usually minutes to a few hours.
4. Update `NEXT_PUBLIC_SITE_URL` in Vercel's environment variables to the
   new domain and redeploy, so canonical URLs / Open Graph / JSON-LD point
   at the right place.
5. If you want the Resend "from" address on the same domain, verify it in
   Resend too (separate from Vercel's DNS setup, but often the same
   registrar dashboard).

---

## How the availability rule works

- **2-night minimum** by default.
- **Exception**: a 1-night request is allowed only if it exactly fills a
  1-night gap sitting between two existing bookings (mirrors the "orphan
  gap" rule from your PriceLabs setup). A 1-night request at the edge of
  the calendar (nothing booked on one side) is rejected.
- The same-day-turnover / weekday restriction is **not** enforced here on
  purpose — you handle that manually when you confirm each request by
  email.

This logic lives in [`lib/availability.ts`](lib/availability.ts)
(`evaluateBookingRange`) and is enforced **both** in the calendar UI and
again server-side when a request is submitted (so a stale browser tab can't
submit a request for dates someone else just booked).

---

## What's intentionally out of scope for v1

- Online payment / Stripe checkout — you arrange payment after manually
  confirming a request.
- Dynamic pricing — the site shows a static "from €X/night" figure
  (`priceFromEur` in `content/siteConfig.ts`).
- Multi-property support, guest accounts, reviews, messaging.
- An admin dashboard — Airbnb/Booking.com remain your source of truth for
  the calendar; this site only reads from them.

Reasonable next steps if you outgrow this later: log requests to a small
Supabase table for a searchable history, add basic rate-limiting on
`/api/request`, or add a real admin view. None of that is wired up now to
keep this lean.

---

## Project structure

```
app/
  page.tsx              Landing page (assembles all sections)
  layout.tsx             Root layout, metadata/OG defaults
  robots.ts, sitemap.ts  Basic SEO plumbing
  api/availability/      GET — merged busy ranges + calendar hints (cached)
  api/request/           POST — validates + emails a booking request
components/               UI building blocks (calendar, form, sections)
content/
  siteConfig.ts          Property facts (address, capacity, price, images…)
  translations.ts         All EL/EN copy — this is what you'll edit most
lib/
  ical.ts                 Fetches & parses the two iCal feeds
  availability.ts          Min-stay / orphan-gap booking rules
  resend.ts                Email client
```

---

## Git

This folder has already been initialized as a git repository with an
initial commit. To push it to GitHub:

```powershell
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```
