import {
  MAX_BLOCK_DATES,
  audit,
  blockDates,
  deleteConfirmedBooking,
  getActiveHolds,
  getBookingPii,
  getConfirmedBookings,
  getManualBlocks,
  isStoreConfigured,
  releaseHold,
  unblockDates,
} from "@/lib/bookingStore";
import {
  ADMIN_COOKIE,
  isAdminConfigured,
  issueSession,
  readCookie,
  sessionCookieHeader,
  verifyPassword,
  verifySession,
} from "@/lib/adminAuth";
import {
  CALENDAR_CSS,
  buildDayCells,
  renderCalendar,
  resolveView,
} from "@/lib/adminCalendar";
import { addDaysYmd, isValidYmd, propertyToday } from "@/lib/availability";
import { getRawBusyRanges } from "@/lib/ical";
import { clientIp, firstExceeded, hashId } from "@/lib/rateLimit";
import { siteConfig } from "@/content/siteConfig";

// Owner-only admin for this site's calendar. Two jobs:
//
//  1. CALENDAR — see every night in the booking window with what is holding it
//     (direct booking, Airbnb, Booking.com, a live pay link, or a block you
//     made), and open/close nights by hand. The motivating case is turnover
//     time: a booking ends on the 14th and there's no time to clean before a
//     new arrival, so the 14th gets blocked and the next guest arrives on the
//     15th at the earliest.
//  2. BOOKINGS — list confirmed direct bookings, REOPEN (delete) one, and
//     one-click the cleaning buffer on either side of a stay.
//
// Guarded by a password → short-lived signed cookie (lib/adminAuth). The
// session cookie is SameSite=Lax and the CSP sets `form-action 'self'`, so a
// third-party page can't drive these POSTs on the owner's behalf.
//
// Everything here is server-rendered HTML with no client JS, which keeps it
// compatible with the site's strict nonce-based CSP (see middleware.ts).
//
// Reach: a manual block affects THIS site immediately, and reaches Airbnb /
// Booking.com through the published feed at /api/calendar.ics whenever they
// next re-import it (they poll every few hours). Reopening a booking is
// likewise a this-site-only action — it does not refund or notify anyone.

export const dynamic = "force-dynamic";

const SELF = "/api/admin/bookings";

export async function GET(req: Request) {
  if (!isAdminConfigured()) return page("Admin unavailable", `<p>${NOT_CONFIGURED}</p>`, 503);
  if (!isStoreConfigured()) return page("Store off", `<p>${STORE_OFF}</p>`, 503);

  if (!verifySession(readCookie(req, ADMIN_COOKIE))) return loginPage();
  const params = new URL(req.url).searchParams;
  return adminPage({
    confirmCode: params.get("confirm") ?? undefined,
    view: params.get("view"),
  });
}

