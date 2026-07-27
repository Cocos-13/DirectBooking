/**
 * Where a busy range came from. Kept finer-grained than "is it free?" purely so
 * the owner's admin calendar can colour each night by its origin — the guest
 * calendar merges them all and never sees this.
 *   direct — a paid booking made on this site
 *   hold   — nights with a live pay link out to a guest (expires by itself)
 *   manual — a night the owner blocked by hand (cleaning buffer, personal use)
 */
export type IcalSource = "airbnb" | "booking" | "direct" | "hold" | "manual";

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

export type BookingRejectionReason =
  | "invalid-range"
  | "not-available"
  | "min-stay"
  | "past-date"
  | "too-far";

export type BookingEvaluation = { ok: true } | { ok: false; reason: BookingRejectionReason };
