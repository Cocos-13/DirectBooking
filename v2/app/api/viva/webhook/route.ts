import { NextResponse } from "next/server";
import { retrieveTransaction, type VivaTransaction } from "@/lib/viva";
import {
  audit,
  deleteHold,
  deletePendingOrder,
  getConfirmedBooking,
  getDeposit,
  getPendingOrder,
  saveConfirmedBooking,
  saveDeposit,
} from "@/lib/bookingStore";
import {
  isApprovalConfigured,
  signDepositResolve,
  signDepositSend,
} from "@/lib/bookingToken";
import { quoteStay } from "@/lib/pricing";
import { getResendClient } from "@/lib/resend";
import { siteConfig } from "@/content/siteConfig";

// Viva.com webhook endpoint.
//
// GET  — Viva's one-time verification handshake: it expects the account's
//        verification key echoed back as { "Key": "..." }.
// POST — the "Transaction Payment Created" event (EventTypeId 1796).
//
// Trust model: the POST body is public and unauthenticated, so the ONLY thing
// we take from it is the TransactionId. Everything a booking depends on —
// status, amount, order code, and the merchantTrns that carries the dates — is
// read back from Viva over an authenticated retrieve. We then verify the paid
// amount equals what we intended to charge before recording anything. This
// closes calendar-poisoning and receipt-spam via forged webhook bodies, and
// catches under/over-payment.

const EVENT_TRANSACTION_PAYMENT_CREATED = 1796;
const STATUS_SUCCESS = "F"; // Viva statusId "F" = finished/captured

export async function GET() {
  const key = process.env.VIVA_WEBHOOK_VERIFICATION_KEY;
  // Viva requires the key present to verify the endpoint; until it's set the
  // handshake simply won't complete, which is fine (payments not live yet).
  return NextResponse.json({ Key: key ?? "" });
}

interface VivaWebhookBody {
  EventTypeId?: number;
  EventData?: { TransactionId?: string };
}