export async function POST(req: Request) {
  if (!isAdminConfigured()) return page("Admin unavailable", `<p>${NOT_CONFIGURED}</p>`, 503);
  if (!isStoreConfigured()) return page("Store off", `<p>${STORE_OFF}</p>`, 503);

  const form = await req.formData().catch(() => null);
  const action = (form?.get("action") as string) ?? "";

  if (action === "login") {
    const rl = await firstExceeded([
      { key: `admin:login:${hashId(clientIp(req))}:5m`, limit: 8, windowSec: 300 },
    ]);
    if (rl) {
      await audit("rate.limited", { endpoint: "admin.login" });
      return loginPage("Too many attempts. Wait a few minutes and try again.", 429);
    }
    if (!verifyPassword((form?.get("password") as string) ?? "")) {
      await audit("admin.login_failed", {});
      return loginPage("Wrong password.", 401);
    }
    await audit("admin.login", {});
    return new Response(null, {
      status: 303,
      headers: { Location: SELF, "Set-Cookie": sessionCookieHeader(issueSession()) },
    });
  }

  // Every other action requires a valid session.
  if (!verifySession(readCookie(req, ADMIN_COOKIE))) return loginPage("Please sign in.", 401);

  // The month the owner was looking at, echoed back so an action doesn't jump
  // them to today.
  const view = (form?.get("view") as string) ?? null;

  if (action === "reopen") {
    const orderCode = ((form?.get("orderCode") as string) ?? "").trim();
    if (!orderCode) return adminPage({ notice: "No booking specified.", view });
    const removed = await deleteConfirmedBooking(orderCode);
    await audit("booking.reopened", { orderCode, removed });
    return adminPage({
      notice: removed
        ? `✓ Reopened order ${escapeHtml(orderCode)}. Those dates are now free on the website.`
        : `Order ${escapeHtml(orderCode)} was not found (already reopened?).`,
      view,
    });
  }

  if (action === "release") {
    const holdId = ((form?.get("holdId") as string) ?? "").trim();
    if (!holdId) return adminPage({ notice: "No hold specified.", view });
    const { released, pendingRemoved } = await releaseHold(holdId);
    await audit("hold.released", { holdId, released, pendingRemoved });
    return adminPage({
      notice: released
        ? `✓ Released the hold. Those dates are free again${pendingRemoved ? " and the unpaid order's details were deleted" : ""}.`
        : "That hold was not found (already expired or released?).",
      view,
    });
  }

  if (action === "block" || action === "unblock") {
    const { dates, rejected } = cleanDates(form?.getAll("dates") ?? []);
    if (dates.length === 0) {
      return adminPage({
        notice: rejected
          ? "Those dates are outside the booking window — nothing changed."
          : "No nights selected. Tick one or more days first.",
        view,
      });
    }
    if (dates.length > MAX_BLOCK_DATES) {
      return adminPage({
        notice: `Too many nights at once (max ${MAX_BLOCK_DATES}). Split it into smaller batches.`,
        view,
      });
    }

    // A store hiccup here must not hand the owner a stack trace: this page is
    // how they fix the calendar, so it has to stay usable and say what failed.
    let changed: number;
    try {
      changed = action === "block" ? await blockDates(dates) : await unblockDates(dates);
    } catch (err) {
      console.error(`[admin] ${action} failed:`, err);
      return adminPage({
        notice: "Could not reach the booking store — nothing changed. Try again in a moment.",
        view,
      });
    }
    await audit(action === "block" ? "dates.blocked" : "dates.unblocked", {
      count: dates.length,
      changed,
      first: dates[0],
      last: dates[dates.length - 1],
    });

    const what = `${changed} night${changed === 1 ? "" : "s"}`;
    let notice: string;
    if (changed === 0) {
      notice =
        action === "block"
          ? "Those nights were already blocked — nothing changed."
          : "Those nights weren't blocked — nothing changed.";
    } else if (action === "block") {
      notice = `✓ Blocked ${what}. They're closed on the website now, and will close on Airbnb / Booking.com once they re-read the feed.`;
    } else {
      notice = `✓ Reopened ${what}. They're bookable again on the website, and will reopen on the platforms once they re-read the feed.`;
    }
    return adminPage({ notice, view });
  }

  return adminPage({ notice: "Unknown action.", view });
}

// ---------------------------------------------------------------------------

/**
 * Filters posted date values down to real, bookable nights: valid YYYY-MM-DD,
 * not in the past, not past the horizon, deduped and sorted. Anything else is
 * dropped rather than trusted — this is a POST body, not the UI's word.
 */
function cleanDates(raw: FormDataEntryValue[]): { dates: string[]; rejected: boolean } {
  const today = propertyToday();
  const lastDay = addDaysYmd(today, siteConfig.calendarHorizonDays);
  const seen = new Set<string>();
  let rejected = false;
  for (const value of raw) {
    const v = typeof value === "string" ? value.trim() : "";
    if (isValidYmd(v) && v >= today && v <= lastDay) seen.add(v);
    else if (v) rejected = true;
  }
  return { dates: [...seen].sort(), rejected };
}

async function adminPage(opts: {
  notice?: string;
  confirmCode?: string;
  view?: string | null;
}): Promise<Response> {
  const { notice, confirmCode } = opts;
  const today = propertyToday();
  const lastDay = addDaysYmd(today, siteConfig.calendarHorizonDays);
  const view = resolveView(opts.view, today, lastDay);

  const [ranges, manualMap, bookings, holds] = await Promise.all([
    getRawBusyRanges().catch((err) => {
      console.error("[admin] busy ranges failed:", err);
      return [];
    }),
    getManualBlocks(today).catch(() => ({})),
    getConfirmedBookings().catch(() => []),
    getActiveHolds().catch(() => []),
  ]);
  const manual = new Set(Object.keys(manualMap));

  const cells = buildDayCells(today, lastDay, ranges, manual, today);
  const calendar = renderCalendar({ self: SELF, cells, view, today, lastDay });

  const body = `
    <h1>Calendar &amp; bookings</h1>
    ${notice ? `<p class="notice">${notice}</p>` : ""}
    ${calendar}
    ${renderHolds(holds, view)}
    ${await renderBookings(bookings, manual, { today, lastDay, view, confirmCode })}`;
  return page("Bookings admin", body);
}

