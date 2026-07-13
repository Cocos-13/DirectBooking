"use client";

import { DayPicker, type DateRange } from "react-day-picker";
import { parseISO, startOfToday, addDays } from "date-fns";
import { useLanguage } from "./LanguageProvider";
import { siteConfig } from "@/content/siteConfig";

interface Props {
  disabledDates: string[];
  orphanGapNights: string[];
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
}

export function AvailabilityCalendar({ disabledDates, orphanGapNights, selected, onSelect }: Props) {
  const { t } = useLanguage();

  const disabled = disabledDates.map((d) => parseISO(d));
  const orphan = orphanGapNights.map((d) => parseISO(d));
  const today = startOfToday();
  const horizon = addDays(today, siteConfig.calendarHorizonDays);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-aegean-900/70">
        <LegendDot className="bg-sand-200" label={t.calendar.legendAvailable} />
        <LegendDot className="bg-aegean-700" label={t.calendar.legendBooked} />
        <LegendDot className="bg-terracotta-400" label={t.calendar.legendOneNight} />
      </div>

      <DayPicker
        mode="range"
        selected={selected}
        onSelect={(range, selectedDay) => {
          // If a complete range was already selected, clicking any date starts
          // a fresh check-in instead of extending the existing stay
          // (matches Booking.com's picker behavior).
          if (selected?.from && selected?.to) {
            onSelect({ from: selectedDay, to: undefined });
            return;
          }
          onSelect(range);
        }}
        disabled={[{ before: today }, { after: horizon }, ...disabled]}
        modifiers={{ orphan }}
        modifiersClassNames={{ orphan: "rdp-orphan" }}
        numberOfMonths={1}
        fromDate={today}
        toDate={horizon}
      />

      <p className="mt-3 text-xs text-aegean-900/60">{t.calendar.minStayNotice}</p>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
