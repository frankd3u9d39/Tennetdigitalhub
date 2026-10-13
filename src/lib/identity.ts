import "server-only";
import { randomBytes } from "crypto";
import { pool } from "./pg";
import { getAccount } from "./db";
import { settle } from "./bills";
import { IDENTITY_LABEL, SLIP_LABEL, SLIP_TIERS, type IdentityType, type SlipTier } from "./identity-prices";
import { getSettings } from "./settings";
import type { ProviderName } from "./bill-providers/types";

// Real NIN / BVN lookups and PDF slips through:
// - CheckMyNINBVN (https://checkmyninbvn.com/documentation) - Primary verification provider
// - AYGlobalData (https://ayglobaldata.com/api-docs/) - VTU, Slips and fallback verification
//
// Env:
//   CHECKMYNINBVN_API_KEY              CheckMyNINBVN key (x-api-key header)
//   CHECKMYNINBVN_BASE_URL             defaults to https://checkmyninbvn.com/api
//   CHECKMYNINBVN_ENABLED=true         optional toggle (defaults to true when key present)
//
//   AYGLOBAL_API_KEY                   AYGlobalData token (Authorization: Token ...)
//   AYGLOBAL_BASE_URL                  defaults to https://ayglobaldata.com
//   AYGLOBAL_ENABLED=true              optional toggle (defaults to true when key present)
//
// Money rules: the wallet is debited FIRST (atomically), and refunded unless the customer actually receives what they
// paid for (no record found, provider down, timeout, bad response: all refunded). Prices come from the server.
//
// Privacy rules: only a masked number and the name are stored for the history. DOB, phone, photo and the PDF are returned
// once and never saved or logged by us. Numbers and results are never written to logs.

export class IdentityError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface IdentityResult {
  reference: string;
  type: IdentityType;
  /** Masked, e.g. •••••••1234 */
  idNumber: string;
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  /** Base64 image data, or null. Shown once; never stored. */
  photo: string | null;
  costNaira: number;
}

export interface SlipResult {
  reference: string;
  type: IdentityType;
  tier: SlipTier;
  idNumber: string;
  filename: string;
  /** The PDF, base64-encoded. Passed straight to the browser; never stored. */
  pdfBase64: string;
  costNaira: number;
}

type Kind = "lookup" | "slip";

const MAX_CALLS_PER_HOUR = 30;
const LOOKUP_SLIP_TYPE = "standard";

function enabled() {
  return (
    (Boolean(process.env.CHECKMYNINBVN_API_KEY) && process.env.CHECKMYNINBVN_ENABLED !== "false") ||
    (Boolean(process.env.AYGLOBAL_API_KEY) && process.env.AYGLOBAL_ENABLED !== "false")
  );
}

const mask = (n: string) => `•••••••${n.slice(-4)}`;
const makeReference = () => `TDV${Date.now().toString(36)}${randomBytes(4).toString("hex")}`.toUpperCase().slice(0, 20);

interface Reply {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
}

/** Calls CheckMyNINBVN API (https://checkmyninbvn.com/documentation) */
async function callCheckMyNinBvn(type: IdentityType, number: string): Promise<Reply> {
  const key = process.env.CHECKMYNINBVN_API_KEY;
  if (!key) throw new IdentityError("CheckMyNINBVN is not configured.", 503);
  const base = (process.env.CHECKMYNINBVN_BASE_URL || "https://checkmyninbvn.com/api").replace(/\/+$/, "");
  const endpoint = type === "nin" ? `${base}/nin-verification` : `${base}/bvn-verification`;
  const body = type === "nin" ? { nin: number, consent: true } : { bvn: number, consent: true };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });
  const text = await res.text().catch(() => "");
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