function renderHolds(
  holds: Awaited<ReturnType<typeof getActiveHolds>>,
  view: string
): string {
  if (holds.length === 0) return "";
  const sorted = [...holds].sort((a, b) => a.checkin.localeCompare(b.checkin));
  const rows = sorted
    .map(
      (h) => `
        <tr>
          <td class="nowrap">${h.checkin} → ${h.checkout}</td>
          <td class="muted">expires ${escapeHtml(h.expiresAt)}</td>
          <td>
            <form method="POST" action="${SELF}" style="display:inline">
              <input type="hidden" name="action" value="release" />
              <input type="hidden" name="holdId" value="${escapeHtml(h.id)}" />
              <input type="hidden" name="view" value="${view.slice(0, 7)}" />
              <button type="submit" class="danger">Release</button>
            </form>
          </td>
        </tr>`
    )
    .join("");
  return `
    <h2>Pending pay links</h2>
    <table>
      <tr><th>Dates</th><th>Hold</th><th></th></tr>
      ${rows}
    </table>
    <p class="muted">
      A live checkout link for a guest who hasn't paid yet. It frees itself automatically once it expires —
      use "Release" to open the dates immediately and delete the unpaid order's guest details right away.
    </p>`;
}

async function renderBookings(
  bookings: Awaited<ReturnType<typeof getConfirmedBookings>>,
  manual: Set<string>,
  ctx: { today: string; lastDay: string; view: string; confirmCode?: string }
): Promise<string> {
  const sorted = [...bookings].sort((a, b) => a.checkin.localeCompare(b.checkin));

  // Best-effort guest name (from the retained-PII key) to help identify a row.
  const withPii = await Promise.all(
    sorted.map(async (b) => ({ ...b, pii: await getBookingPii(b.id).catch(() => null) }))
  );

  const rows = withPii
    .map((b) => {
      const amt = b.amountCents != null ? `${(b.amountCents / 100).toFixed(2)}€` : "—";
      const who = b.pii?.guestName ? escapeHtml(b.pii.guestName) : "<span class=muted>—</span>";
      const taxId = b.pii?.taxId
        ? `${escapeHtml(b.pii.taxId)}${b.pii.isForeign ? ' <span class="muted">(passport/ID)</span>' : ""}`
        : "<span class=muted>—</span>";
      // Two-step reopen (no inline JS, so it survives the strict CSP): the
      // "Reopen" link re-renders this row as a confirm prompt whose POST does
      // it. Both links carry the month being viewed so confirming or cancelling
      // doesn't scroll the calendar back to today.
      const viewParam = `view=${encodeURIComponent(ctx.view.slice(0, 7))}`;
      const control =
        ctx.confirmCode === b.id
          ? `<form method="POST" action="${SELF}" style="display:flex;gap:6px;align-items:center">
               <input type="hidden" name="action" value="reopen" />
               <input type="hidden" name="orderCode" value="${escapeHtml(b.id)}" />
               <input type="hidden" name="view" value="${ctx.view.slice(0, 7)}" />
               <span class="muted">Sure?</span>
               <button type="submit" class="danger">Yes, reopen</button>
               <a href="${SELF}?${viewParam}" class="cancel">Cancel</a>
             </form>`
          : `<a href="${SELF}?${viewParam}&amp;confirm=${encodeURIComponent(b.id)}" class="reopen">Reopen</a>`;
      return `
        <tr${ctx.confirmCode === b.id ? ' class="active"' : ""}>
          <td class="nowrap">${b.checkin} → ${b.checkout}</td>
          <td>${bufferControls(b.checkin, b.checkout, manual, ctx)}</td>
          <td>${who}</td>
          <td>${taxId}</td>
          <td>${amt}</td>
          <td class="muted">${escapeHtml(b.id)}</td>
          <td>${control}</td>
        </tr>`;
    })
    .join("");

  if (sorted.length === 0) {
    return `
      <h2>Confirmed bookings</h2>
      <p class="muted">No confirmed direct bookings. (Airbnb/Booking.com bookings are not listed here — they live in those platforms, but their dates do show in the calendar above.)</p>`;
  }

  return `
    <h2>Confirmed bookings</h2>
    <table>
      <tr><th>Dates</th><th>Turnover</th><th>Guest</th><th>ΑΦΜ / ID</th><th>Paid</th><th>Order</th><th></th></tr>
      ${rows}
    </table>
    <p class="muted">
      <strong>Turnover</strong> closes the night on either side of a stay so nobody arrives the day the last
      guest leaves (or leaves the day the next one arrives) — the cleaning gap. Click a chip to toggle it.
    </p>
    <p class="muted">“Reopen” deletes the booking from this site only and frees the dates immediately. It does not refund the guest or notify Airbnb/Booking.com.</p>`;
}

