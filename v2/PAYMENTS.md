# Payments (Viva.com Smart Checkout)

This site takes payment **after you confirm a booking**, for the **full amount**,
via Viva.com Smart Checkout. Everything is **config-gated**: with none of the
`VIVA_*` variables set, payments are off and the site stays request-only (no
"Approve" button appears). Fill the variables in to switch the flow on.

## The flow

```
Guest submits a request
  → you receive the notification email, now with an
    "Approve & send payment link — €X" button (only you get this email)
  → you click it → a review page opens → you press "Confirm"
  → a Viva payment order is created for the full amount
  → the guest is emailed a hosted Viva checkout link
  → guest pays on Viva → redirected to /booking/success (or /booking/failure)
  → Viva fires a webhook → the server re-verifies the transaction with Viva
  → you get a "PAID ✓" email; the guest gets a localized receipt
```

**Why it's safe**

- The Approve button is an **HMAC-signed link** that **expires after 7 days**.
  Only your inbox receives it, so only you can approve — no login/admin panel
  needed. A stale or altered link is inert.
- Clicking the link only **shows a review page** (GET). The charge is created on
  **Confirm** (POST), so email/link scanners can't trigger a payment.
- **Confirm re-checks availability** against the live calendar (platforms +
  direct bookings + holds) and, when the store is configured, **places a
  ~30-minute hold** on the dates before creating the order — so the same nights
  can't be sold to a second guest during the payment window.
- The webhook body is public and unauthenticated, so **only the `TransactionId`
  is taken from it**. Status, amount, order code, and the dates (`merchantTrns`)
  are read back from Viva over an **authenticated retrieve**. The paid amount is
  then **verified against the amount we recorded at approval time**; a mismatch
  or an unmatchable payment **alerts you and is NOT auto-confirmed** (the
  calendar is never blocked on unverified money). Confirmation is **idempotent**
  by order code, so retried webhook deliveries don't double-book or double-email.

> **Store note:** holds, amount verification against the recorded order, and the
> audit trail need the KV store (below). With no store the webhook still refuses
> to trust the wire — it verifies the amount by re-quoting the dates from the
> *authenticated* transaction — but it can't place holds (it relies on the
> availability re-check alone) and can't dedupe repeated deliveries.

## Setup checklist

### 1. Get your Viva credentials

In the Viva self-care portal (start in the **demo** portal, `demo.vivapayments.com`):

- [ ] **Smart Checkout credentials** — `client_id` + `client_secret`
      (Settings → API Access → *Smart Checkout Credentials*)
- [ ] **Source code** — create/using a payment source
      (Sales → Websites/Apps → your source). Note its numeric **Source Code**.
- [ ] **Webhook verification key** — the key Viva returns for webhook
      verification (Settings → API Access / webhooks).

### 2. Set environment variables

Add these to `.env.local` (local) and to your host's env (production). See
`.env.local.example` for the annotated list.

| Variable | What it is |
| --- | --- |
| `VIVA_ENV` | `demo` (default) or `production` |
| `VIVA_CLIENT_ID` | Smart Checkout OAuth2 client id |
| `VIVA_CLIENT_SECRET` | Smart Checkout OAuth2 client secret |
| `VIVA_SOURCE_CODE` | Payment source code |
| `VIVA_WEBHOOK_VERIFICATION_KEY` | Key echoed on Viva's webhook verification |
| `BOOKING_APPROVAL_SECRET` | Secret for signing the Approve button. Generate with `openssl rand -base64 32` |

These are also required (already used elsewhere on the site):

| Variable | What it is |
| --- | --- |
| `RESEND_API_KEY` | Sends the emails (owner + guest) |
| `RESEND_FROM_EMAIL` | Verified "From" address |
| `OWNER_NOTIFICATION_EMAIL` | Where the request + PAID notices go |
| `NEXT_PUBLIC_SITE_URL` | Public base URL; used to build the Approve link |

> Payments turn on only when `VIVA_CLIENT_ID`, `VIVA_CLIENT_SECRET`,
> `VIVA_SOURCE_CODE` **and** `BOOKING_APPROVAL_SECRET` are all set.

### 3. Configure the Viva source

On the payment **source** used above, set:

- [ ] **Success URL** → `https://YOUR_SITE/booking/success`
- [ ] **Failure URL** → `https://YOUR_SITE/booking/failure`

### 4. Configure the webhook

