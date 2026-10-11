import "server-only";

// Interswitch Quickteller bill-payment client (API v5).
// Docs: https://docs.interswitchgroup.com/docs/bills-payment-1
//
// Env:
//   INTERSWITCH_CLIENT_ID / INTERSWITCH_CLIENT_SECRET  OAuth credentials from the API Marketplace.
//   INTERSWITCH_TERMINAL_ID                            Issued by Interswitch; sent on every call.
//   INTERSWITCH_ENV                                    "live" (default) or "sandbox".
//   INTERSWITCH_BASE_URL / INTERSWITCH_TOKEN_URL       Optional overrides (confirm the live host with Interswitch).

const SANDBOX = {
  base: "https://qa.interswitchng.com/quicktellerservice/api/v5",
  token: "https://passport-sandbox.interswitchng.com/passport/oauth/token",
};
const LIVE = {
  base: "https://orion.interswitchng.com/quicktellerservice/api/v5",
  token: "https://passport.interswitchng.com/passport/oauth/token",
};

function config() {
  const env = process.env.INTERSWITCH_ENV === "sandbox" ? SANDBOX : LIVE;
  const clientId = process.env.INTERSWITCH_CLIENT_ID;
  const clientSecret = process.env.INTERSWITCH_CLIENT_SECRET;
  const terminalId = process.env.INTERSWITCH_TERMINAL_ID;
  if (!clientId || !clientSecret) throw new IswConfigError("Interswitch credentials are not configured.");
  if (!terminalId) throw new IswConfigError("INTERSWITCH_TERMINAL_ID is not set (Interswitch issues it).");
  return {
    base: process.env.INTERSWITCH_BASE_URL || env.base,
    tokenUrl: process.env.INTERSWITCH_TOKEN_URL || env.token,
    clientId,
    clientSecret,
    terminalId,
  };
}

export class IswConfigError extends Error {}

/** The request reached Interswitch and came back with an HTTP error. */
export class IswHttpError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`Interswitch HTTP ${status}`);
  }
}

/** Timeout / network failure: the outcome is unknown, so never treat it as a failure. */
export class IswUnknownOutcomeError extends Error {}

let cached: { token: string; expiresAt: number } | null = null;

async function getToken(force = false): Promise<string> {
  if (!force && cached && Date.now() < cached.expiresAt - 60_000) return cached.token;
  const c = config();
  const res = await fetch(c.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=profile",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new IswHttpError(res.status, await res.text().catch(() => ""));
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return cached.token;
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, timeoutMs = 30_000): Promise<T> {
  const c = config();
  const send = async (token: string) =>
    fetch(`${c.base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        TerminalID: c.terminalId,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });

  let res: Response;
  try {
    res = await send(await getToken());
    if (res.status === 401) res = await send(await getToken(true));
  } catch (err) {
    if (err instanceof IswHttpError || err instanceof IswConfigError) throw err;
    throw new IswUnknownOutcomeError(err instanceof Error ? err.message : "network error");
  }

  const text = await res.text().catch(() => "");
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) throw new IswHttpError(res.status, json);
  return json as T;
}

// ---- Catalogue -------------------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
}
export interface Biller {
  id: string;
  name: string;
  shortName: string;
  customerField: string;
}
export interface PaymentItem {
  name: string;
  paymentCode: string;
  consumerIdField: string;
  amountNaira: number;
  isAmountFixed: boolean;
}

export async function getCategories(): Promise<Category[]> {
  const r = await call<{ BillerCategories?: { Id: string | number; Name: string }[] }>("GET", "/services/categories");
  return (r.BillerCategories ?? []).map((c) => ({ id: String(c.Id), name: c.Name }));
}

export async function getBillers(categoryId: string): Promise<Biller[]> {
  const r = await call<{
    BillerList?: { Category?: { Billers?: { Id: string | number; Name: string; ShortName: string; CustomerField1: string }[] }[] };
  }>("GET", `/services?categoryId=${encodeURIComponent(categoryId)}`);
  return (r.BillerList?.Category ?? [])
    .flatMap((c) => c.Billers ?? [])
    .map((b) => ({ id: String(b.Id), name: b.Name, shortName: b.ShortName, customerField: b.CustomerField1 }));
}

export async function getPaymentItems(billerId: string): Promise<PaymentItem[]> {
  const r = await call<{
    PaymentItems?: { Name: string; PaymentCode: string; ConsumerIdField: string; Amount: string | number; IsAmountFixed: boolean }[];
  }>("GET", `/services/options?serviceid=${encodeURIComponent(billerId)}`);
  return (r.PaymentItems ?? []).map((i) => ({
    name: i.Name,
    paymentCode: String(i.PaymentCode),
    consumerIdField: i.ConsumerIdField,
    amountNaira: Number(i.Amount) / 100, // Interswitch amounts are in kobo
    isAmountFixed: Boolean(i.IsAmountFixed),
  }));
}

// ---- Validation and payment ------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  fullName?: string;
  /** Amount due in naira for postpaid bills, when the biller returns one. */
  amountNaira?: number;
}

export async function validateCustomer(paymentCode: string, customerId: string, amountNaira?: number): Promise<ValidationResult> {
  const c = config();
  const r = await call<{ Customers?: { ResponseCode: string; FullName?: string; Amount?: number }[] }>(
    "POST",
    "/Transactions/validatecustomers",
    {
      customers: [
        {
          PaymentCode: paymentCode,
          CustomerId: customerId,
          ...(amountNaira ? { Amount: String(Math.round(amountNaira * 100)) } : {}),
          WithDetails: true,
        },
      ],
      TerminalId: c.terminalId,
    }
  );
  const cust = r.Customers?.[0];
  return {
    valid: cust?.ResponseCode === "90000",
    fullName: cust?.FullName,
    amountNaira: cust?.Amount ? cust.Amount / 100 : undefined,
  };
}

export interface PayResponse {
  ResponseCode?: string;
  ResponseDescription?: string;
  TransactionRef?: string;
  RechargePIN?: string;
  AdditionalInfo?: Record<string, unknown> | null;
}

export async function submitPayment(input: {
  paymentCode: string;
  customerId: string;
  customerMobile: string;
  customerEmail?: string;
  amountNaira: number;
  requestReference: string;
}): Promise<PayResponse> {
  const c = config();
  return call<PayResponse>("POST", "/Transactions", {
    TerminalId: c.terminalId,
    paymentCode: input.paymentCode,
    customerId: input.customerId,
    customerMobile: input.customerMobile,
    ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
    amount: String(Math.round(input.amountNaira * 100)), // kobo, as a string
    requestReference: input.requestReference,
  });
}

export type RemoteStatus = "completed" | "pending" | "failed" | "reversed" | "unknown";

export interface StatusResponse {
  status: RemoteStatus;
  transactionRef?: string;
  raw: unknown;
}

/** Looks a payment up by our request reference. `unknown` also covers "not found". */
export async function queryStatus(requestReference: string): Promise<StatusResponse> {
  try {
    const r = await call<{ status?: string; transactionRef?: string }>(
      "GET",
      `/Transactions?requestRef=${encodeURIComponent(requestReference)}`
    );
    const s = String(r?.status ?? "").toLowerCase();
    const status: RemoteStatus =
      s === "completed" ? "completed" : s === "pending" ? "pending" : s === "failed" ? "failed" : s === "reversed" ? "reversed" : "unknown";
    return { status, transactionRef: r?.transactionRef, raw: r };
  } catch (err) {
    if (err instanceof IswHttpError) return { status: "unknown", raw: err.body };
    throw err;
  }
}
