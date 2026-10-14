import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// Paystack client. Docs: https://paystack.com/docs/api/transaction/
// Env: PAYSTACK_SECRET_KEY. Use an sk_test_… key locally; live keys are refused outside production so a dev
// machine can never charge a real card by accident.

export class PaystackConfigError extends Error {}
export class PaystackUnavailableError extends Error {}

function secret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaystackConfigError("PAYSTACK_SECRET_KEY is not set.");
  if (key.startsWith("sk_live_") && process.env.NODE_ENV !== "production") {
    throw new PaystackConfigError("Live Paystack keys are blocked outside production. Use a test key (sk_test_…).");
  }
  return key;
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const key = secret();
  let res: Response;
  try {
    res = await fetch(`https://api.paystack.co${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new PaystackUnavailableError(err instanceof Error ? err.message : "Paystack unreachable");
  }
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !json || json.status === false || json.data === undefined) {
    throw new PaystackUnavailableError(`Paystack ${res.status}: ${json?.message ?? "bad response"}`);
  }
  return json.data;
}

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
}): Promise<{ authorizationUrl: string }> {
  const data = await call<{ authorization_url: string }>("POST", "/transaction/initialize", {
    email: input.email,
    amount: String(input.amountKobo),
    currency: "NGN",
    reference: input.reference,
    callback_url: input.callbackUrl,
  });
  return { authorizationUrl: data.authorization_url };
}

export interface PaystackTransaction {
  status: string; // success | failed | abandoned | ongoing | pending | processing | queued | reversed
  reference: string;
  amount: number; // kobo
  currency: string;
  id?: number;
}

export async function verifyTransaction(reference: string): Promise<PaystackTransaction> {
  return call<PaystackTransaction>("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Paystack signs the raw webhook body with HMAC-SHA512 using the secret key (header x-paystack-signature). */
export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secret()).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ================= Paystack Transfers (Payouts / Real Withdrawals) =================

export interface ResolvedAccount {
  account_number: string;
  account_name: string;
}

/** Verifies a 10-digit NUBAN account number against a Nigerian bank code. */
export async function resolveAccountName(accountNumber: string, bankCode: string): Promise<ResolvedAccount> {
  const q = new URLSearchParams({ account_number: accountNumber, bank_code: bankCode }).toString();
  return call<ResolvedAccount>("GET", `/bank/resolve?${q}`);
}

export interface TransferRecipient {
  recipient_code: string;
  name: string;
  details?: {
    account_number: string;
    account_name: string;
    bank_code: string;
    bank_name: string;
  };
}

/** Creates a transfer recipient on Paystack for sending money to a bank account. */
export async function createTransferRecipient(input: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<TransferRecipient> {
  return call<TransferRecipient>("POST", "/transferrecipient", {
    type: "nuban",
    name: input.name,
    account_number: input.accountNumber,
    bank_code: input.bankCode,
    currency: "NGN",
  });
}

export interface TransferOutcome {
  reference: string;
  transfer_code: string;
  amount: number;
  status: string; // success | pending | otp | failed
}

/** Initiates a transfer from your Paystack merchant balance to a customer's bank account. */
export async function initiateTransfer(input: {
  amountKobo: number;
  recipientCode: string;
  reason: string;
  reference: string;
}): Promise<TransferOutcome> {
  return call<TransferOutcome>("POST", "/transfer", {
    source: "balance",
    amount: input.amountKobo,
    recipient: input.recipientCode,
    reason: input.reason,
    reference: input.reference,
  });
}