/**
 * The two one-click cleaning buffers around a stay.
 *
 * A stay of [10, 14) occupies the nights 10–13. Somebody could still check out
 * on the morning of the 10th (the arrival day) or check in on the 14th (the
 * departure day) — two same-day turnovers. Closing them means blocking the
 * night BEFORE check-in and the night OF checkout, which is what these do.
 */
function bufferControls(
  checkin: string,
  checkout: string,
  manual: Set<string>,
  ctx: { today: string; lastDay: string; view: string }
): string {
  const before = addDaysYmd(checkin, -1);
  const chips = [
    { date: before, label: "before" },
    { date: checkout, label: "after" },
  ]
    .filter((c) => c.date >= ctx.today && c.date <= ctx.lastDay)
    .map((c) => {
      const on = manual.has(c.date);
      const day = c.date.slice(8, 10);
      const month = c.date.slice(5, 7);
      return `<form method="POST" action="${SELF}" style="display:inline">
          <input type="hidden" name="action" value="${on ? "unblock" : "block"}" />
          <input type="hidden" name="dates" value="${c.date}" />
          <input type="hidden" name="view" value="${ctx.view.slice(0, 7)}" />
          <button type="submit" class="chip${on ? " on" : ""}"
            title="${on ? "Blocked" : "Block"} the night of ${c.date} (${c.label} this stay)">${
              on ? "✓ " : "+ "
            }${c.label} ${day}/${month}</button>
        </form>`;
    });
  return chips.length ? chips.join(" ") : `<span class="muted">—</span>`;
}

function loginPage(error?: string, status = 200): Response {
  const body = `
    <h1>Owner sign in</h1>
    ${error ? `<p class="notice">${escapeHtml(error)}</p>` : ""}
    <form method="POST" action="${SELF}">
      <input type="hidden" name="action" value="login" />
      <input type="password" name="password" placeholder="Admin password" autofocus autocomplete="current-password" />
      <button type="submit">Sign in</button>
    </form>`;
  return page("Sign in", body, status);
}

const NOT_CONFIGURED =
  "Admin is not enabled. Set ADMIN_PASSWORD (and BOOKING_APPROVAL_SECRET) in the environment.";
const STORE_OFF = "The booking store (KV) is not configured, so there are no direct bookings to manage.";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function page(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
      <meta name="robots" content="noindex,nofollow"/>
      <title>${escapeHtml(title)} — ${escapeHtml(siteConfig.name)}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:960px;margin:48px auto;padding:0 20px;color:#1f2d2b;line-height:1.5}
        h1{font-size:22px}
        table{border-collapse:collapse;margin:16px 0;width:100%}
        th,td{padding:8px 10px;border-bottom:1px solid #eee;text-align:left;vertical-align:middle}
        th{color:#888;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
        input[type=password]{padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-size:15px;width:100%;max-width:280px;margin:8px 0}
        button{background:#c65a3a;color:#fff;border:0;border-radius:9999px;padding:9px 18px;font-weight:600;font-size:14px;cursor:pointer}
        button.danger{background:#b23b2e;padding:6px 14px;font-size:13px}
        button.chip{background:#f2f2f2;color:#555;border:1px solid #ddd;padding:3px 10px;font-size:12px;font-weight:600;white-space:nowrap}
        button.chip:hover{border-color:#c65a3a;color:#c65a3a}
        button.chip.on{background:#e3e3e3;color:#1f2d2b;border-color:#b9b9b9}
        form{margin:0}
        a.reopen{color:#b23b2e;font-weight:600;font-size:13px;text-decoration:none}
        a.reopen:hover{text-decoration:underline}
        a.cancel{color:#888;font-size:13px;text-decoration:none}
        tr.active{background:#fff4e5}
        td.nowrap{white-space:nowrap}
        .muted{color:#888;font-size:13px}
        .notice{background:#fff4e5;border:1px solid #f0c987;border-radius:8px;padding:10px 12px;font-size:14px}
        ${CALENDAR_CSS}
      </style></head><body>${body}</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
