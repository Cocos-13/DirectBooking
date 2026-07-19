import { NextResponse } from "next/server";
import { z } from "zod";
import { getRawBusyRanges } from "@/lib/ical";
import { evaluateBookingRange, mergeBusyRanges, nightsBetween } from "@/lib/availability";
import { audit } from "@/lib/bookingStore";
import { clientIp, firstExceeded, hashId } from "@/lib/rateLimit";
import { getResendClient } from "@/lib/resend";
import { quoteStay } from "@/lib/pricing";
import { isVivaConfigured } from "@/lib/viva";
import { isApprovalConfigured, signBooking } from "@/lib/bookingToken";
import { siteConfig } from "@/content/siteConfig";

const RequestSchema = z.object({
  name: z.string().trim().min(1, "required").max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid date"),
  checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid date"),
  guests: z.coerce.number().int().min(1).max(5),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  lang: z.enum(["el", "en"]).default("el"),
  // Explicit acceptance of Terms/House-Rules/Privacy. Must be literally true —
  // a missing/false value fails validation, so the server never processes a
  // request without recorded consent (defense-in-depth behind the UI checkbox).
  consent: z.literal(true),
  policyVersion: z.string().trim().max(40).optional(),
  // Honeypot: real visitors never fill this (it's visually hidden). Bots
  // that blindly fill every field will trip it.
  website: z.string().max(0).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-fields", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Honeypot tripped — pretend success, do nothing.
  if (data.website) {
    return NextResponse.json({ ok: true });
  }

  // Rate limiting: cap per-IP (abuse/floods) AND per-recipient-email. The
  // per-email cap is the key defense against using this endpoint to bomb a
  // victim's inbox with acknowledgement emails from our domain.
  const ip = clientIp(req);
  const exceeded = await firstExceeded([
    { key: `req:ip:${hashId(ip)}:10m`, limit: 5, windowSec: 600 },
    { key: `req:ip:${hashId(ip)}:1d`, limit: 40, windowSec: 86400 },
    { key: `req:email:${hashId(data.email.toLowerCase())}:1h`, limit: 4, windowSec: 3600 },
  ]);
  if (exceeded) {
    await audit("rate.limited", { endpoint: "request", scope: exceeded.key.split(":").slice(0, 2).join(":") });
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const raw = await getRawBusyRanges();
  const merged = mergeBusyRanges(raw);
  const evaluation = evaluateBookingRange(data.checkin, data.checkout, merged, {
    horizonDays: siteConfig.calendarHorizonDays,
  });
  if (!evaluation.ok) {
    return NextResponse.json({ error: evaluation.reason }, { status: 409 });
  }

  // Audit breadcrumb + consent evidence. No raw PII in the trail: the guest is
  // referenced by a one-way hash of their email, so a dispute ("did they accept
  // v2026-07-19 of the terms?") can be answered by re-hashing their email and
  // matching, without storing the address in the log.
  await audit("request.received", {
    checkin: data.checkin,
    checkout: data.checkout,
    guests: data.guests,
    consent: true,
    policyVersion: data.policyVersion || null,
    emailHash: hashId(data.email.toLowerCase()),
    ipHash: hashId(ip),
  });

  const nights = nightsBetween(data.checkin, data.checkout);
  const quote = quoteStay(data.checkin, data.checkout, siteConfig.pricing);
  const priceLine = quote
    ? `<p><strong>Estimated total:</strong> ${quote.totalEur}€ (${quote.weekdayNights} × ${quote.weekdayRateEur}€ weekday + ${quote.weekendNights} × ${quote.weekendRateEur}€ weekend)</p>`
    : "";

  // Owner-only "Approve" button: a signed link that, when clicked, creates a
  // Viva payment order and emails the guest the pay link. Only rendered when
  // payments are fully configured; otherwise the flow stays request-only.
  let approveBlock = "";
  if (quote && isVivaConfigured() && isApprovalConfigured()) {
    const token = await signBooking({
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      checkin: data.checkin,
      checkout: data.checkout,
      guests: data.guests,
      lang: data.lang,
    });
    const approveUrl = `${siteConfig.url}/api/booking/approve?token=${encodeURIComponent(token)}`;
    approveBlock = `
      <p style="margin:24px 0 8px">
        <a href="${approveUrl}" style="display:inline-block;background:#c65a3a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600">
          Approve &amp; send payment link — ${quote.totalEur}€
        </a>
      </p>
      <p style="font-size:12px;color:#888888;margin-top:0">
        Clicking confirms the dates and emails the guest a Viva.com link to pay the full amount. Only you received this email.
      </p>`;
  }

  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!ownerEmail || !fromEmail) {
    console.error("[api/request] Missing OWNER_NOTIFICATION_EMAIL or RESEND_FROM_EMAIL env vars");
    return NextResponse.json({ error: "server-not-configured" }, { status: 500 });
  }

  const resend = getResendClient();

  try {
    await resend.emails.send({
      from: fromEmail,
      to: ownerEmail,
      reply_to: data.email,
      subject: `New booking request: ${data.checkin} → ${data.checkout} (${nights} night${nights === 1 ? "" : "s"})`,
      html: `
        <h2>New booking request — ${siteConfig.name}</h2>
        <p><strong>Dates:</strong> ${data.checkin} → ${data.checkout} (${nights} night${nights === 1 ? "" : "s"})</p>
        <p><strong>Guests:</strong> ${data.guests}</p>
        ${priceLine}
        <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(data.phone || "—")}</p>
        <p><strong>Language:</strong> ${data.lang}</p>
        <p><strong>Message:</strong><br/>${escapeHtml(data.message || "—").replace(/\n/g, "<br/>")}</p>
        ${approveBlock}
      `,
    });
  } catch (err) {
    console.error("[api/request] Failed to send owner notification email:", err);
    return NextResponse.json({ error: "email-failed" }, { status: 502 });
  }

  // Best-effort guest acknowledgement — a failure here shouldn't fail the
  // whole request, the owner notification above already went out.
  try {
    const ack =
      data.lang === "el"
        ? {
            subject: "Λάβαμε το αίτημά σας",
            body: `Γεια σας ${escapeHtml(data.name)},<br/><br/>Λάβαμε το αίτημα κράτησης για ${data.checkin} → ${data.checkout}. Θα επικοινωνήσουμε μαζί σας σύντομα για επιβεβαίωση.<br/><br/>${escapeHtml(siteConfig.name)}`,
          }
        : {
            subject: "We received your booking request",
            body: `Hi ${escapeHtml(data.name)},<br/><br/>We received your booking request for ${data.checkin} → ${data.checkout}. We'll get back to you shortly to confirm.<br/><br/>${escapeHtml(siteConfig.name)}`,
          };

    await resend.emails.send({
      from: fromEmail,
      to: data.email,
      subject: ack.subject,
      html: ack.body,
    });
  } catch (err) {
    console.error("[api/request] Guest acknowledgement email failed (non-fatal):", err);
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
