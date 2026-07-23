#!/usr/bin/env node
// Stage 5 verifier — proves the Viva payment wiring works BEFORE anyone tries
// to pay. Every check maps to a box in GO_LIVE_CHECKLIST.txt.
//
//   npm run viva:check              # full run (creates one demo order)
//   npm run viva:check -- --no-order
//
// Reads VIVA_* from .env.local (or the ambient environment). It NEVER prints a
// secret — only masked fingerprints — so the output is safe to paste back.
//
// Why a script and not a route: the production secrets are stored encrypted on
// Vercel and cannot be read back, so the checks have to run somewhere the
// plaintext credentials exist. Point it at the DEMO credentials for Stage 5 and
// re-run it against the LIVE ones for Stage 7.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_ORDER = process.argv.includes("--no-order");
const ORDER_TIMEOUT_SEC = 30 * 60;
// Remembers the last order this script created, so the next run can tell you
// what became of it. Gitignored.
const LAST_ORDER_FILE = resolve(ROOT, ".viva-selfcheck.json");

const statusIdx = process.argv.indexOf("--status");
const STATUS_ONLY = statusIdx !== -1 ? process.argv[statusIdx + 1] : null;

// Viva order StateId enum.
const ORDER_STATE = {
  0: ["Pending", "created and still payable"],
  1: ["Expired", "the payment window elapsed before anyone paid"],
  2: ["Canceled", "cancelled before payment"],
  3: ["Paid", "someone completed payment — the checkout link is now consumed"],
};

// ---------------------------------------------------------------- env loading

