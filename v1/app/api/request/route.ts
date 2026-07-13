import { NextResponse } from "next/server";
import { z } from "zod";
import { getRawBusyRanges } from "@/lib/ical";
import { evaluateBookingRange, mergeBusyRanges, nightsBetween } from "@/lib/availability";
import { getResendClient } from "@/lib/resend";
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

  const raw = await getRawBusyRanges();
  const merged = mergeBusyRanges(raw);
  const evaluation = evaluateBookingRange(data.checkin, data.checkout, merged);
  if (!evaluation.ok) {
    return NextResponse.json({ error: evaluation.reason }, { status: 409 });
  }

  const nights = nightsBetween(data.checkin, data.checkout);
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
      replyTo: data.email,
      subject: `New booking request: ${data.checkin} → ${data.checkout} (${nights} night${nights === 1 ? "" : "s"})`,
      html: `
        <h2>New booking request — ${siteConfig.name}</h2>
        <p><strong>Dates:</strong> ${data.checkin} → ${data.checkout} (${nights} night${nights === 1 ? "" : "s"})</p>
        <p><strong>Guests:</strong> ${data.guests}</p>
        <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(data.phone || "—")}</p>
        <p><strong>Language:</strong> ${data.lang}</p>
        <p><strong>Message:</strong><br/>${escapeHtml(data.message || "—").replace(/\n/g, "<br/>")}</p>
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
            body: `Γεια σας ${data.name},<br/><br/>Λάβαμε το αίτημα κράτησης για ${data.checkin} → ${data.checkout}. Θα επικοινωνήσουμε μαζί σας σύντομα για επιβεβαίωση.<br/><br/>${siteConfig.name}`,
          }
        : {
            subject: "We received your booking request",
            body: `Hi ${data.name},<br/><br/>We received your booking request for ${data.checkin} → ${data.checkout}. We'll get back to you shortly to confirm.<br/><br/>${siteConfig.name}`,
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
