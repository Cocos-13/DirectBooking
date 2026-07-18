import { addDays, differenceInCalendarDays, getDay, parseISO } from "date-fns";

export interface PricingConfig {
  weekdayRateEur: number; // Sun–Thu nights
  weekendRateEur: number; // Fri & Sat nights
}

export interface StayQuote {
  nights: number;
  weekdayNights: number;
  weekendNights: number;
  weekdayRateEur: number;
  weekendRateEur: number;
  weekdaySubtotalEur: number;
  weekendSubtotalEur: number;
  totalEur: number;
  avgNightlyEur: number;
}

/**
 * A night is priced by the calendar day it *starts on*. Friday (5) and
 * Saturday (6) nights are billed at the weekend rate; every other night
 * (Sun–Thu) at the weekday rate.
 */
function isWeekendNight(date: Date): boolean {
  const day = getDay(date);
  return day === 5 || day === 6;
}

/**
 * Splits a [checkin, checkout) stay into weekday/weekend nights and totals
 * the cost. Pure — no side effects — so it's safe to call on every render
 * and reuse server-side. Returns null for an invalid or empty range.
 */
export function quoteStay(
  checkin: string,
  checkout: string,
  pricing: PricingConfig
): StayQuote | null {
  const start = parseISO(checkin);
  const nights = differenceInCalendarDays(parseISO(checkout), start);
  if (!Number.isFinite(nights) || nights <= 0) return null;

  let weekdayNights = 0;
  let weekendNights = 0;
  for (let i = 0; i < nights; i++) {
    if (isWeekendNight(addDays(start, i))) weekendNights++;
    else weekdayNights++;
  }

  const weekdaySubtotalEur = weekdayNights * pricing.weekdayRateEur;
  const weekendSubtotalEur = weekendNights * pricing.weekendRateEur;
  const totalEur = weekdaySubtotalEur + weekendSubtotalEur;

  return {
    nights,
    weekdayNights,
    weekendNights,
    weekdayRateEur: pricing.weekdayRateEur,
    weekendRateEur: pricing.weekendRateEur,
    weekdaySubtotalEur,
    weekendSubtotalEur,
    totalEur,
    avgNightlyEur: Math.round(totalEur / nights),
  };
}
