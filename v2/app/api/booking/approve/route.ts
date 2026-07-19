import { verifyBooking, type BookingPayload } from "@/lib/bookingToken";
import { createPaymentOrder, isVivaConfigured } from "@/lib/viva";
import { quoteStay } from "@/lib/pricing";
import { getResendClient } from "@/lib/resend";
import { evaluateBookingRange, mergeBusyRanges, nightsBetween } from "@/lib/availability";
import { getRawBusyRanges } from "@/lib/ical";
import {
  audit,
  createHold,
  deleteHold,
  isStoreConfigured,
  savePendingOrder,
} from "@/lib/bookingStore";
import { clientIp, firstExceeded, hashId } from "@/lib/rateLimit";
import { siteConfig } from "@/content/siteConfig";

// Owner-facing approval endpoint reached from the button in the notification
// email. GET only *shows* a review page (no side effects, so link scanners
// can't trigger a charge); POST performs the approval: it re-checks that the
// dates are still free, places a short-lived hold so no one else can grab
// them, creates the Viva payment order, records the expected amount so the
// webhook can verify what's actually paid, and emails the guest the pay link.

// A hold must outlive Viva's payment window (1800s) with a little slack.
const HOLD_TTL_MS = 35 * 60 * 1000;

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const booking = await verifyBooking(token);
  if (!booking) return htmlPage("Invalid link", `<p>${INVALID}</p>`, 400);
  if (!isVivaConfigured()) return htmlPage("Payments off", `<p>${NOT_CONFIGURED}</p>`, 503);

  const quote = quoteStay(booking.checkin, booking.checkout, siteConfig.pricing);
  if (!quote) return htmlPage("Invalid dates", `<p>${INVALID}</p>`, 400);

  const nights = nightsBetween(booking.checkin, booking.checkout);
  return htmlPage(
    "Approve booking",
    `
      <h1>Approve this booking?</h1>
      <table>
        <tr><td>Guest</td><td><strong>${esc(booking.name)}</strong> (${esc(booking.email)})</td></tr>
        <tr><td>Dates</td><td>${booking.checkin} → ${booking.checkout} · ${nights} night${nights === 1 ? "" : "s"}</td></tr>
        <tr><td>Guests</td><td>${booking.guests}</td></tr>
        <tr><td>Total</td><td><strong>${quote.totalEur}€</strong> (full amount)</td></tr>
      </table>
      <form method="POST" action="/api/booking/approve">
        <input type="hidden" name="token" value="${esc(token)}" />
        <button type="submit">Confirm &amp; send payment link</button>
      </form>
      <p class="muted">This re-checks availability, holds the dates for 30 minutes, and emails ${esc(booking.email)} a Viva.com link to pay ${quote.totalEur}€.</p>
    `
  );
}

