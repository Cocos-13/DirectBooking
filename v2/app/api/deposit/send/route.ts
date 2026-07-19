import { verifyDepositSend } from "@/lib/bookingToken";
import { createPaymentOrder, isVivaConfigured } from "@/lib/viva";
import { getResendClient } from "@/lib/resend";
import { audit, saveDeposit } from "@/lib/bookingStore";
import { clientIp, firstExceeded, hashId } from "@/lib/rateLimit";
import { escHtml, ownerPage } from "@/lib/ownerHtml";
import { siteConfig } from "@/content/siteConfig";

// Owner-only: send the guest a refundable-deposit HOLD link shortly before
// arrival. GET shows a review page (no side effect); POST creates a pre-auth
// Smart Checkout order and emails the guest the hold link. Reached from the
// signed "Send deposit hold link" button in the PAID confirmation email.

// The guest should authorize the hold within a couple of days of arrival; a
// pre-auth held too long simply falls off the card.
const DEPOSIT_LINK_TIMEOUT_SEC = 48 * 60 * 60;

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const p = verifyDepositSend(token);
  if (!p) return ownerPage("Invalid link", `<p>${INVALID}</p>`, 400);
  const amount = siteConfig.deposit.amountEur;
  if (!amount || !isVivaConfigured()) {
    return ownerPage("Unavailable", `<p>${NOT_CONFIGURED}</p>`, 503);
  }

  return ownerPage(
    "Send deposit hold",
    `
      <h1>Send the deposit hold link?</h1>
      <table>
        <tr><td>Guest</td><td><strong>${escHtml(p.name)}</strong> (${escHtml(p.email)})</td></tr>
        <tr><td>Dates</td><td>${p.checkin} → ${p.checkout}</td></tr>
        <tr><td>Hold amount</td><td><strong>${amount}€</strong> (refundable pre-authorization)</td></tr>
      </table>
      <form method="POST" action="/api/deposit/send">
        <input type="hidden" name="token" value="${escHtml(token)}" />
        <button type="submit">Email ${escHtml(p.email)} a ${amount}€ hold link</button>
      </form>
      <p class="muted">This places a temporary hold (not a charge) on the guest's card. Send it 1–2 days before check-in — holds expire on their own within a few days.</p>
    `
  );
}