/** Minimal .env parser: KEY=VALUE, optional surrounding quotes, # comments. */
function loadEnvFile(name) {
  let raw;
  try {
    raw = readFileSync(resolve(ROOT, name), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadEnvFile(".env.local");

const env = (k) => (process.env[k] || "").trim();
const isProd = env("VIVA_ENV") === "production";

const HOSTS = {
  accounts: isProd ? "https://accounts.vivapayments.com" : "https://demo-accounts.vivapayments.com",
  api: isProd ? "https://api.vivapayments.com" : "https://demo-api.vivapayments.com",
  // Legacy Payment API + hosted checkout share this host. Must match lib/viva.ts.
  payments: isProd ? "https://www.vivapayments.com" : "https://demo.vivapayments.com",
};

// ------------------------------------------------------------------- reporting

const C = process.stdout.isTTY
  ? { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" }
  : { g: "", r: "", y: "", d: "", b: "", x: "" };

const results = [];
function report(box, label, state, detail) {
  results.push({ box, state });
  const icon = { pass: `${C.g}PASS${C.x}`, fail: `${C.r}FAIL${C.x}`, warn: `${C.y}WARN${C.x}`, skip: `${C.d}SKIP${C.x}` }[state];
  console.log(`  [${icon}] ${C.b}${box}${C.x} ${label}`);
  if (detail) for (const l of String(detail).split("\n")) console.log(`         ${C.d}${l}${C.x}`);
}

/** Never reveal a secret: show only length + last 4 so two values can be compared. */
const mask = (v) => (v ? `set (len ${v.length}, …${v.slice(-4)})` : "MISSING");

const basic = (u, p) => Buffer.from(`${u}:${p}`).toString("base64");

async function req(url, init = {}) {
  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    const body = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: String(err) };
  }
}

/**
 * Explains what became of an order. This exists because a paid order's checkout
 * link returns 404 — identical to an expired one from the browser, but meaning
 * the opposite: the payment WORKED and consumed the link. Guessing between the
 * two sent us down the wrong path once already.
 */
async function describeOrder(orderCode) {
  const id = env("VIVA_MERCHANT_ID");
  const key = env("VIVA_API_KEY");
  if (!id || !key) return null;
  const auth = { Authorization: `Basic ${basic(id, key)}` };

  const o = await req(`${HOSTS.payments}/api/orders/${orderCode}`, { headers: auth });
  let order = null;
  try { order = JSON.parse(o.body); } catch { /* non-JSON */ }
  if (!order || typeof order.StateId !== "number") {
    return { orderCode, unknown: true, detail: `HTTP ${o.status} ${o.body.slice(0, 160)}` };
  }

  const t = await req(`${HOSTS.payments}/api/transactions?ordercode=${orderCode}`, { headers: auth });
  let txns = [];
  try {
    const parsed = JSON.parse(t.body);
    txns = parsed?.Transactions || (Array.isArray(parsed) ? parsed : []);
  } catch { /* non-JSON */ }

  return {
    orderCode,
    stateId: order.StateId,
    expiration: order.ExpirationDate,
    amount: order.RequestAmount,
    // "F" = successful. BankId tells you which scheme actually ran.
    txns: txns.map((x) => ({ id: x.TransactionId, status: x.StatusId, amount: x.Amount, bank: x.BankId, at: x.InsDate })),
  };
}

function printOrder(info) {
  if (!info) return;
  if (info.unknown) {
    console.log(`  order ${info.orderCode}: could not read — ${info.detail}`);
    return;
  }
  const [name, meaning] = ORDER_STATE[info.stateId] ?? ["Unknown", `StateId ${info.stateId}`];
  console.log(`  order ${info.orderCode}: ${C.b}${name}${C.x} — ${meaning}`);
  console.log(`  ${C.d}expires ${info.expiration} · ${info.amount}€ requested${C.x}`);
  for (const x of info.txns) {
    const ok = x.status === "F";
    console.log(`  ${ok ? C.g + "payment SUCCEEDED" + C.x : C.y + "transaction statusId=" + x.status + C.x} · ${x.amount}€ · ${x.bank} · ${x.at}`);
  }
  if (!info.txns.length) console.log(`  ${C.d}no transactions against this order${C.x}`);
}

// ----------------------------------------------------------------- the checks

if (STATUS_ONLY) {
  console.log(`\n${C.b}Order status${C.x} (${isProd ? "PRODUCTION" : "DEMO"})`);
  printOrder(await describeOrder(STATUS_ONLY));
  console.log("");
  process.exit(0);
}

console.log(`\n${C.b}Viva Stage-5 self-check${C.x}`);
console.log(`${C.d}VIVA_ENV=${env("VIVA_ENV") || "(unset → demo)"} → ${isProd ? "PRODUCTION (real money)" : "DEMO"}`);
console.log(`accounts: ${HOSTS.accounts}\napi:      ${HOSTS.api}\npayments: ${HOSTS.payments}${C.x}\n`);

// --- What happened to the order from the previous run? -----------------------
{
  let prev = null;
  try { prev = JSON.parse(readFileSync(LAST_ORDER_FILE, "utf8")).orderCode; } catch { /* first run */ }
  if (prev) {
    console.log(`${C.b}Previous self-check order${C.x}`);
    printOrder(await describeOrder(prev));
    console.log("");
  }
}

// --- 5.1 / 5.2  Smart Checkout OAuth credentials -----------------------------
console.log(`${C.b}Smart Checkout (OAuth)${C.x}`);
const clientId = env("VIVA_CLIENT_ID");
const clientSecret = env("VIVA_CLIENT_SECRET");
const sourceCode = env("VIVA_SOURCE_CODE");

let token = null;
if (!clientId || !clientSecret) {
  report("5.1", "VIVA_CLIENT_ID / VIVA_CLIENT_SECRET", "fail",
    `VIVA_CLIENT_ID: ${mask(clientId)}\nVIVA_CLIENT_SECRET: ${mask(clientSecret)}`);
} else {
  const r = await req(`${HOSTS.accounts}/connect/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  let parsed = null;
  try { parsed = JSON.parse(r.body); } catch { /* non-JSON error page */ }
  token = parsed?.access_token || null;
  if (token) {
    report("5.1", "OAuth client credentials accepted", "pass",
      `token issued, expires_in=${parsed.expires_in}s`);
  } else {
    report("5.1", "OAuth client credentials REJECTED", "fail",
      `HTTP ${r.status} — ${r.body.slice(0, 300)}\n` +
      `Check Settings > API Access in the ${isProd ? "LIVE" : "DEMO"} portal.`);
  }
}

// --- 5.2 / 5.3  Source code, by creating a real order ------------------------
if (!sourceCode) {
  report("5.2", "VIVA_SOURCE_CODE missing", "fail", "Sales > Websites/Apps in the Viva portal.");
} else if (!token) {
  report("5.2", "VIVA_SOURCE_CODE not testable (no token)", "skip");
} else if (SKIP_ORDER) {
  report("5.2", `VIVA_SOURCE_CODE present (${sourceCode}) — not verified`, "skip", "--no-order given.");
} else if (isProd) {
  report("5.2", `VIVA_SOURCE_CODE present (${sourceCode}) — not verified`, "skip",
    "Refusing to create an order against PRODUCTION (that would be a real payable link).");
} else {
  const r = await req(`${HOSTS.api}/checkout/v2/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: 100, // 1.00 EUR of demo money (Viva demo needs >= 0.30 EUR)
      customerTrns: "Stage 5 self-check (demo, TEST CARDS ONLY)",
      customer: { countryCode: "GR", requestLang: "en-GB" },
      // 30 min. This is a link a HUMAN has to walk over to and pay: too short a
      // timeout and the checkout 404s before they get there, which reads as a
      // broken integration rather than an expired order.
      paymentTimeout: ORDER_TIMEOUT_SEC,
      isPreAuth: true, // exercises the same path the damage deposit uses
      allowRecurring: false,
      maxInstallments: 0,
      disableCash: true,
      sourceCode,
      merchantTrns: "SELFCHECK",
      tags: ["selfcheck"],
    }),
  });
  let orderCode = null;
  try { orderCode = JSON.parse(r.body)?.orderCode ?? null; } catch { /* non-JSON */ }

  if (orderCode) {
    const url = `${HOSTS.payments}/web/checkout?ref=${orderCode}`;
    report("5.2", `Source code ${sourceCode} accepted; pre-auth order created`, "pass", `orderCode ${orderCode}`);
    const expiresAt = new Date(Date.now() + ORDER_TIMEOUT_SEC * 1000);
    try {
      writeFileSync(LAST_ORDER_FILE, JSON.stringify({ orderCode, createdAt: new Date().toISOString() }));
    } catch { /* best effort */ }

    report("5.3", "Redirect URLs — needs your eyes (Viva exposes no read API)", "warn",
      `Open this DEMO checkout, pay it, and WATCH WHERE THE BROWSER GOES:\n` +
      `  ${url}\n` +
      `\n` +
      `*** TEST CARDS ONLY — NEVER a real card, even though this is demo. ***\n` +
      `  4147 4630 1111 0133   any 3-digit CVV, any future expiry -> SUCCESS\n` +
      `  4147 4630 1111 0141   same                               -> FAILURE\n` +
      `\n` +
      `PASS: the browser lands on ${env("NEXT_PUBLIC_SITE_URL") || "https://www.cocosapartments.com"}/booking/success\n` +
      `FAIL: you get an error page or a 404 IMMEDIATELY AFTER paying. That means\n` +
      `      the payment worked and the source's Success URL is missing/wrong —\n` +
      `      it is the redirect that broke, not the payment.\n` +
      `\n` +
      `READ THIS BEFORE PANICKING ABOUT A 404:\n` +
      `  Once an order is PAID its checkout link 404s forever — the link is\n` +
      `  consumed. That looks identical to an expired link but means the\n` +
      `  opposite. Re-run this script and it will tell you which one happened\n` +
      `  ("Previous self-check order" at the top), or ask directly:\n` +
      `      npm run viva:check -- --status ${orderCode}\n` +
      `  This link otherwise expires ${expiresAt.toLocaleTimeString()} (${ORDER_TIMEOUT_SEC / 60} min).\n` +
      `\n` +
      `EXPECTED SIDE EFFECT: paying this fires the real webhook at production,\n` +
      `which cannot match "SELFCHECK" to a booking, so you WILL get one owner\n` +
      `"unmatched payment — review in Viva" email. That is correct behaviour and\n` +
      `is itself proof the webhook pipeline works. Ignore/delete that one email.`);
  } else {
    report("5.2", "Order creation FAILED — source code likely wrong", "fail",
      `HTTP ${r.status} — ${r.body.slice(0, 400)}`);
    report("5.3", "Not testable until 5.2 passes", "skip");
  }
}