export async function POST(req: Request) {
  const rl = await firstExceeded([
    { key: `approve:ip:${hashId(clientIp(req))}:1m`, limit: 20, windowSec: 60 },
  ]);
  if (rl) {
    await audit("rate.limited", { endpoint: "approve" });
    return htmlPage("Too many requests", `<p>${TOO_MANY}</p>`, 429);
  }

  const form = await req.formData().catch(() => null);
  const token = (form?.get("token") as string) ?? "";
  const booking = await verifyBooking(token);
  if (!booking) return htmlPage("Invalid link", `<p>${INVALID}</p>`, 400);
  if (!isVivaConfigured()) return htmlPage("Payments off", `<p>${NOT_CONFIGURED}</p>`, 503);

  const quote = quoteStay(booking.checkin, booking.checkout, siteConfig.pricing);
  if (!quote) return htmlPage("Invalid dates", `<p>${INVALID}</p>`, 400);

  // Re-check availability at approval time — the dates were free when the guest
  // requested them, but a platform booking or another direct booking may have
  // taken them since. Without this, we could send a pay link for dates we can
  // no longer honour (→ refund + chargeback + angry guest).
  const merged = mergeBusyRanges(await getRawBusyRanges());
  const evaluation = evaluateBookingRange(booking.checkin, booking.checkout, merged, {
    horizonDays: siteConfig.calendarHorizonDays,
  });
  if (!evaluation.ok) {
    await audit("hold.conflict", {
      reason: evaluation.reason,
      checkin: booking.checkin,
      checkout: booking.checkout,
    });
    return htmlPage("No longer available", `<p>${unavailableMessage(evaluation.reason)}</p>`, 409);
  }

  // Place the hold BEFORE creating the order so a second overlapping approval
  // loses the race here rather than after money is on the line. When the store
  // is off we can't hold — we've at least done the availability re-check above.
  let holdId: string | undefined;
  if (isStoreConfigured()) {
    const id = await createHold(
      { checkin: booking.checkin, checkout: booking.checkout },
      HOLD_TTL_MS
    ).catch(() => null);
    if (!id) {
      await audit("hold.conflict", {
        reason: "hold-race",
        checkin: booking.checkin,
        checkout: booking.checkout,
      });
      return htmlPage("No longer available", `<p>${unavailableMessage("not-available")}</p>`, 409);
    }
    holdId = id;
  }

  let checkoutUrl: string;
  let orderCode: number;
  try {
    const order = await createPaymentOrder({
      amountEur: quote.totalEur,
      customerEmail: booking.email,
      customerName: booking.name,
      customerPhone: booking.phone,
      lang: booking.lang,
      // Pipe-delimited so the webhook can recover lang + dates + email for a
      // localized receipt (email addresses never contain "|"). Read back over
      // the authenticated transaction retrieve, never the public webhook body.
      merchantTrns: `${booking.lang}|${booking.checkin}|${booking.checkout}|${booking.email}`,
      customerTrns:
        booking.lang === "el"
          ? `Κράτηση ${siteConfig.name}: ${booking.checkin} → ${booking.checkout}`
          : `Booking ${siteConfig.name}: ${booking.checkin} → ${booking.checkout}`,
    });
    checkoutUrl = order.checkoutUrl;
    orderCode = order.orderCode;
  } catch (err) {
    console.error("[booking/approve] Viva order creation failed:", err);
    await deleteHold(holdId); // release the hold we just took
    return htmlPage("Payment error", `<p>${ORDER_FAILED}</p>`, 502);
  }

  // Record what we intend to charge so the webhook can verify the paid amount
  // against it and recover the trusted dates by order code.
  await savePendingOrder(orderCode, {
    checkin: booking.checkin,
    checkout: booking.checkout,
    expectedAmountCents: Math.round(quote.totalEur * 100),
    email: booking.email,
    name: booking.name,
    phone: booking.phone,
    guests: booking.guests,
    lang: booking.lang,
    holdId,
    createdAt: new Date().toISOString(),
  }).catch((err) => console.error("[booking/approve] savePendingOrder failed:", err));

  await audit("order.created", {
    orderCode,
    checkin: booking.checkin,
    checkout: booking.checkout,
    amountCents: Math.round(quote.totalEur * 100),
    heldWithStore: Boolean(holdId),
  });

  // Email the guest their pay link. If this fails, still show the owner the
  // link so they can forward it manually — the order already exists.
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  let guestEmailed = false;
  if (fromEmail) {
    try {
      const copy = guestEmailCopy(booking, quote.totalEur, checkoutUrl);
      await getResendClient().emails.send({
        from: fromEmail,
        to: booking.email,
        subject: copy.subject,
        html: copy.html,
      });
      guestEmailed = true;
    } catch (err) {
      console.error("[booking/approve] Guest payment email failed:", err);
    }
  }

  return htmlPage(
    "Approved",
    `
      <h1>✓ Booking approved</h1>
      <p>${
        guestEmailed
          ? `A payment link for <strong>${quote.totalEur}€</strong> was emailed to ${esc(booking.email)}.`
          : `Order created, but the guest email didn't send. Forward this link to ${esc(booking.email)}:`
      }</p>
      <p><a href="${esc(checkoutUrl)}">${esc(checkoutUrl)}</a></p>
      <p class="muted">Viva order code: ${orderCode}${
        holdId ? " · dates held for 30 min" : ""
      }</p>
    `
  );
}

function guestEmailCopy(booking: BookingPayload, amount: number, url: string) {
  const button = `
    <p style="margin:24px 0">
      <a href="${url}" style="display:inline-block;background:#c65a3a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600">
        ${booking.lang === "el" ? `Πληρωμή ${amount}€` : `Pay ${amount}€`}
      </a>
    </p>`;

  if (booking.lang === "el") {
    return {
      subject: `Η κράτησή σας επιβεβαιώθηκε — ολοκληρώστε την πληρωμή`,
      html: `
        <p>Γεια σας ${esc(booking.name)},</p>
        <p>Οι ημερομηνίες σας (${booking.checkin} → ${booking.checkout}) επιβεβαιώθηκαν. Για να οριστικοποιηθεί η κράτηση, ολοκληρώστε την πληρωμή <strong>${amount}€</strong> μέσω του ασφαλούς συνδέσμου Viva.com παρακάτω.</p>
        ${button}
        <p style="font-size:12px;color:#888888">Ο σύνδεσμος λήγει σε 30 λεπτά. Αν λήξει, απαντήστε σε αυτό το email για νέο.</p>
        <p>${esc(siteConfig.name)}</p>`,
    };
  }
  return {
    subject: `Your booking is confirmed — complete payment`,
    html: `
      <p>Hi ${esc(booking.name)},</p>
      <p>Your dates (${booking.checkin} → ${booking.checkout}) are confirmed. To finalize your booking, please complete payment of <strong>${amount}€</strong> via the secure Viva.com link below.</p>
      ${button}
      <p style="font-size:12px;color:#888888">This link expires in 30 minutes. If it lapses, just reply to this email for a fresh one.</p>
      <p>${esc(siteConfig.name)}</p>`,
  };
}

const INVALID = "This link is invalid or has expired.";
const NOT_CONFIGURED = "Payments are not configured on this site yet.";
const ORDER_FAILED = "Could not create the payment order. Please try again shortly.";
const TOO_MANY = "Too many requests. Please wait a minute and try again.";

function unavailableMessage(reason: string): string {
  switch (reason) {
    case "past-date":
      return "These dates are in the past and can no longer be booked.";
    case "too-far":
      return "These dates are beyond the bookable window.";
    case "min-stay":
      return "This stay no longer meets the minimum-nights rule.";
    default:
      return "These dates are no longer available — another booking took them since the request came in. Nothing was charged.";
  }
}

function esc(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlPage(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>${title} — ${esc(siteConfig.name)}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:48px auto;padding:0 20px;color:#1f2d2b;line-height:1.5}
        h1{font-size:22px}
        table{border-collapse:collapse;margin:16px 0;width:100%}
        td{padding:6px 10px;border-bottom:1px solid #eee;vertical-align:top}
        td:first-child{color:#888;width:90px}
        button{background:#c65a3a;color:#fff;border:0;border-radius:9999px;padding:12px 22px;font-weight:600;font-size:15px;cursor:pointer;margin-top:8px}
        a{color:#2a6570;word-break:break-all}
        .muted{color:#888;font-size:13px}
      </style></head><body>${body}</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