export async function POST(req: Request) {
  const rl = await firstExceeded([
    { key: `deposit-send:ip:${hashId(clientIp(req))}:1m`, limit: 20, windowSec: 60 },
  ]);
  if (rl) {
    await audit("rate.limited", { endpoint: "deposit-send" });
    return ownerPage("Too many requests", `<p>${TOO_MANY}</p>`, 429);
  }

  const form = await req.formData().catch(() => null);
  const token = (form?.get("token") as string) ?? "";
  const p = verifyDepositSend(token);
  if (!p) return ownerPage("Invalid link", `<p>${INVALID}</p>`, 400);

  const amount = siteConfig.deposit.amountEur;
  if (!amount || !isVivaConfigured()) {
    return ownerPage("Unavailable", `<p>${NOT_CONFIGURED}</p>`, 503);
  }

  let checkoutUrl: string;
  let orderCode: number;
  try {
    const order = await createPaymentOrder({
      amountEur: amount,
      customerEmail: p.email,
      customerName: p.name,
      customerPhone: p.phone,
      lang: p.lang,
      isPreAuth: true,
      paymentTimeoutSec: DEPOSIT_LINK_TIMEOUT_SEC,
      // "DEP|" marks this order as a deposit hold so the webhook never mistakes
      // it for a stay payment (its amount differs from the stay total).
      merchantTrns: `DEP|${p.lang}|${p.checkin}|${p.checkout}|${p.email}|${p.bookingOrderCode}`,
      customerTrns:
        p.lang === "el"
          ? `Εγγύηση (προέγκριση) ${siteConfig.name}: ${p.checkin} → ${p.checkout}`
          : `Refundable deposit hold ${siteConfig.name}: ${p.checkin} → ${p.checkout}`,
    });
    checkoutUrl = order.checkoutUrl;
    orderCode = order.orderCode;
  } catch (err) {
    console.error("[deposit/send] Viva pre-auth order creation failed:", err);
    return ownerPage("Payment error", `<p>${ORDER_FAILED}</p>`, 502);
  }

  await saveDeposit(orderCode, {
    bookingOrderCode: p.bookingOrderCode,
    checkin: p.checkin,
    checkout: p.checkout,
    email: p.email,
    name: p.name,
    lang: p.lang,
    amountCents: Math.round(amount * 100),
    status: "link-sent",
    createdAt: new Date().toISOString(),
  }).catch((err) => console.error("[deposit/send] saveDeposit failed:", err));

  await audit("deposit.link_sent", {
    depositOrderCode: orderCode,
    bookingOrderCode: p.bookingOrderCode,
    amountCents: Math.round(amount * 100),
  });

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  let emailed = false;
  if (fromEmail) {
    try {
      const copy = guestHoldEmail(p.lang, p.name, p.checkin, p.checkout, amount, checkoutUrl);
      await getResendClient().emails.send({
        from: fromEmail,
        to: p.email,
        subject: copy.subject,
        html: copy.html,
      });
      emailed = true;
    } catch (err) {
      console.error("[deposit/send] guest hold email failed:", err);
    }
  }

  return ownerPage(
    "Hold link sent",
    `
      <h1>✓ Deposit hold link ${emailed ? "sent" : "created"}</h1>
      <p>${
        emailed
          ? `A ${amount}€ hold link was emailed to ${escHtml(p.email)}.`
          : `Order created, but the guest email didn't send. Forward this link to ${escHtml(p.email)}:`
      }</p>
      <p><a href="${escHtml(checkoutUrl)}">${escHtml(checkoutUrl)}</a></p>
      <p class="muted">Deposit order code: ${orderCode}. When the guest authorizes it, you'll get a "Release / Capture" email.</p>
    `
  );
}

function guestHoldEmail(
  lang: "el" | "en",
  name: string,
  checkin: string,
  checkout: string,
  amount: number,
  url: string
) {
  const button = `
    <p style="margin:24px 0">
      <a href="${url}" style="display:inline-block;background:#c65a3a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600">
        ${lang === "el" ? `Έγκριση εγγύησης ${amount}€` : `Authorize ${amount}€ hold`}
      </a>
    </p>`;

  if (lang === "el") {
    return {
      subject: `Προέγκριση εγγύησης για την κράτησή σας (${amount}€)`,
      html: `
        <p>Γεια σας ${escHtml(name)},</p>
        <p>Πριν την άφιξή σας (${checkin} → ${checkout}) ζητάμε μια <strong>επιστρεφόμενη εγγύηση ${amount}€</strong> ως προέγκριση στην κάρτα σας. <strong>Δεν είναι χρέωση</strong> — είναι μια προσωρινή δέσμευση που αποδεσμεύεται μετά την αναχώρηση, εφόσον δεν υπάρχουν ζημιές.</p>
        ${button}
        <p style="font-size:12px;color:#888888">Ο σύνδεσμος λήγει σε 48 ώρες.</p>
        <p>${escHtml(siteConfig.name)}</p>`,
    };
  }
  return {
    subject: `Refundable deposit hold for your booking (${amount}€)`,
    html: `
      <p>Hi ${escHtml(name)},</p>
      <p>Before your arrival (${checkin} → ${checkout}) we ask for a <strong>refundable ${amount}€ deposit</strong> as a hold on your card. <strong>This is not a charge</strong> — it's a temporary authorization that is released after checkout, provided there's no damage.</p>
      ${button}
      <p style="font-size:12px;color:#888888">This link expires in 48 hours.</p>
      <p>${escHtml(siteConfig.name)}</p>`,
  };
}

const INVALID = "This link is invalid or has expired.";
const NOT_CONFIGURED = "The deposit flow isn't enabled on this site.";
const ORDER_FAILED = "Could not create the deposit hold. Please try again shortly.";
const TOO_MANY = "Too many requests. Please wait a minute and try again.";