/** Calls AYGlobalData verify endpoint (https://ayglobaldata.com/api-docs/#verify-id) */
async function callAyGlobalVerify(type: IdentityType, number: string, slipType?: string): Promise<Reply> {
  const key = process.env.AYGLOBAL_API_KEY;
  if (!key) throw new IdentityError("AYGlobalData is not configured.", 503);
  const base = (process.env.AYGLOBAL_BASE_URL || "https://ayglobaldata.com").replace(/\/+$/, "");
  const res = await fetch(`${base}/api/verify/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      type,
      method: type,
      slip_type: slipType || "standard",
      value: number,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await res.text().catch(() => "");
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}



interface Charge {
  userId: string;
  type: IdentityType;
  kind: Kind;
  masked: string;
  number: string;
  reference: string;
  price: number;
}

async function recordAttempt(c: Charge, input: { subjectName: string | null; status: "successful" | "failed"; cost: number }) {
  await pool.query(
    `insert into public.verification_records (user_id, type, queried, subject_name, status, cost, consent, reference, kind)
     values ($1, $2, $3, $4, $5, $6, true, $7, $8)`,
    [c.userId, c.type.toUpperCase(), c.masked, input.subjectName, input.status, input.cost, c.reference, c.kind]
  );
}

/** Validates, then takes the money atomically and records a pending ledger row. Throws before any charge if refused. */
async function beginCharge(input: {
  email: string;
  type: IdentityType;
  number: unknown;
  consent: unknown;
  kind: Kind;
  tier?: SlipTier;
  expectedPrice?: unknown;
}): Promise<Charge> {
  const { type, kind } = input;
  if (!enabled()) throw new IdentityError("NIN and BVN verification isn't available right now.", 503);
  if (type !== "nin" && type !== "bvn") throw new IdentityError("Unknown verification type.");
  const number = String(input.number ?? "").replace(/\s/g, "");
  if (!/^\d{11}$/.test(number)) throw new IdentityError(`Enter a valid 11-digit ${type.toUpperCase()}.`);
  if (input.consent !== true) throw new IdentityError("Confirm that the person has given consent to this check.");
  if (kind === "slip" && !(input.tier && SLIP_TIERS.includes(input.tier))) throw new IdentityError("Choose a slip type.");

  const settings = await getSettings();
  if (!settings.services[type]) throw new IdentityError("This verification is temporarily unavailable.", 503);
  const price = kind === "slip" ? settings.pricing.slips[type][input.tier!] : settings.pricing.identity[type];
  const cost = kind === "slip" ? settings.pricing.slipCost[type][input.tier!] : settings.pricing.identityCost[type];
  if (input.expectedPrice !== undefined && Number(input.expectedPrice) !== price) {
    throw new IdentityError("The price has changed. Please review the new price and try again.", 409);
  }
  const label = kind === "slip" ? SLIP_LABEL[type] : IDENTITY_LABEL[type];
  const masked = mask(number);
  const account = await getAccount(input.email);
  const reference = makeReference();

  const client = await pool.connect();
  try {
    await client.query("begin");

    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [`identity:${account.userId}`]);

    const recent = await client.query(
      `select count(*)::int as n from public.verification_records where user_id = $1 and created_at > now() - interval '1 hour'`,
      [account.userId]
    );
    if (recent.rows[0].n >= MAX_CALLS_PER_HOUR) {
      await client.query("rollback");
      throw new IdentityError("Hourly verification limit reached. Please try again later.", 429);
    }
    const inFlight = await client.query(
      `select 1 from public.ledger_entries
        where user_id = $1 and status = 'pending' and direction = 'debit' and label = any($2) and created_at > now() - interval '120 seconds'`,
      [account.userId, [IDENTITY_LABEL.nin, IDENTITY_LABEL.bvn, SLIP_LABEL.nin, SLIP_LABEL.bvn]]
    );
    if (inFlight.rowCount) {
      await client.query("rollback");
      throw new IdentityError("A verification is already in progress. Please wait a moment.", 429);
    }

    const debited = await client.query(
      `update public.wallets set balance = balance - $2 where id = $1 and balance >= $2 returning balance`,
      [account.walletId, price]
    );
    if (debited.rowCount === 0) {
      await client.query("rollback");
      throw new IdentityError("Insufficient wallet balance.", 402);
    }
    await client.query(
      `insert into public.ledger_entries (user_id, label, detail, amount, direction, status, reference, cost_amount)
       values ($1, $2, $3, $4, 'debit', 'pending', $5, $6)`,
      [account.userId, label, masked, price, reference, cost]
    );
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  return { userId: account.userId, type, kind, masked, number, reference, price };
}

/** Anything other than a delivered result: refund in full and tell the customer. */
async function refundCharge(c: Charge, message: string, status: number, provider: ProviderName = "checkmyninbvn", notFound = false): Promise<never> {
  await settle(c.reference, "failed", { provider });
  await recordAttempt(c, { subjectName: null, status: "failed", cost: 0 }).catch(() => {});
  throw new IdentityError(notFound ? message : `${message} You were not charged.`, status);
}

/** Maps a provider answer that is NOT a delivered result to a refund. Never logs the number or the response body. */
async function failFromReply(c: Charge, reply: Reply, provider: ProviderName = "checkmyninbvn"): Promise<never> {
  const message = String(reply.json?.error ?? reply.json?.message ?? reply.json?.msg ?? "");
  console.error(`[identity] ${c.type} ${c.kind} not delivered by ${provider} (HTTP ${reply.status})`);

  if (reply.status === 400 && /no record|not found|does not exist/i.test(message)) {
    return refundCharge(c, `No matching record was found for this ${c.type.toUpperCase()}. You were not charged.`, 404, provider, true);
  }
  if ([401, 402, 403, 429].includes(reply.status) || /insufficient|balance/i.test(message)) {
    return refundCharge(c, "Verification is temporarily unavailable.", 503, provider);
  }
  if (reply.status === 400) return refundCharge(c, message || "The provider couldn't verify this number.", 400, provider);
  return refundCharge(c, "We couldn't complete the verification. Please try again.", 503, provider);
}

export async function lookupIdentity(input: {
  email: string;
  type: IdentityType;
  number: string;
  consent: boolean;
  expectedPrice?: unknown;
}): Promise<IdentityResult> {
  const c = await beginCharge({ ...input, kind: "lookup" });

  let reply: Reply;
  let activeProvider: ProviderName = "checkmyninbvn";

  try {
    if (process.env.CHECKMYNINBVN_API_KEY && process.env.CHECKMYNINBVN_ENABLED !== "false") {
      activeProvider = "checkmyninbvn";
      reply = await callCheckMyNinBvn(c.type, c.number);
    } else if (process.env.AYGLOBAL_API_KEY && process.env.AYGLOBAL_ENABLED !== "false") {
      activeProvider = "ayglobal";
      reply = await callAyGlobalVerify(c.type, c.number, LOOKUP_SLIP_TYPE);
    } else {
      return refundCharge(c, "No identity verification provider configured.", 503, activeProvider);
    }
  } catch {
    return refundCharge(c, "We couldn't complete the verification. Please try again.", 503, activeProvider);
  }

  const j = reply.json;
  const isOk = reply.status === 200 && (String(j?.status).toLowerCase() === "success" || String(j?.status).toLowerCase() === "successful");
  const data = j?.data;

  if (isOk && data) {
    const firstName = String(data.firstname ?? data.first_name ?? "").trim();
    const middleName = String(data.middlename ?? data.middle_name ?? "").trim();
    const lastName = String(data.surname ?? data.lastname ?? data.last_name ?? "").trim();
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    const dob = String(data.birthdate ?? data.dob ?? data.birth_date ?? "");
    const gender = String(data.gender ?? "");
    const phone = String(data.telephoneno ?? data.phone ?? data.phone_number ?? "");
    const photo = typeof data.photo === "string" && data.photo.length > 0 ? data.photo : null;
    const providerRef = j?.reportID ? String(j.reportID) : j?.reference ? String(j.reference) : undefined;

    await settle(c.reference, "successful", { provider: activeProvider, providerRef });
    await recordAttempt(c, { subjectName: fullName || null, status: "successful", cost: c.price }).catch(() =>
      console.error("[identity] could not save the history record")
    );

    return {
      reference: c.reference,
      type: c.type,
      idNumber: c.masked,
      fullName,
      firstName,
      middleName,
      lastName,
      dateOfBirth: dob,
      gender,
      phone,
      photo,
      costNaira: c.price,
    };
  }

  return failFromReply(c, reply, activeProvider);
}

/** A genuine PDF starts with "%PDF-", which is "JVBERi0" in base64. */
const looksLikePdf = (b64: unknown): b64 is string => typeof b64 === "string" && b64.length > 200 && b64.startsWith("JVBERi0");

export async function slipIdentity(input: {
  email: string;
  type: IdentityType;
  number: string;
  consent: boolean;
  tier: SlipTier;
  expectedPrice?: unknown;
}): Promise<SlipResult> {
  const c = await beginCharge({ ...input, kind: "slip" });

  let reply: Reply;
  let activeProvider: ProviderName = "ayglobal";

  try {
    if (process.env.AYGLOBAL_API_KEY && process.env.AYGLOBAL_ENABLED !== "false") {
      activeProvider = "ayglobal";
      reply = await callAyGlobalVerify(c.type, c.number, input.tier);
    } else {
      return refundCharge(c, "Slip generation is not configured.", 503, activeProvider);
    }
  } catch {
    return refundCharge(c, "We couldn't generate the slip. Please try again.", 503, activeProvider);
  }

  const j = reply.json;
  const isOk = reply.status === 200 && (String(j?.status).toLowerCase() === "success" || String(j?.status).toLowerCase() === "successful");
  const b64 = j?.pdf_base64 || j?.data?.pdf_base64 || j?.pdf;

  if (isOk && looksLikePdf(b64)) {
    const providerRef = j?.reportID ? String(j.reportID) : j?.reference ? String(j.reference) : undefined;
    await settle(c.reference, "successful", { provider: activeProvider, providerRef });
    await recordAttempt(c, { subjectName: null, status: "successful", cost: c.price }).catch(() =>
      console.error("[identity] could not save the history record")
    );
    return {
      reference: c.reference,
      type: c.type,
      tier: input.tier,
      idNumber: c.masked,
      filename: `${c.type.toUpperCase()}-${input.tier}-slip-${c.number.slice(-4)}.pdf`,
      pdfBase64: b64,
      costNaira: c.price,
    };
  }

  return failFromReply(c, reply, activeProvider);
}
