"use client";

import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";

interface Props {
  range: DateRange | undefined;
  rangeValid: boolean;
}

type Status = "idle" | "submitting" | "success" | "error";

export function BookingForm({ range, rangeValid }: Props) {
  const { t, lang } = useLanguage();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!range?.from || !range?.to || !rangeValid) return;

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
      <div className="rounded-xl border border-aegean-200 bg-aegean-50 p-6 text-aegean-900">
        <p className="font-medium">{t.form.success}</p>
      </div>
    );
  }

  const hasDates = !!(range?.from && range?.to);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-sand-200 bg-white p-6">
      <div>
        <h3 className="text-lg font-bold text-aegean-900">{t.form.heading}</h3>
        <p className="mt-1 text-sm text-aegean-900/70">{t.form.subtitle}</p>
      </div>

      <div className="rounded-lg bg-sand-100/80 px-4 py-3 text-sm text-aegean-900">
        {hasDates && range?.from && range?.to
          ? `${format(range.from, "yyyy-MM-dd")} → ${format(range.to, "yyyy-MM-dd")}`
          : `${t.form.checkin} / ${t.form.checkout}: —`}
      </div>

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
          <label className="mb-1 block text-sm font-medium text-aegean-900" htmlFor="guests">
            {t.form.guests}
          </label>
          <select
            id="guests"
            name="guests"
            required
            defaultValue={2}
            className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm focus:border-aegean-400 focus:outline-none focus:ring-1 focus:ring-aegean-400"
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
        <label className="mb-1 block text-sm font-medium text-aegean-900" htmlFor="message">
          {t.form.message}
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          placeholder={t.form.messagePlaceholder}
          className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm focus:border-aegean-400 focus:outline-none focus:ring-1 focus:ring-aegean-400"
        />
      </div>

      {status === "error" && errorMessage && (
        <p className="text-sm font-medium text-red-600">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={!hasDates || !rangeValid || status === "submitting"}
        className="w-full rounded-full bg-terracotta-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-terracotta-600 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-aegean-900/40"
      >
        {status === "submitting" ? t.form.submitting : t.form.submit}
      </button>

      <p className="text-center text-xs text-aegean-900/60">{t.form.disclaimer}</p>
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
      <label className="mb-1 block text-sm font-medium text-aegean-900" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm focus:border-aegean-400 focus:outline-none focus:ring-1 focus:ring-aegean-400"
      />
    </div>
  );
}

function mapError(reason: string | undefined, t: ReturnType<typeof useLanguage>["t"]): string {
  switch (reason) {
    case "min-stay":
      return t.form.errorMinStay;
    case "not-available":
      return t.form.errorNotAvailable;
    case "invalid-range":
    case "invalid-fields":
      return t.form.errorInvalid;
    default:
      return t.form.errorGeneric;
  }
}
