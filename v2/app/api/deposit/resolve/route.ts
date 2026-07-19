import {
  verifyDepositResolve,
  type DepositResolvePayload,
} from "@/lib/bookingToken";
import { capturePreauth, isDepositCaptureConfigured, releasePreauth } from "@/lib/viva";
import { getResendClient } from "@/lib/resend";
import { audit, getDeposit, saveDeposit } from "@/lib/bookingStore";
import { clientIp, firstExceeded, hashId } from "@/lib/rateLimit";
import { escHtml, ownerPage } from "@/lib/ownerHtml";
import { siteConfig } from "@/content/siteConfig";

// Owner-only: after checkout, RELEASE the deposit hold (no damage) or CAPTURE
// some/all of it (damage). GET shows a review page; POST performs the action.
// Reached from the signed link in the "deposit authorized" email.
//
// When the Payment-API capture credentials aren't configured, this can't act
// via the API — it tells the owner to resolve in the Viva portal instead and
// records nothing (so the portal stays the single source of truth).

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const p = await verifyDepositResolve(token);
  if (!p) return ownerPage("Invalid link", `<p>${INVALID}</p>`, 400);

  const already = await settledNotice(p.depositOrderCode);
  if (already) return already;

  const eur = (p.amountCents / 100).toFixed(2);
  const apiNote = isDepositCaptureConfigured()
    ? ""
    : `<p class="warn">API capture isn't configured — the buttons below won't act. Resolve this hold in the Viva portal (transaction ${escHtml(p.transactionId)}).</p>`;

  return ownerPage(
    "Resolve deposit",
    `
      <h1>Resolve the deposit hold</h1>
      <table>
        <tr><td>Guest</td><td><strong>${escHtml(p.name)}</strong> (${escHtml(p.email)})</td></tr>
        <tr><td>Dates</td><td>${p.checkin} → ${p.checkout}</td></tr>
        <tr><td>Held</td><td><strong>${eur}€</strong></td></tr>
        <tr><td>Transaction</td><td>${escHtml(p.transactionId)}</td></tr>
      </table>
      ${apiNote}
      <form method="POST" action="/api/deposit/resolve">
        <input type="hidden" name="token" value="${escHtml(token)}" />
        <input type="hidden" name="action" value="release" />
        <button type="submit" class="secondary">Release full hold (no damage)</button>
      </form>
      <form method="POST" action="/api/deposit/resolve">
        <input type="hidden" name="token" value="${escHtml(token)}" />
        <input type="hidden" name="action" value="capture" />
        <label>Capture <input type="number" name="amountEur" min="1" max="${(p.amountCents / 100).toString()}" step="1" value="${Math.floor(p.amountCents / 100)}" />€ for damages</label>
        <button type="submit">Capture this amount</button>
      </form>
      <p class="muted">Capturing charges the guest; releasing frees the hold. Do this promptly after checkout — holds expire on their own within days.</p>
    `
  );
}

export async function POST(req: Request) {
  const rl = await firstExceeded([
    { key: `deposit-resolve:ip:${hashId(clientIp(req))}:1m`, limit: 20, windowSec: 60 },
  ]);
  if (rl) {
    await audit("rate.limited", { endpoint: "deposit-resolve" });
    return ownerPage("Too many requests", `<p>Too many requests. Please wait a minute and try again.</p>`, 429);
  }

  const form = await req.formData().catch(() => null);
  const token = (form?.get("token") as string) ?? "";
  const action = (form?.get("action") as string) ?? "";
  const p = await verifyDepositResolve(token);
  if (!p) return ownerPage("Invalid link", `<p>${INVALID}</p>`, 400);

  const already = await settledNotice(p.depositOrderCode);
  if (already) return already;

  if (!isDepositCaptureConfigured()) {
    return ownerPage(
      "Resolve in Viva",
      `<p class="warn">API capture isn't configured on this site. Resolve this hold directly in the Viva portal — transaction <strong>${escHtml(
        p.transactionId
      )}</strong>, order ${escHtml(String(p.depositOrderCode))}.</p>`,
      503
    );
  }

  if (action === "release") {
    const res = await releasePreauth(p.transactionId, p.amountCents).catch((err) => {
      console.error("[deposit/resolve] release threw:", err);
      return { ok: false, status: 0, detail: String(err) };
    });
    if (!res.ok) {
      return ownerPage(
        "Release failed",
        `<p class="warn">${ACTION_FAILED}</p><p class="muted">Viva said: ${escHtml(
          res.detail || String(res.status)
        )}</p>`,
        502
      );
    }
    await markResolved(p, "released");
    await audit("deposit.released", { depositOrderCode: p.depositOrderCode });
    await notifyGuest(p, "released", 0);
    return ownerPage(
      "Released",
      `<h1>✓ Deposit hold released</h1><p>The ${(p.amountCents / 100).toFixed(
        2
      )}€ hold on ${escHtml(p.email)}'s card has been freed. Nothing was charged.</p>`
    );
  }

  if (action === "capture") {
    const eur = Number(form?.get("amountEur"));
    const captureCents = Math.round((Number.isFinite(eur) ? eur : 0) * 100);
    if (!captureCents || captureCents < 1 || captureCents > p.amountCents) {
      return ownerPage(
        "Invalid amount",
        `<p class="warn">Enter an amount between 1€ and ${(p.amountCents / 100).toFixed(
          2
        )}€.</p>`,
        400
      );
    }
    const res = await capturePreauth(p.transactionId, captureCents).catch((err) => {
      console.error("[deposit/resolve] capture threw:", err);
      return { ok: false, status: 0, detail: String(err) };
    });
    if (!res.ok) {
      return ownerPage(
        "Capture failed",
        `<p class="warn">${ACTION_FAILED}</p><p class="muted">Viva said: ${escHtml(
          res.detail || String(res.status)
        )}</p>`,
        502
      );
    }
    await markResolved(p, "captured", captureCents);
    await audit("deposit.captured", {
      depositOrderCode: p.depositOrderCode,
      capturedCents: captureCents,
    });
    await notifyGuest(p, "captured", captureCents);
    return ownerPage(
      "Captured",
      `<h1>✓ Deposit captured</h1><p>${(captureCents / 100).toFixed(2)}€ was charged from ${escHtml(
        p.email
      )}'s deposit hold${
        captureCents < p.amountCents ? " (the remainder is released)" : ""
      }.</p>`
    );
  }

  return ownerPage("Unknown action", `<p class="warn">${INVALID}</p>`, 400);
}

