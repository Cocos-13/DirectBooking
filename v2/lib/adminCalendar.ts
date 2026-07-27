import { addMonths, format, getDay, parseISO, startOfMonth } from "date-fns";
import { addDaysYmd, isValidYmd } from "./availability";
import { escHtml } from "./ownerHtml";
import type { BusyRange, IcalSource } from "./types";

// The owner's month-grid calendar for /api/admin/bookings: every night in the
// booking window, coloured by what is holding it, with the free ones (and the
// owner's own blocks) selectable so they can be closed or reopened in bulk.
//
// Rendered as plain server HTML with zero client JS — the site ships a strict
// nonce-based CSP (see middleware.ts) and an admin page that needs no script is
// simply one less thing to get wrong. Selection is a grid of real checkboxes
// with their labels styled as day cells; the two submit buttons share a `name`
// so the clicked one tells the server which way to act.

/** What is holding a night, in the order it takes precedence for display. */
export type DayStatus = "past" | "direct" | "airbnb" | "booking" | "hold" | "manual" | "free";

const PRIORITY: Record<IcalSource, number> = {
  direct: 5,
  airbnb: 4,
  booking: 3,
  hold: 2,
  manual: 1,
};

const STATUS_LABEL: Record<DayStatus, string> = {
  past: "Past",
  direct: "Booked — direct (this site)",
  airbnb: "Booked — Airbnb",
  booking: "Booked — Booking.com",
  hold: "On hold — pay link sent",
  manual: "Blocked by you",
  free: "Free",
};

export interface DayCell {
  date: string; // YYYY-MM-DD
  status: DayStatus;
  /** An owner block exists on this night (even if a booking also covers it). */
  manual: boolean;
  /** May be ticked: either free (to block) or owner-blocked (to free). */
  selectable: boolean;
}

/** How many months the grid shows at once. */
export const MONTHS_PER_VIEW = 6;

/**
 * Builds one cell per night in `[from, to]`.
 *
 * A night can be claimed by several sources at once (the owner blocks the 14th
 * as a cleaning buffer, then Airbnb sells it anyway). The highest-priority
 * source decides the colour, but `manual` is tracked independently so such a
 * night stays selectable — otherwise a block could get buried under a booking
 * and become impossible to lift from this page.
 */
export function buildDayCells(
  from: string,
  to: string,
  ranges: BusyRange[],
  manualBlocks: Set<string>,
  today: string
): DayCell[] {
  // Expand busy ranges into per-night sources, clipped to the window so a
  // platform feed's multi-year "unavailable" block costs nothing to walk.
  const bySource = new Map<string, IcalSource>();
  for (const r of ranges) {
    let cursor = r.start < from ? from : r.start;
    while (cursor < r.end && cursor <= to) {
      const current = bySource.get(cursor);
      if (!current || PRIORITY[r.source] > PRIORITY[current]) bySource.set(cursor, r.source);
      cursor = addDaysYmd(cursor, 1);
    }
  }

  const cells: DayCell[] = [];
  for (let day = from; day <= to; day = addDaysYmd(day, 1)) {
    const manual = manualBlocks.has(day);
    if (day < today) {
      cells.push({ date: day, status: "past", manual, selectable: false });
      continue;
    }
    const source = bySource.get(day);
    const status: DayStatus = source ?? "free";
    cells.push({
      date: day,
      status,
      manual,
      // Free nights can be closed; owner-blocked ones can be reopened. A night
      // held by a booking or a live hold is not this page's to give away.
      selectable: status === "free" || manual,
    });
  }
  return cells;
}

/** First day of the month `offset` months from `ymd`'s month, as YYYY-MM-DD. */
function monthStart(ymd: string, offset = 0): string {
  return format(addMonths(startOfMonth(parseISO(ymd)), offset), "yyyy-MM-dd");
}

function maxYmd(a: string, b: string): string {
  return a > b ? a : b;
}

/**
 * Clamps a `?view=YYYY-MM` parameter to a real month inside the booking window,
 * falling back to the current month. Guards the grid against being pointed at
 * year 9999 (or at nothing at all) by a hand-edited URL.
 */
