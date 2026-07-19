import { NextResponse } from "next/server";
import { retrieveTransaction } from "@/lib/viva";
import { getResendClient } from "@/lib/resend";
import { siteConfig } from "@/content/siteConfig";

// Viva.com webhook endpoint.
//
// GET  — Viva's one-time verification handshake: it expects the account's
//        verification key echoed back as { "Key": "..." }.
// POST — the "Transaction Payment Created" event (EventTypeId 1796). Since
//        webhook bodies are public and unauthenticated, we re-fetch the
//        transaction from Viva with our own credentials and trust THAT, not
//        the POST body, before marking a booking paid.

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
  EventData?: {
    TransactionId?: string;
    OrderCode?: number;
    Amount?: number;
    MerchantTrns?: string;
    Email?: string;
    FullName?: string;
  };
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

  // Authoritative check: re-fetch the transaction from Viva.
  const tx = await retrieveTransaction(transactionId).catch(() => null);
  if (!tx || tx.statusId !== STATUS_SUCCESS) {
    return NextResponse.json({ ok: true });
  }

  const amountEur = tx.amount / 100;
  const { lang, checkin, checkout, email } = parseMerchantTrns(payload.EventData?.MerchantTrns);
  const guestEmail = email || tx.email || payload.EventData?.Email;
  const guestName = tx.fullName || payload.EventData?.FullName || "";
  const orderCode = tx.orderCode || payload.EventData?.OrderCode || 0;

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!fromEmail) return NextResponse.json({ ok: true });

  const resend = getResendClient();

  // Notify the owner that money has landed.
  if (ownerEmail) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: ownerEmail,
        subject: `PAID ✓ ${amountEur}€ — ${checkin || "?"} → ${checkout || "?"}`,
        html: `
          <h2>Payment received — ${escapeHtml(siteConfig.name)}</h2>
          <p><strong>Amount:</strong> ${amountEur}€</p>
          <p><strong>Dates:</strong> ${checkin || "—"} → ${checkout || "—"}</p>
          <p><strong>Guest:</strong> ${escapeHtml(guestName)} (${escapeHtml(guestEmail || "—")})</p>
          <p><strong>Viva order:</strong> ${orderCode}</p>
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

function parseMerchantTrns(value: string | undefined) {
  const parts = (value ?? "").split("|");
  const lang = parts[0] === "en" ? "en" : "el";
  return { lang: lang as "el" | "en", checkin: parts[1] ?? "", checkout: parts[2] ?? "", email: parts[3] ?? "" };
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