/** Returns an "already settled" page if the store shows it resolved, else null. */
async function settledNotice(depositOrderCode: number | string): Promise<Response | null> {
  const existing = await getDeposit(depositOrderCode).catch(() => null);
  if (existing && (existing.status === "captured" || existing.status === "released")) {
    return ownerPage(
      "Already resolved",
      `<p>This deposit was already <strong>${existing.status}</strong>${
        existing.resolvedAt ? ` on ${escHtml(existing.resolvedAt)}` : ""
      }.</p>`,
      409
    );
  }
  return null;
}

async function markResolved(
  p: DepositResolvePayload,
  status: "captured" | "released",
  capturedCents?: number
) {
  const existing = await getDeposit(p.depositOrderCode).catch(() => null);
  await saveDeposit(p.depositOrderCode, {
    bookingOrderCode: existing?.bookingOrderCode,
    checkin: p.checkin,
    checkout: p.checkout,
    email: p.email,
    name: p.name,
    lang: p.lang,
    amountCents: p.amountCents,
    status,
    transactionId: p.transactionId,
    capturedCents,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
  }).catch((err) => console.error("[deposit/resolve] saveDeposit failed:", err));
}

async function notifyGuest(
  p: DepositResolvePayload,
  outcome: "captured" | "released",
  capturedCents: number
) {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) return;
  const el = p.lang === "el";
  const amount = (capturedCents / 100).toFixed(2);
  const subject =
    outcome === "released"
      ? el
        ? "Η εγγύησή σας αποδεσμεύτηκε"
        : "Your deposit hold was released"
      : el
      ? "Χρέωση από την εγγύησή σας"
      : "A charge from your deposit";
  const html =
    outcome === "released"
      ? el
        ? `<p>Γεια σας ${escHtml(p.name)},</p><p>Η προέγκριση εγγύησης για την κράτησή σας (${p.checkin} → ${p.checkout}) αποδεσμεύτηκε πλήρως. Δεν έγινε καμία χρέωση.</p><p>${escHtml(siteConfig.name)}</p>`
        : `<p>Hi ${escHtml(p.name)},</p><p>The deposit hold for your stay (${p.checkin} → ${p.checkout}) has been fully released. Nothing was charged.</p><p>${escHtml(siteConfig.name)}</p>`
      : el
      ? `<p>Γεια σας ${escHtml(p.name)},</p><p>Χρεώσαμε <strong>${amount}€</strong> από την εγγύησή σας για την κράτηση (${p.checkin} → ${p.checkout}). Θα λάβετε ξεχωριστά τις λεπτομέρειες.</p><p>${escHtml(siteConfig.name)}</p>`
      : `<p>Hi ${escHtml(p.name)},</p><p>We charged <strong>${amount}€</strong> from your deposit for your stay (${p.checkin} → ${p.checkout}). We'll follow up separately with details.</p><p>${escHtml(siteConfig.name)}</p>`;
  try {
    await getResendClient().emails.send({ from: fromEmail, to: p.email, subject, html });
  } catch (err) {
    console.error("[deposit/resolve] guest notification failed:", err);
  }
}

const INVALID = "This link is invalid or has expired.";
const ACTION_FAILED = "Viva rejected the request. The hold may have already expired or been resolved.";