- [ ] Add a webhook pointing to `https://YOUR_SITE/api/viva/webhook`
- [ ] Event type: **Transaction Payment Created** (id `1796`)
- [ ] Save — Viva does a one-time GET verification; the endpoint answers with
      your `VIVA_WEBHOOK_VERIFICATION_KEY`, so set that variable first.

### 5. Deploy (required for a real payment)

Viva's webhook and success/failure redirects **cannot reach `localhost`**, so a
full end-to-end payment only works once the site is deployed on **HTTPS**. You
can build/typecheck locally, but the first real payment must be tested on the
deployed URL.

### 6. Test in demo

- [ ] Submit a booking request on the site.
- [ ] Open the owner email, click **Approve & send payment link**, then **Confirm**.
- [ ] Open the guest email, pay with a **Viva demo test card**.
- [ ] Confirm you land on `/booking/success`, and that the **PAID ✓** owner email
      and guest receipt arrive.

### 7. Go live

- [ ] Repeat steps 1–4 with **production** Viva credentials.
- [ ] Set `VIVA_ENV=production`.
- [ ] Do one small real transaction to confirm, then refund it if desired.

## Refundable deposit (card pre-authorization)

The stay is paid in full up front; the damage deposit is a **separate refundable
hold** (`content/siteConfig.ts` → `deposit.amountEur`, `0` disables it). A
pre-auth hold falls off a card within days, so it is placed **near arrival**,
not at booking:

```
Guest pays the stay  →  PAID email to owner now includes a
  "Send €X deposit hold link" button
    → owner clicks it 1–2 days before check-in → review page → Confirm
    → a Viva PRE-AUTH order is created; guest is emailed a hold link
    → guest authorizes on Viva (a hold, not a charge)
    → webhook records it and emails the owner a "Release / Capture" link
  after checkout:
    → owner clicks Release (no damage) or Capture €N (damage)
```

- The deposit order is tagged `DEP|…` in `merchantTrns` and tracked separately,
  so the webhook never mistakes the (different) deposit amount for the stay
  total.
- **Release/Capture needs extra credentials** — Viva's Payment API uses Basic
  auth (`VIVA_MERCHANT_ID` + `VIVA_API_KEY`), and *Settings → API Access → "Allow
  …pre-auth captures via API"* must be enabled. **Without them the owner still
  sends holds but resolves them in the Viva portal** (the resolve page says so).
- The guest is emailed when the hold is released or captured.

## Where the code lives

| File | Responsibility |
| --- | --- |
| `lib/viva.ts` | OAuth2 token, create order, retrieve transaction, pre-auth capture/release; demo/prod hosts |
| `lib/bookingToken.ts` | HMAC sign/verify of the owner action links (approve, deposit send/resolve), typed by `kind` + expiry |
| `lib/bookingStore.ts` | Confirmed bookings, holds, pending orders, deposits, audit log (KV; no-op without creds) |
| `lib/pricing.ts` | `quoteStay()` — the amount charged (recomputed from dates) |
| `app/api/request/route.ts` | Adds the signed Approve button to the owner email; server-side date bounds |
| `app/api/booking/approve/route.ts` | Review page (GET) + availability re-check, hold, create order, email guest (POST) |
| `app/api/deposit/send/route.ts` | Owner review (GET) + create pre-auth hold & email guest (POST) |
| `app/api/deposit/resolve/route.ts` | Owner review (GET) + release/capture the hold (POST) |
| `app/api/viva/webhook/route.ts` | Verification handshake + amount-verified payment confirmation + deposit authorization |
| `app/booking/success` · `app/booking/failure` | Guest landing pages |

## Troubleshooting

- **No Approve button in the email** → one of `VIVA_CLIENT_ID`,
  `VIVA_CLIENT_SECRET`, `VIVA_SOURCE_CODE`, `BOOKING_APPROVAL_SECRET` is unset.
- **Approve page says "Payments are not configured"** → the three `VIVA_*`
  credential vars aren't all present in the running environment.
- **"Invalid or expired link"** → `BOOKING_APPROVAL_SECRET` changed after the
  email was sent, or the link was altered. Re-submit the request.
- **Webhook verification fails in Viva** → `VIVA_WEBHOOK_VERIFICATION_KEY` is
  wrong/unset, or the site isn't reachable over HTTPS yet.
- **Guest paid but no PAID email** → check the deployed logs for
  `[viva/webhook]`; confirm the webhook event is `1796` and the URL is correct.
