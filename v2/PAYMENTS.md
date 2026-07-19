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

- The Approve button is an **HMAC-signed link**. Only your inbox receives it, so
  only you can approve — no login/admin panel needed.
- Clicking the link only **shows a review page** (GET). The charge is created on
  **Confirm** (POST), so email/link scanners can't trigger a payment.
- The webhook body is public and unauthenticated, so it is **never trusted
  directly** — the server re-fetches the transaction from Viva with our own
  credentials and checks status + amount before marking anything paid.

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

## Where the code lives

| File | Responsibility |
| --- | --- |
| `lib/viva.ts` | OAuth2 token, create order, retrieve transaction; demo/prod hosts |
| `lib/bookingToken.ts` | HMAC sign/verify of the Approve link |
| `lib/pricing.ts` | `quoteStay()` — the amount charged (recomputed from dates) |
| `app/api/request/route.ts` | Adds the signed Approve button to the owner email |
| `app/api/booking/approve/route.ts` | Review page (GET) + create order & email guest (POST) |
| `app/api/viva/webhook/route.ts` | Verification handshake + payment confirmation |
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
