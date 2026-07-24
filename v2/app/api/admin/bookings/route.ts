import {
  audit,
  deleteConfirmedBooking,
  getBookingPii,
  getConfirmedBookings,
  isStoreConfigured,
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
import { clientIp, firstExceeded, hashId } from "@/lib/rateLimit";
import { siteConfig } from "@/content/siteConfig";

// Owner-only admin for direct bookings. Today it does one thing: list confirmed
// bookings and REOPEN (delete) one, which frees those dates on this site
// immediately. Guarded by a password → short-lived signed cookie (lib/adminAuth).
//
// GET  → login form (no session) or the booking list (valid session).
// POST → action=login (set cookie) or action=reopen (delete a booking).
//
// Reopening only affects THIS site. Airbnb/Booking.com are driven by their own
// feeds and are not touched here.

const SELF = "/api/admin/bookings";

export async function GET(req: Request) {
  if (!isAdminConfigured()) return page("Admin unavailable", `<p>${NOT_CONFIGURED}</p>`, 503);
  if (!isStoreConfigured()) return page("Store off", `<p>${STORE_OFF}</p>`, 503);

  if (!verifySession(readCookie(req, ADMIN_COOKIE))) return loginPage();
  const confirm = new URL(req.url).searchParams.get("confirm") ?? undefined;
  return listPage(undefined, confirm);
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

  if (action === "reopen") {
    const orderCode = ((form?.get("orderCode") as string) ?? "").trim();
    if (!orderCode) return listPage("No booking specified.");
    const removed = await deleteConfirmedBooking(orderCode);
    await audit("booking.reopened", { orderCode, removed });
    return listPage(
      removed
        ? `✓ Reopened order ${escapeHtml(orderCode)}. Those dates are now free on the website.`
        : `Order ${escapeHtml(orderCode)} was not found (already reopened?).`
    );
  }

  return listPage("Unknown action.");
}

// ---------------------------------------------------------------------------

async function listPage(notice?: string, confirmCode?: string): Promise<Response> {
  const bookings = await getConfirmedBookings();
  bookings.sort((a, b) => a.checkin.localeCompare(b.checkin));

  // Best-effort guest name (from the retained-PII key) to help identify a row.
  const withPii = await Promise.all(
    bookings.map(async (b) => ({ ...b, pii: await getBookingPii(b.id).catch(() => null) }))
  );

  const rows = withPii
    .map((b) => {
      const amt = b.amountCents != null ? `${(b.amountCents / 100).toFixed(2)}€` : "—";
      const who = b.pii?.guestName ? escapeHtml(b.pii.guestName) : "<span class=muted>—</span>";
      const taxId = b.pii?.taxId
        ? `${escapeHtml(b.pii.taxId)}${b.pii.isForeign ? ' <span class="muted">(passport/ID)</span>' : ""}`
        : "<span class=muted>—</span>";
      // Two-step reopen (no inline JS, so it survives the strict CSP): the
      // "Reopen" link re-renders this row as a confirm prompt whose POST does it.
      const control =
        confirmCode === b.id
          ? `<form method="POST" action="${SELF}" style="display:flex;gap:6px;align-items:center">
               <input type="hidden" name="action" value="reopen" />
               <input type="hidden" name="orderCode" value="${escapeHtml(b.id)}" />
               <span class="muted">Sure?</span>
               <button type="submit" class="danger">Yes, reopen</button>
               <a href="${SELF}" class="cancel">Cancel</a>
             </form>`
          : `<a href="${SELF}?confirm=${encodeURIComponent(b.id)}" class="reopen">Reopen</a>`;
      return `
        <tr${confirmCode === b.id ? ' class="active"' : ""}>
          <td>${b.checkin} → ${b.checkout}</td>
          <td>${who}</td>
          <td>${taxId}</td>
          <td>${amt}</td>
          <td class="muted">${escapeHtml(b.id)}</td>
          <td>${control}</td>
        </tr>`;
    })
    .join("");

  const body = `
    <h1>Confirmed bookings</h1>
    ${notice ? `<p class="notice">${notice}</p>` : ""}
    ${
      bookings.length === 0
        ? `<p class="muted">No confirmed direct bookings. (Airbnb/Booking.com bookings are not listed here — they live in those platforms.)</p>`
        : `<table>
            <tr><th>Dates</th><th>Guest</th><th>ΑΦΜ / ID</th><th>Paid</th><th>Order</th><th></th></tr>
            ${rows}
          </table>
          <p class="muted">“Reopen” deletes the booking from this site only and frees the dates immediately. It does not refund the guest or notify Airbnb/Booking.com.</p>`
    }`;
  return page("Bookings admin", body);
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
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:720px;margin:48px auto;padding:0 20px;color:#1f2d2b;line-height:1.5}
        h1{font-size:22px}
        table{border-collapse:collapse;margin:16px 0;width:100%}
        th,td{padding:8px 10px;border-bottom:1px solid #eee;text-align:left;vertical-align:middle}
        th{color:#888;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
        input[type=password]{padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-size:15px;width:100%;max-width:280px;margin:8px 0}
        button{background:#c65a3a;color:#fff;border:0;border-radius:9999px;padding:9px 18px;font-weight:600;font-size:14px;cursor:pointer}
        button.danger{background:#b23b2e;padding:6px 14px;font-size:13px}
        form{margin:0}
        a.reopen{color:#b23b2e;font-weight:600;font-size:13px;text-decoration:none}
        a.reopen:hover{text-decoration:underline}
        a.cancel{color:#888;font-size:13px;text-decoration:none}
        tr.active{background:#fff4e5}
        .muted{color:#888;font-size:13px}
        .notice{background:#fff4e5;border:1px solid #f0c987;border-radius:8px;padding:10px 12px;font-size:14px}
      </style></head><body>${body}</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