// --- 5.4  Webhook verification key ------------------------------------------
console.log(`\n${C.b}Webhook${C.x}`);
const merchantId = env("VIVA_MERCHANT_ID");
const apiKey = env("VIVA_API_KEY");
const localWebhookKey = env("VIVA_WEBHOOK_VERIFICATION_KEY");

if (!merchantId || !apiKey) {
  report("5.4", "Cannot fetch verification key", "skip",
    `VIVA_MERCHANT_ID: ${mask(merchantId)}\nVIVA_API_KEY: ${mask(apiKey)}`);
} else {
  const r = await req(`${HOSTS.payments}/api/messages/config/token`, {
    headers: { Authorization: `Basic ${basic(merchantId, apiKey)}` },
  });
  let key = null;
  try { key = JSON.parse(r.body)?.Key ?? null; } catch { /* non-JSON */ }
  if (key) {
    const matches = localWebhookKey ? key === localWebhookKey : null;
    report("5.4", "Payment API Basic auth works; verification key retrieved",
      matches === false ? "fail" : "pass",
      matches === null
        ? "VIVA_WEBHOOK_VERIFICATION_KEY not set here, so no comparison was made."
        : matches
          ? "Matches the configured VIVA_WEBHOOK_VERIFICATION_KEY."
          : "MISMATCH — VIVA_WEBHOOK_VERIFICATION_KEY does not match this account's key.");
  } else {
    report("5.4", "Payment API Basic auth REJECTED", "fail",
      `HTTP ${r.status} — ${r.body.slice(0, 300)}\n` +
      "VIVA_MERCHANT_ID / VIVA_API_KEY are wrong, or belong to the other environment.");
  }
}