export function resolveView(raw: string | null | undefined, today: string, lastDay: string): string {
  const candidate = raw && /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : null;
  if (!candidate || !isValidYmd(candidate)) return monthStart(today);
  const first = monthStart(today);
  const last = monthStart(lastDay);
  if (candidate < first) return first;
  if (candidate > last) return last;
  return candidate;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The whole calendar block: month grids wrapped in the form that posts the
 * ticked nights, plus paging links and a legend.
 *
 * `self` is the admin route's own path; `formBody` is any extra hidden inputs
 * the caller needs echoed back (nothing today beyond the view).
 */
export function renderCalendar(opts: {
  self: string;
  cells: DayCell[];
  view: string; // first day of the first month shown
  today: string;
  lastDay: string; // last bookable day (horizon)
}): string {
  const { self, cells, view, today, lastDay } = opts;
  const byDate = new Map(cells.map((c) => [c.date, c]));

  const months: string[] = [];
  for (let i = 0; i < MONTHS_PER_VIEW; i++) {
    const first = monthStart(view, i);
    // Don't render months entirely past the horizon.
    if (first > lastDay) break;
    months.push(renderMonth(first, byDate, today));
  }

  const firstMonth = monthStart(today);
  // Never page earlier than the current month or later than the horizon.
  const prev = maxYmd(monthStart(view, -MONTHS_PER_VIEW), firstMonth);
  const next = monthStart(view, MONTHS_PER_VIEW);
  const link = (target: string, text: string) =>
    `<a href="${self}?view=${format(parseISO(target), "yyyy-MM")}#calendar">${text}</a>`;
  const nav = `
    <div class="calnav">
      ${view > firstMonth ? link(prev, "‹ Earlier") : `<span class="muted">‹ Earlier</span>`}
      <span class="muted">${format(parseISO(view), "LLLL yyyy")} onwards</span>
      ${next <= lastDay ? link(next, "Later ›") : `<span class="muted">Later ›</span>`}
    </div>`;

  return `
    <h2 id="calendar">Calendar</h2>
    <p class="muted">
      Tick any free night to close it, or any night you closed earlier to reopen it, then press a button below.
      Blocking a day blocks that <em>night</em>: nobody can arrive that day, but someone can still check out
      that morning — exactly how a real booking's last day behaves.
    </p>
    ${nav}
    <form method="POST" action="${self}">
      <input type="hidden" name="view" value="${format(parseISO(view), "yyyy-MM")}" />
      <div class="months">${months.join("")}</div>
      <div class="calactions">
        <button type="submit" name="action" value="block">Block selected nights</button>
        <button type="submit" name="action" value="unblock" class="secondary">Reopen selected nights</button>
      </div>
    </form>
    <div class="legend">
      <span><i class="sw free"></i>Free</span>
      <span><i class="sw manual"></i>Blocked by you</span>
      <span><i class="sw direct"></i>Direct booking</span>
      <span><i class="sw airbnb"></i>Airbnb</span>
      <span><i class="sw booking"></i>Booking.com</span>
      <span><i class="sw hold"></i>Pay link out</span>
    </div>
    <p class="muted">
      Platform bookings (Airbnb / Booking.com) are read from their iCal feeds and refresh every ~30 minutes,
      so a booking made there may take that long to appear. Your own blocks and bookings appear instantly.
    </p>`;
}

function renderMonth(first: string, byDate: Map<string, DayCell>, today: string): string {
  const d = parseISO(first);
  const title = format(d, "LLLL yyyy");
  // Monday-first, matching the guest calendar and European convention.
  const lead = (getDay(d) + 6) % 7;

  const heads = WEEKDAYS.map((w) => `<span class="dow">${w[0]}</span>`).join("");
  const pads = Array.from({ length: lead }, () => `<span class="pad"></span>`).join("");

  const days: string[] = [];
  for (let day = first; day.slice(0, 7) === first.slice(0, 7); day = addDaysYmd(day, 1)) {
    const num = String(Number(day.slice(8, 10)));
    const cell = byDate.get(day);
    // Outside the booking window entirely — the days of the current month that
    // have already gone, and anything past the horizon.
    if (!cell) {
      const why = day < today ? "Past" : "Beyond the booking window";
      days.push(`<span class="day out" title="${why}">${num}</span>`);
      continue;
    }
    const dot = cell.manual && cell.status !== "manual" ? `<i class="dot"></i>` : "";
    const tip = escHtml(
      cell.manual && cell.status !== "manual"
        ? `${STATUS_LABEL[cell.status]} — also blocked by you`
        : STATUS_LABEL[cell.status]
    );
    if (!cell.selectable) {
      days.push(`<span class="day ${cell.status}" title="${tip}">${num}${dot}</span>`);
      continue;
    }
    const id = `d${day.replace(/-/g, "")}`;
    days.push(
      `<input type="checkbox" class="pick" id="${id}" name="dates" value="${day}" />` +
        `<label class="day ${cell.status}" for="${id}" title="${tip}">${num}${dot}</label>`
    );
  }

  return `<section class="month"><h3>${title}</h3><div class="grid">${heads}${pads}${days.join("")}</div></section>`;
}

/** Shared CSS for the grid — injected into the admin page's <style>. */
export const CALENDAR_CSS = `
  h2{font-size:17px;margin:32px 0 6px}
  .calnav{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0;font-size:13px}
  .calnav a{color:#2a6570;text-decoration:none;font-weight:600}
  .calnav a:hover{text-decoration:underline}
  .months{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px}
  .month h3{font-size:13px;font-weight:600;margin:0 0 6px;color:#555}
  .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
  .dow{font-size:10px;color:#aaa;text-align:center;padding-bottom:2px}
  .pad{aspect-ratio:1}
  .day{position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;
       font-size:12px;border-radius:6px;border:1px solid transparent;user-select:none}
  .day.free{background:#fff;border-color:#dcdcdc;color:#1f2d2b;cursor:pointer}
  .day.free:hover{border-color:#2a6570}
  .day.manual{background:#e3e3e3;border-color:#c9c9c9;color:#555;cursor:pointer;
              background-image:repeating-linear-gradient(45deg,transparent,transparent 3px,#0000000d 3px,#0000000d 6px)}
  .day.manual:hover{border-color:#8a8a8a}
  .day.direct{background:#cfe3dc;border-color:#a9c9bf;color:#274a41}
  .day.airbnb{background:#f6d2c8;border-color:#e3b3a5;color:#7a3423}
  .day.booking{background:#cddcef;border-color:#a8c1de;color:#22436b}
  .day.hold{background:#fbe6bd;border-color:#eccb8c;color:#7a5a15}
  .day.past,.day.out{background:#fafafa;color:#ccc;border-color:#f0f0f0}
  .day .dot{position:absolute;top:2px;right:2px;width:5px;height:5px;border-radius:50%;background:#555}
  .pick{position:absolute;opacity:0;pointer-events:none;width:0;height:0}
  .pick:checked + .day{outline:2px solid #c65a3a;outline-offset:-2px;background:#fdece5;border-color:#c65a3a}
  .pick:focus-visible + .day{box-shadow:0 0 0 3px #2a657055}
  .calactions{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 4px}
  button.secondary{background:#2a6570}
  .legend{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:#666;margin:6px 0 4px}
  .legend span{display:flex;align-items:center;gap:5px}
  .legend .sw{width:12px;height:12px;border-radius:3px;border:1px solid #ccc;display:inline-block}
  .legend .sw.free{background:#fff}
  .legend .sw.manual{background:#e3e3e3;border-color:#c9c9c9}
  .legend .sw.direct{background:#cfe3dc;border-color:#a9c9bf}
  .legend .sw.airbnb{background:#f6d2c8;border-color:#e3b3a5}
  .legend .sw.booking{background:#cddcef;border-color:#a8c1de}
  .legend .sw.hold{background:#fbe6bd;border-color:#eccb8c}
`;
