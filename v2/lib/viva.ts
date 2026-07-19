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
    paymentTimeout: 1800, // seconds the checkout link stays payable
    preauth: false,
    allowRecurring: false,
    maxInstallments: 0,
    disableCash: true,
    disableWallet: false,
    sourceCode: process.env.VIVA_SOURCE_CODE,
    merchantTrns: input.merchantTrns,
    tags: ["direct-booking"],
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
}

/**
 * Retrieves a transaction from Viva to authoritatively confirm a payment.
 * Webhook POST bodies are public and unauthenticated, so we never trust them
 * directly — we re-fetch the transaction with our own credentials and check
 * its status and amount before treating a booking as paid.
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
  };
}