// --- 5.5  Live webhook endpoint ---------------------------------------------
const siteUrl = (env("NEXT_PUBLIC_SITE_URL") || "https://www.cocosapartments.com").replace(/\/$/, "");
{
  const r = await req(`${siteUrl}/api/viva/webhook`);
  let key = null;
  try { key = JSON.parse(r.body)?.Key ?? null; } catch { /* non-JSON */ }
  if (key) {
    report("5.5", "Live webhook endpoint answers Viva's verification GET", "pass", `${siteUrl}/api/viva/webhook`);
  } else {
    report("5.5", "Live webhook endpoint did NOT return a Key", "fail",
      `HTTP ${r.status} — ${r.body.slice(0, 200)}\n` +
      "Viva cannot register the webhook until this returns {\"Key\":\"…\"}.");
  }
}

// --- 5.3  Redirect targets must exist (and not redirect) ---------------------
console.log(`\n${C.b}Redirect targets${C.x}`);
for (const path of ["/booking/success", "/booking/failure"]) {
  const r = await req(`${siteUrl}${path}`, { redirect: "manual" });
  if (r.status === 200) {
    report("5.3", `${siteUrl}${path} reachable`, "pass");
  } else if (r.status >= 300 && r.status < 400) {
    report("5.3", `${siteUrl}${path} REDIRECTS (${r.status})`, "fail",
      "Use the exact final URL in Viva — a 3xx can break strict redirect matching.");
  } else {
    report("5.3", `${siteUrl}${path} not reachable`, "fail", `HTTP ${r.status}`);
  }
}

// --- 5.6  Pre-auth capture permission ---------------------------------------
console.log(`\n${C.b}Deposit (pre-auth capture)${C.x}`);
if (!merchantId || !apiKey) {
  report("5.6", "VIVA_MERCHANT_ID / VIVA_API_KEY missing", "fail",
    "Without these the owner must resolve every deposit hold in the Viva portal.");
} else {
  // Probe with a transaction id that cannot exist. We are reading the SHAPE of
  // the rejection, not trying to capture anything:
  //   "api action is disabled" -> Settings > API Access checkbox is OFF
  //   not-found / 404          -> credentials + permission are fine
  const fakeTxn = "00000000-0000-0000-0000-000000000000";
  const r = await req(`${HOSTS.payments}/api/transactions/${fakeTxn}`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic(merchantId, apiKey)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 100, currencyCode: "978", customerTrns: "selfcheck probe" }),
  });
  const body = r.body.toLowerCase();
  // The Payment API answers business errors with HTTP 200 and an envelope, so
  // read ErrorCode/ErrorText rather than the status code alone.
  let env200 = null;
  try { env200 = JSON.parse(r.body); } catch { /* non-JSON */ }
  const errText = env200?.ErrorText ?? env200?.errorText ?? null;
  const errCode = env200?.ErrorCode ?? env200?.errorCode ?? null;
  const statusId = env200?.StatusId ?? env200?.statusId ?? null;
  const envelope = env200
    ? `StatusId=${statusId} ErrorCode=${errCode} ErrorText=${errText ?? "(none)"}`
    : r.body.slice(0, 300) || "(empty body)";

  if (body.includes("api action is disabled")) {
    report("5.6", "Pre-auth capture via API is DISABLED on this account", "fail",
      `HTTP ${r.status} — ${r.body.slice(0, 300)}\n` +
      "Fix: Viva portal > Settings > API Access >\n" +
      '      tick "Allow recurring payments and pre-auth captures via API", save, re-run.');
  } else if (r.status === 401 || r.status === 403) {
    report("5.6", "Payment API rejected the credentials", "fail",
      `HTTP ${r.status} — ${r.body.slice(0, 300)}`);
  } else {
    report("5.6", "Pre-auth capture is permitted", "pass",
      `HTTP ${r.status} — ${envelope}\n` +
      "Reading: the endpoint authenticated us and processed the request, then\n" +
      "failed it because the probe transaction id does not exist. It did NOT say\n" +
      '"api action is disabled", so the API Access checkbox is on.\n' +
      "This is an indirect probe — the direct proof is 6.6, releasing a real hold.");
  }
}

// ------------------------------------------------------------------- summary

const fails = results.filter((r) => r.state === "fail");
const warns = results.filter((r) => r.state === "warn");
console.log(`\n${C.b}Summary${C.x}`);
console.log(`  ${results.filter((r) => r.state === "pass").length} pass · ${fails.length} fail · ${warns.length} need a human · ${results.filter((r) => r.state === "skip").length} skipped`);
if (fails.length) {
  console.log(`  ${C.r}Blocking:${C.x} ${[...new Set(fails.map((f) => f.box))].join(", ")}`);
}
if (warns.length) {
  console.log(`  ${C.y}Manual:${C.x}   ${[...new Set(warns.map((w) => w.box))].join(", ")}`);
}
console.log("");
process.exit(fails.length ? 1 : 0);
