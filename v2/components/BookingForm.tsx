"use client";

import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";
import { quoteStay } from "@/lib/pricing";

interface Props {
  range: DateRange | undefined;
  rangeValid: boolean;
}

type Status = "idle" | "submitting" | "success" | "error";

export function BookingForm({ range, rangeValid }: Props) {
  const { t, lang } = useLanguage();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!range?.from || !range?.to || !rangeValid || !consent) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          guests: formData.get("guests"),
          message: formData.get("message"),
          website: formData.get("website"), // honeypot
          checkin: format(range.from, "yyyy-MM-dd"),
          checkout: format(range.to, "yyyy-MM-dd"),
          lang,
          consent: true,
          policyVersion: siteConfig.policyVersion,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(mapError(body.error, t));
        setStatus("error");
        return;
      }

      setStatus("success");
      form.reset();
    } catch {
      setErrorMessage(t.form.errorGeneric);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-aegean-200 bg-aegean-50 p-6 text-aegean-900 dark:border-aegean-500/25 dark:bg-aegean-500/10 dark:text-ink-text">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aegean-600 text-white dark:bg-aegean-500">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <h3 className="text-lg font-bold">{t.form.successHeading}</h3>
        </div>

        <ol className="mt-4 space-y-2">
          {t.form.successSteps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-aegean-900/80 dark:text-ink-text/80">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-aegean-200 text-xs font-semibold text-aegean-900 dark:bg-aegean-500/25 dark:text-ink-text">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 border-t border-aegean-200 pt-4 text-sm text-aegean-900/80 dark:border-aegean-500/25 dark:text-ink-text/80">
          <p>{t.form.successContact}</p>
          <p className="mt-1 space-x-3">
            <a href={`mailto:${siteConfig.contact.email}`} className="font-medium text-aegean-700 underline underline-offset-2 hover:text-aegean-900 dark:text-aegean-200 dark:hover:text-ink-text">
              {siteConfig.contact.email}
            </a>
            <a href={`tel:${siteConfig.contact.phone.replace(/\s+/g, "")}`} className="font-medium text-aegean-700 underline underline-offset-2 hover:text-aegean-900 dark:text-aegean-200 dark:hover:text-ink-text">
              {siteConfig.contact.phone}
            </a>
          </p>
        </div>
      </div>
    );
  }

  const hasDates = !!(range?.from && range?.to);
  const quote =
    hasDates && rangeValid && range?.from && range?.to
      ? quoteStay(
          format(range.from, "yyyy-MM-dd"),
          format(range.to, "yyyy-MM-dd"),
          siteConfig.pricing
        )
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-sand-200 bg-white p-6 shadow-elev-2 dark:border-ink-border dark:bg-ink-surface dark:shadow-none">
      <div>
        <h3 className="text-lg font-bold text-aegean-900 dark:text-ink-text">{t.form.heading}</h3>
        <p className="mt-1 text-sm text-aegean-900/70 dark:text-ink-text/70">{t.form.subtitle}</p>
      </div>

      <div className="rounded-lg bg-sand-100/80 px-4 py-3 text-sm text-aegean-900 dark:bg-ink-bg dark:text-ink-text">
        {hasDates && range?.from && range?.to
          ? `${format(range.from, "yyyy-MM-dd")} → ${format(range.to, "yyyy-MM-dd")}`
          : `${t.form.checkin} / ${t.form.checkout}: —`}
      </div>

      {quote && (
        <div className="rounded-lg border border-sand-200 bg-sand-100/60 px-4 py-3 text-sm dark:border-ink-border dark:bg-ink-bg">
          <p className="mb-2 font-semibold text-aegean-900 dark:text-ink-text">{t.form.price.heading}</p>
          <dl className="space-y-1.5 text-aegean-900/80 dark:text-ink-text/80">
            {quote.weekdayNights > 0 && (
              <div className="flex items-baseline justify-between gap-3">
                <dt>
                  {t.form.price.weekdayLine
                    .replace("{count}", String(quote.weekdayNights))
                    .replace("{rate}", String(quote.weekdayRateEur))}
                </dt>
                <dd className="tabular-nums">{quote.weekdaySubtotalEur}€</dd>
              </div>
            )}
            {quote.weekendNights > 0 && (
              <div className="flex items-baseline justify-between gap-3">
                <dt>
                  {t.form.price.weekendLine
                    .replace("{count}", String(quote.weekendNights))
                    .replace("{rate}", String(quote.weekendRateEur))}
                </dt>
                <dd className="tabular-nums">{quote.weekendSubtotalEur}€</dd>
              </div>
            )}
            <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-sand-200 pt-2 font-semibold text-aegean-900 dark:border-ink-border dark:text-ink-text">
              <dt>
                {t.form.price.total}{" "}
                <span className="font-normal text-aegean-900/60 dark:text-ink-muted">
                  · {t.form.price.totalNights.replace("{count}", String(quote.nights))}
                </span>
              </dt>
              <dd className="text-base tabular-nums">{quote.totalEur}€</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Honeypot — hidden from real visitors, only bots fill every field */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.form.name} name="name" required autoComplete="name" />
        <Field label={t.form.email} name="email" type="email" required autoComplete="email" />
        <Field
          label={`${t.form.phone} ${t.form.phoneOptional}`}
          name="phone"
          type="tel"
          autoComplete="tel"
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-aegean-900 dark:text-ink-text" htmlFor="guests">
            {t.form.guests}
          </label>
          <select
            id="guests"
            name="guests"
            required
            defaultValue={2}
            className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm focus:border-aegean-400 focus:outline-none focus:ring-1 focus:ring-aegean-400 dark:border-ink-border dark:bg-ink-bg dark:text-ink-text dark:focus:border-aegean-400 dark:focus:ring-aegean-400"
          >
            {Array.from({ length: siteConfig.capacity.maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-aegean-900 dark:text-ink-text" htmlFor="message">
          {t.form.message}
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          placeholder={t.form.messagePlaceholder}
          className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm focus:border-aegean-400 focus:outline-none focus:ring-1 focus:ring-aegean-400 dark:border-ink-border dark:bg-ink-bg dark:text-ink-text dark:placeholder:text-ink-faint dark:focus:border-aegean-400 dark:focus:ring-aegean-400"
        />
      </div>

      <label className="flex items-start gap-2.5 text-xs text-aegean-900/70 dark:text-ink-text/70">
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-sand-300 text-terracotta-500 focus:ring-terracotta-400 dark:border-ink-border dark:bg-ink-bg"
        />
        <span>
          {lang === "el" ? "Έχω διαβάσει και αποδέχομαι τους " : "I have read and accept the "}
          <ConsentLink href="/legal/terms">{lang === "el" ? "Όρους" : "Terms"}</ConsentLink>
          {", "}
          <ConsentLink href="/legal/house-rules">{lang === "el" ? "Κανόνες" : "House Rules"}</ConsentLink>
          {lang === "el" ? " και την " : " and "}
          <ConsentLink href="/legal/privacy">{lang === "el" ? "Πολιτική Απορρήτου" : "Privacy Policy"}</ConsentLink>
          .
        </span>
      </label>

      {status === "error" && errorMessage && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={!hasDates || !rangeValid || !consent || status === "submitting"}
        className="w-full rounded-full bg-terracotta-500 px-6 py-3 text-sm font-semibold text-white shadow-elev-1 transition-all duration-200 hover:-translate-y-0.5 hover:bg-terracotta-600 hover:shadow-elev-2 active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-aegean-900/40 disabled:shadow-none dark:disabled:bg-ink-raised dark:disabled:text-ink-faint"
      >
        {status === "submitting" ? t.form.submitting : t.form.submit}
      </button>

      <p className="text-center text-xs text-aegean-900/60 dark:text-ink-muted">{t.form.disclaimer}</p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-aegean-900 dark:text-ink-text" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm focus:border-aegean-400 focus:outline-none focus:ring-1 focus:ring-aegean-400 dark:border-ink-border dark:bg-ink-bg dark:text-ink-text dark:placeholder:text-ink-faint dark:focus:border-aegean-400 dark:focus:ring-aegean-400"
      />
    </div>
  );
}

function ConsentLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-aegean-700 underline underline-offset-2 hover:text-aegean-900 dark:text-aegean-200 dark:hover:text-ink-text"
    >
      {children}
    </a>
  );
}

function mapError(reason: string | undefined, t: ReturnType<typeof useLanguage>["t"]): string {
  switch (reason) {
    case "min-stay":
      return t.form.errorMinStay;
    case "not-available":
      return t.form.errorNotAvailable;
    case "past-date":
    case "too-far":
    case "invalid-range":
    case "invalid-fields":
      return t.form.errorInvalid;
    case "rate-limited":
      return t.form.errorRateLimited;
    default:
      return t.form.errorGeneric;
  }
}
