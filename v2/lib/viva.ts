// Viva.com Smart Checkout client. Everything here is config-gated: with no
// VIVA_* env vars set, isVivaConfigured() is false and no payment code runs,
// so the site behaves exactly as it did before payments were added.
//
// Environment is selected by VIVA_ENV ("production" enables live hosts; any
// other value — including unset — uses Viva's demo environment).

const isProd = process.env.VIVA_ENV === "production";

const HOSTS = {
  // OAuth2 client-credentials token endpoint.
  accounts: isProd ? "https://accounts.vivapayments.com" : "https://demo-accounts.vivapayments.com",
  // REST API (create order, retrieve transaction).
  api: isProd ? "https://api.vivapayments.com" : "https://demo-api.vivapayments.com",
  // Hosted Smart Checkout page the customer is redirected to.
  checkout: isProd ? "https://www.vivapayments.com" : "https://demo.vivapayments.com",
};

/** True only when the credentials needed to create a payment order exist. */
export function isVivaConfigured(): boolean {
  return Boolean(
    process.env.VIVA_CLIENT_ID && process.env.VIVA_CLIENT_SECRET && process.env.VIVA_SOURCE_CODE
  );
}

/**
 * Capturing/releasing a pre-auth uses the legacy Payment API with BASIC auth
 * (Merchant ID : API key) — different credentials from the OAuth Smart Checkout
 * client above. When these aren't set, the owner resolves the hold in the Viva
 * portal instead and the app just records the decision.
 */
export function isDepositCaptureConfigured(): boolean {
  return Boolean(process.env.VIVA_MERCHANT_ID && process.env.VIVA_API_KEY);
}

function paymentApiBasicAuth(): string {
  const id = process.env.VIVA_MERCHANT_ID;
  const key = process.env.VIVA_API_KEY;
  if (!id || !key) throw new Error("viva: VIVA_MERCHANT_ID / VIVA_API_KEY not set");
  return Buffer.from(`${id}:${key}`).toString("base64");
}

const EUR_CURRENCY_CODE = "978"; // ISO 4217 numeric for EUR, per Viva Payment API

async function getAccessToken(): Promise<string> {
  const basic = Buffer.from(
    `${process.env.VIVA_CLIENT_ID}:${process.env.VIVA_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${HOSTS.accounts}/connect/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`viva: token request failed (${res.status})`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("viva: token response missing access_token");
  return json.access_token;
}

export interface CreateOrderInput {
  amountEur: number; // full euros; converted to minor units here
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  lang: "el" | "en";
  merchantTrns: string; // internal reference (not shown to customer)
  customerTrns: string; // description shown to the customer at checkout
  isPreAuth?: boolean; // true = place a hold (deposit), don't capture
  paymentTimeoutSec?: number; // how long the checkout link stays payable
}

export interface CreatedOrder {
  orderCode: number;
  checkoutUrl: string;
}

/** Creates a Smart Checkout payment order and returns its hosted checkout URL. */
export async function createPaymentOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const token = await getAccessToken();

  const body = {
    amount: Math.round(input.amountEur * 100), // Viva expects minor units (cents)
    customerTrns: input.customerTrns,
    customer: {
      email: input.customerEmail,
      fullName: input.customerName,
      phone: input.customerPhone,
      countryCode: "GR",
      requestLang: input.lang === "en" ? "en-GB" : "el-GR",
    },
    paymentTimeout: input.paymentTimeoutSec ?? 1800, // seconds link stays payable
    isPreAuth: Boolean(input.isPreAuth), // true = authorize/hold, capture later
    allowRecurring: false,
    maxInstallments: 0,
    disableCash: true,
    disableWallet: false,
    sourceCode: process.env.VIVA_SOURCE_CODE,
    merchantTrns: input.merchantTrns,
    tags: input.isPreAuth ? ["direct-booking", "deposit-hold"] : ["direct-booking"],
  };

  const res = await fetch(`${HOSTS.api}/checkout/v2/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`viva: create order failed (${res.status}) ${detail}`);
  }

  const json = (await res.json()) as { orderCode?: number };
  if (!json.orderCode) throw new Error("viva: order response missing orderCode");

  return {
    orderCode: json.orderCode,
    checkoutUrl: `${HOSTS.checkout}/web/checkout?ref=${json.orderCode}`,
  };
}

export interface VivaTransaction {
  statusId: string; // "F" = finished/successful
  amount: number; // minor units
  orderCode: number;
  email?: string;
  fullName?: string;
  // Our internal reference, set by us at order creation. Because it comes back
  // over this authenticated retrieve (not the public webhook body), it is
  // trustworthy: it's the canonical carrier of the booking's dates/lang/email.
  merchantTrns?: string;
}

/**
 * Retrieves a transaction from Viva to authoritatively confirm a payment.
 * Webhook POST bodies are public and unauthenticated, so we never trust them
 * directly — we re-fetch the transaction with our own credentials and read the
 * status, amount, order code and merchantTrns from THIS response before
 * treating a booking as paid.
 */
export async function retrieveTransaction(transactionId: string): Promise<VivaTransaction | null> {
  const token = await getAccessToken();

  const res = await fetch(`${HOSTS.api}/checkout/v2/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const json = (await res.json()) as Partial<VivaTransaction>;
  if (typeof json.statusId !== "string" || typeof json.amount !== "number") return null;

  return {
    statusId: json.statusId,
    amount: json.amount,
    orderCode: json.orderCode ?? 0,
    email: json.email,
    fullName: json.fullName,
    merchantTrns: typeof json.merchantTrns === "string" ? json.merchantTrns : undefined,
  };
}

export interface PreauthActionResult {
  ok: boolean;
  status: number;
  detail?: string;
}

/**
 * Captures (charges) up to `amountCents` of a pre-authorization hold — used to
 * take a damage deposit after checkout. Uses the Payment API with Basic auth.
 * `amountCents` must be ≤ the originally authorized amount.
 */
export async function capturePreauth(
  preauthTransactionId: string,
  amountCents: number
): Promise<PreauthActionResult> {
  const res = await fetch(`${HOSTS.api}/api/transactions/${preauthTransactionId}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${paymentApiBasicAuth()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Amount: Math.round(amountCents) }),
    cache: "no-store",
  });
  const detail = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, detail: detail || undefined };
}

/**
 * Releases (voids) a pre-authorization hold without charging — the normal,
 * no-damage outcome. For an uncaptured pre-auth this cancels the hold so the
 * funds free up on the guest's card. Uses the Payment API with Basic auth.
 */
export async function releasePreauth(
  preauthTransactionId: string,
  amountCents: number
): Promise<PreauthActionResult> {
  const params = new URLSearchParams({
    amount: String(Math.round(amountCents)),
    currencyCode: EUR_CURRENCY_CODE,
  });
  const sourceCode = process.env.VIVA_SOURCE_CODE;
  if (sourceCode) params.set("sourceCode", sourceCode);

  const res = await fetch(
    `${HOSTS.api}/api/transactions/${preauthTransactionId}/?${params.toString()}`,
    {
      method: "DELETE",
      headers: { Authorization: `Basic ${paymentApiBasicAuth()}` },
      cache: "no-store",
    }
  );
  const detail = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, detail: detail || undefined };
}
