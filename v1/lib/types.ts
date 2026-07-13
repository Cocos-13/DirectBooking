export type IcalSource = "airbnb" | "booking";

/**
 * A blocked stretch of nights. `start` is the check-in day (first occupied
 * night), `end` is the check-out day (first free night again) — same
 * half-open convention iCal itself uses, so date math stays simple.
 */
export interface BusyRange {
  start: string; // YYYY-MM-DD, inclusive
  end: string; // YYYY-MM-DD, exclusive
  source: IcalSource;
}

export interface MergedRange {
  start: string; // YYYY-MM-DD, inclusive
  end: string; // YYYY-MM-DD, exclusive
}

export type BookingRejectionReason = "invalid-range" | "not-available" | "min-stay";

export type BookingEvaluation = { ok: true } | { ok: false; reason: BookingRejectionReason };