export async function POST(req: Request) {
  let payload: VivaWebhookBody;
  try {
    payload = (await req.json()) as VivaWebhookBody;
  } catch {
    // Always 200 so Viva doesn't retry a malformed delivery forever.
    return NextResponse.json({ ok: true });
  }

  if (payload.EventTypeId !== EVENT_TRANSACTION_PAYMENT_CREATED) {
    return NextResponse.json({ ok: true }); // ignore unrelated events
  }

  const transactionId = payload.EventData?.TransactionId;
  if (!transactionId) return NextResponse.json({ ok: true });

  // Authoritative check: re-fetch the transaction from Viva with our creds.
  const tx = await retrieveTransaction(transactionId).catch(() => null);
  if (!tx || tx.statusId !== STATUS_SUCCESS) {
    return NextResponse.json({ ok: true });
  }

  const orderCode = tx.orderCode || 0;

  // A transaction with no order code can't be safely keyed/deduped — flag it
  // for the owner rather than guessing.
  if (!orderCode) {
    await audit("payment.amount_mismatch", { reason: "no-order-code", transactionId });
    await notifyOwnerUnmatched(tx.amount / 100, transactionId, "missing order code");
    return NextResponse.json({ ok: true });
  }

  // Deposit (pre-auth) orders are a separate flow: their amount is the deposit,
  // not the stay total, so they must be handled BEFORE the booking path (which
  // would flag the amount as a mismatch). Detect via the store record or the
  // "DEP|" merchantTrns marker (works even without a store).
  const depositRecord = await getDeposit(orderCode).catch(() => null);
  const depTrns = parseDepositTrns(tx.merchantTrns);
  if (depositRecord || depTrns) {
    await handleDepositAuthorized(orderCode, transactionId, tx, depositRecord, depTrns);
    return NextResponse.json({ ok: true });
  }

  // Idempotency: Viva may deliver the same event more than once.
  const existing = await getConfirmedBooking(orderCode).catch(() => null);
  if (existing) {
    await audit("payment.duplicate", { orderCode });
    return NextResponse.json({ ok: true });
  }

  // Resolve the trusted booking details. Prefer the pending order we recorded
  // at approval time; otherwise fall back to the merchantTrns from the
  // AUTHENTICATED transaction (still our own data, just without the store).
  const pending = await getPendingOrder(orderCode).catch(() => null);
  const fromTrns = parseMerchantTrns(tx.merchantTrns);

  const checkin = pending?.checkin || fromTrns.checkin;
  const checkout = pending?.checkout || fromTrns.checkout;
  const lang: "el" | "en" = pending?.lang || fromTrns.lang;
  const guestEmail = pending?.email || fromTrns.email || tx.email || "";
  const guestName = pending?.name || tx.fullName || "";

  // Without trusted dates we can't record or verify a booking — treat as an
  // unmatched payment and alert the owner instead of poisoning the calendar.
  if (!checkin || !checkout) {
    await audit("payment.amount_mismatch", { reason: "unresolvable-dates", orderCode });
    await notifyOwnerUnmatched(tx.amount / 100, transactionId, `order ${orderCode}, no dates`);
    return NextResponse.json({ ok: true });
  }

  // Amount integrity: what was paid must equal what we intended to charge.
  // Fail closed — if we can't establish an expected amount, we do NOT confirm.
  const expectedCents =
    pending?.expectedAmountCents ??
    (() => {
      const q = quoteStay(checkin, checkout, siteConfig.pricing);
      return q ? Math.round(q.totalEur * 100) : null;
    })();

  if (expectedCents == null) {
    await audit("payment.amount_mismatch", { reason: "no-expected-amount", orderCode, checkin, checkout });
    await notifyOwnerUnmatched(tx.amount / 100, transactionId, `order ${orderCode}, couldn't price ${checkin}→${checkout}`);
    return NextResponse.json({ ok: true });
  }

  if (tx.amount !== expectedCents) {
    await audit("payment.amount_mismatch", {
      orderCode,
      paidCents: tx.amount,
      expectedCents,
      checkin,
      checkout,
    });
    await notifyOwnerMismatch(tx.amount / 100, expectedCents / 100, checkin, checkout, orderCode);
    // Deliberately do NOT confirm/block the calendar on a mismatch.
    return NextResponse.json({ ok: true });
  }

  const amountEur = tx.amount / 100;

  // Persist the confirmed booking (blocks these dates on our calendar and in
  // the published feed). A store failure must not fail the webhook, but is
  // surfaced so the owner can block manually.
  try {
    await saveConfirmedBooking(orderCode, {
      checkin,
      checkout,
      guestName,
      guestEmail,
      amountCents: tx.amount,
      createdAt: new Date().toISOString(),
    });
    if (pending?.holdId) await deleteHold(pending.holdId);
    await deletePendingOrder(orderCode);
  } catch (err) {
    console.error("[viva/webhook] failed to persist booking:", err);
  }

  await audit("payment.confirmed", { orderCode, checkin, checkout, amountCents: tx.amount });

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!fromEmail) return NextResponse.json({ ok: true });

  const resend = getResendClient();

  // Notify the owner that money has landed — with a "send deposit hold link"
  // button they click 1–2 days before arrival.
  if (ownerEmail) {
    const depositButton = buildDepositSendButton(orderCode, guestEmail, guestName, lang, checkin, checkout);
    try {
      await resend.emails.send({
        from: fromEmail,
        to: ownerEmail,
        subject: `PAID ✓ ${amountEur}€ — ${checkin} → ${checkout}`,
        html: `
          <h2>Payment received — ${escapeHtml(siteConfig.name)}</h2>
          <p><strong>Amount:</strong> ${amountEur}€</p>
          <p><strong>Dates:</strong> ${checkin} → ${checkout}</p>
          <p><strong>Guest:</strong> ${escapeHtml(guestName)} (${escapeHtml(guestEmail || "—")})</p>
          <p><strong>Viva order:</strong> ${orderCode}</p>
          ${depositButton}
        `,
      });
    } catch (err) {
      console.error("[viva/webhook] owner paid-notification failed:", err);
    }
  }

  // Send the guest a receipt in their language.
  if (guestEmail) {
    try {
      const copy = receiptCopy(lang, guestName, checkin, checkout, amountEur);
      await resend.emails.send({ from: fromEmail, to: guestEmail, subject: copy.subject, html: copy.html });
    } catch (err) {
      console.error("[viva/webhook] guest receipt failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}

async function notifyOwnerMismatch(
  paidEur: number,
  expectedEur: number,
  checkin: string,
  checkout: string,
  orderCode: number
) {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!fromEmail || !ownerEmail) return;
  try {
    await getResendClient().emails.send({
      from: fromEmail,
      to: ownerEmail,
      subject: `⚠️ Payment amount mismatch — order ${orderCode}`,
      html: `
        <h2>Payment did NOT match the expected amount — not confirmed</h2>
        <p><strong>Paid:</strong> ${paidEur}€ &nbsp; <strong>Expected:</strong> ${expectedEur}€</p>
        <p><strong>Dates:</strong> ${checkin} → ${checkout}</p>
        <p><strong>Viva order:</strong> ${orderCode}</p>
        <p>The booking was <strong>not</strong> auto-confirmed and the calendar was not blocked. Review this transaction in the Viva portal before acting.</p>`,
    });
  } catch (err) {
    console.error("[viva/webhook] mismatch notification failed:", err);
  }
}

async function notifyOwnerUnmatched(paidEur: number, transactionId: string, note: string) {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!fromEmail || !ownerEmail) return;
  try {
    await getResendClient().emails.send({
      from: fromEmail,
      to: ownerEmail,
      subject: `⚠️ Unmatched payment — ${paidEur}€`,
      html: `
        <h2>A payment arrived that couldn't be matched to a booking</h2>
        <p><strong>Amount:</strong> ${paidEur}€</p>
        <p><strong>Transaction:</strong> ${escapeHtml(transactionId)}</p>
        <p><strong>Note:</strong> ${escapeHtml(note)}</p>
        <p>No booking was recorded. Check the Viva portal and reconcile manually.</p>`,
    });
  } catch (err) {
    console.error("[viva/webhook] unmatched notification failed:", err);
  }
}

function parseMerchantTrns(value: string | undefined) {
  const parts = (value ?? "").split("|");
  const lang = parts[0] === "en" ? "en" : "el";
  return {
    lang: lang as "el" | "en",
    checkin: parts[1] ?? "",
    checkout: parts[2] ?? "",
    email: parts[3] ?? "",
  };
}

// Deposit orders carry a "DEP|lang|checkin|checkout|email|bookingOrderCode"
// merchantTrns. Returns null for anything that isn't a deposit order.
function parseDepositTrns(value: string | undefined) {
  const parts = (value ?? "").split("|");
  if (parts[0] !== "DEP") return null;
  const lang = parts[1] === "en" ? "en" : "el";
  return {
    lang: lang as "el" | "en",
    checkin: parts[2] ?? "",
    checkout: parts[3] ?? "",
    email: parts[4] ?? "",
    bookingOrderCode: parts[5] ?? "",
  };
}

/** Seconds from now until `checkout` (YYYY-MM-DD) plus a buffer; floored at 1h. */
function secondsUntilCheckout(checkout: string, extraDays: number): number {
  const end = Date.parse(`${checkout}T00:00:00Z`);
  if (Number.isNaN(end)) return extraDays * 86400;
  return Math.max(3600, Math.floor((end - Date.now()) / 1000) + extraDays * 86400);
}

/** Signed "Send deposit hold link" button for the owner's PAID email. */
function buildDepositSendButton(
  bookingOrderCode: number,
  guestEmail: string,
  guestName: string,
  lang: "el" | "en",
  checkin: string,
  checkout: string
): string {
  const amount = siteConfig.deposit.amountEur;
  if (!amount || !guestEmail || !isApprovalConfigured()) return "";

  // Valid through checkout + a few days so the owner can send it near arrival.
  const ttl = secondsUntilCheckout(checkout, 3);
  const token = signDepositSend(
    { bookingOrderCode, email: guestEmail, name: guestName, checkin, checkout, lang },
    ttl
  );
  const url = `${siteConfig.url}/api/deposit/send?token=${encodeURIComponent(token)}`;
  return `
    <p style="margin:20px 0 6px">
      <a href="${url}" style="display:inline-block;background:#2a6570;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:9999px;font-weight:600">
        Send ${amount}€ deposit hold link
      </a>
    </p>
    <p style="font-size:12px;color:#888888;margin-top:0">Click this 1–2 days before check-in — pre-auth holds expire within days.</p>`;
}

/**
 * Records a deposit pre-auth the guest just authorized, and emails the owner a
 * signed "Release / Capture" link. Never blocks the calendar — a deposit isn't
 * a stay booking.
 */
async function handleDepositAuthorized(
  orderCode: number,
  transactionId: string,
  tx: VivaTransaction,
  existing: Awaited<ReturnType<typeof getDeposit>>,
  fromTrns: ReturnType<typeof parseDepositTrns>
) {
  // Idempotency: only act on the first authorization delivery.
  if (existing && existing.status !== "link-sent") {
    await audit("payment.duplicate", { orderCode, kind: "deposit" });
    return;
  }

  const checkin = existing?.checkin || fromTrns?.checkin || "";
  const checkout = existing?.checkout || fromTrns?.checkout || "";
  const email = existing?.email || fromTrns?.email || tx.email || "";
  const name = existing?.name || tx.fullName || "";
  const lang: "el" | "en" = existing?.lang || fromTrns?.lang || "el";
  const amountCents = tx.amount; // authoritative authorized hold amount

  await saveDeposit(orderCode, {
    bookingOrderCode: existing?.bookingOrderCode || fromTrns?.bookingOrderCode,
    checkin,
    checkout,
    email,
    name,
    lang,
    amountCents,
    status: "authorized",
    transactionId,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  }).catch((err) => console.error("[viva/webhook] saveDeposit failed:", err));

  await audit("deposit.authorized", { depositOrderCode: orderCode, amountCents });

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!fromEmail || !ownerEmail || !isApprovalConfigured()) return;

  const ttl = secondsUntilCheckout(checkout, 30);
  const token = signDepositResolve(
    { depositOrderCode: orderCode, transactionId, amountCents, email, name, checkin, checkout, lang },
    ttl
  );
  const url = `${siteConfig.url}/api/deposit/resolve?token=${encodeURIComponent(token)}`;
  try {
    await getResendClient().emails.send({
      from: fromEmail,
      to: ownerEmail,
      subject: `Deposit hold placed ✓ ${(amountCents / 100).toFixed(2)}€ — ${checkin} → ${checkout}`,
      html: `
        <h2>Deposit hold authorized — ${escapeHtml(siteConfig.name)}</h2>
        <p><strong>Held:</strong> ${(amountCents / 100).toFixed(2)}€</p>
        <p><strong>Dates:</strong> ${checkin} → ${checkout}</p>
        <p><strong>Guest:</strong> ${escapeHtml(name)} (${escapeHtml(email || "—")})</p>
        <p style="margin:20px 0 6px">
          <a href="${url}" style="display:inline-block;background:#c65a3a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:9999px;font-weight:600">
            Release or capture this hold
          </a>
        </p>
        <p style="font-size:12px;color:#888888;margin-top:0">Do this promptly after checkout — pre-auth holds expire within days.</p>`,
    });
  } catch (err) {
    console.error("[viva/webhook] deposit-authorized owner email failed:", err);
  }
}

function receiptCopy(lang: "el" | "en", name: string, checkin: string, checkout: string, amount: number) {
  if (lang === "el") {
    return {
      subject: "Λάβαμε την πληρωμή σας — η κράτηση επιβεβαιώθηκε",
      html: `
        <p>Γεια σας ${escapeHtml(name)},</p>
        <p>Λάβαμε την πληρωμή σας <strong>${amount}€</strong>. Η κράτησή σας για ${checkin} → ${checkout} είναι επιβεβαιωμένη.</p>
        <p>Θα επικοινωνήσουμε μαζί σας με τις οδηγίες άφιξης πριν την ημερομηνία check-in.</p>
        <p>${escapeHtml(siteConfig.name)}</p>`,
    };
  }
  return {
    subject: "Payment received — your booking is confirmed",
    html: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>We've received your payment of <strong>${amount}€</strong>. Your booking for ${checkin} → ${checkout} is confirmed.</p>
      <p>We'll be in touch with arrival instructions before your check-in date.</p>
      <p>${escapeHtml(siteConfig.name)}</p>`,
  };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
