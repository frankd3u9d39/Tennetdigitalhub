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
  /** The slip PDF, base64-encoded (when the provider returns one inline). */
  pdfBase64?: string;
  /** A URL to the slip (AYGlobal returns the slip as a link, not base64). */
  pdfUrl?: string;
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
  // Use .com (not .com.ng): both authenticate, but only .com's /nin-verification actually verifies.
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
    // 55s: just under the 60s function cap, leaving a few seconds for our refund-on-failure to run before a
    // platform-level timeout could kill the function and leave the customer charged with no result.
    signal: AbortSignal.timeout(55_000),
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

/**
 * Calls AYGlobalData verify endpoint (https://ayglobaldata.com/api-docs/). The `ref` field is REQUIRED even though
 * the verify docs omit it — without it the endpoint returns 400 "Required inputs missing". A success returns the
 * person data and a `pdf_link` (the slip, as a URL — NOT base64).
 */
async function callAyGlobalVerify(type: IdentityType, number: string, slipType: string, ref: string): Promise<Reply> {
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
      ref,
    }),
    // 55s: under the lookup route's 60s cap (free plan), leaving time for the refund path to run.
    signal: AbortSignal.timeout(55_000),
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



// ---- Reading provider responses ------------------------------------------------------------------
// Providers don't always match their docs (data vs data.data, firstname vs firstName…), so look for the person
// record wherever it is instead of assuming one layout.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = Record<string, any>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const NAME_KEYS = ["firstname", "first_name", "firstName", "surname", "lastname", "last_name", "lastName", "fullname", "full_name", "fullName"];

/** Breadth-first search (max depth 4) for the first object that carries a name. */
function findPersonRecord(root: unknown): Obj | null {
  let level: unknown[] = [root];
  for (let depth = 0; depth < 4 && level.length; depth++) {
    const next: unknown[] = [];
    for (const node of level) {
      const items = Array.isArray(node) ? node : [node];
      for (const item of items) {
        if (!isObj(item)) continue;
        if (NAME_KEYS.some((k) => typeof item[k] === "string" && item[k].trim())) return item;
        next.push(...Object.values(item).filter((v) => isObj(v) || Array.isArray(v)));
      }
    }
    level = next;
  }
  return null;
}

/** First non-empty string among the given keys (case-insensitive). */
function pick(o: Obj, ...keys: string[]): string {
  const lower = new Map(Object.keys(o).map((k) => [k.toLowerCase(), k]));
  for (const k of keys) {
    const real = lower.get(k.toLowerCase());
    const v = real !== undefined ? o[real] : undefined;
    if ((typeof v === "string" || typeof v === "number") && String(v).trim()) return String(v).trim();
  }
  return "";
}

/** Key names only (no values, so no personal data) for diagnosing an unexpected layout. */
function keyLayout(v: unknown, depth = 0): string {
  if (depth > 3) return "…";
  if (Array.isArray(v)) return `[${v.length ? keyLayout(v[0], depth + 1) : ""}]`;
  if (!isObj(v)) return typeof v;
  return `{${Object.entries(v).map(([k, x]) => (isObj(x) || Array.isArray(x) ? `${k}:${keyLayout(x, depth + 1)}` : k)).join(",")}}`;
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
  const sentence = /[.!?]$/.test(message.trim()) ? message.trim() : `${message.trim()}.`;
  throw new IdentityError(notFound ? sentence : `${sentence} You were not charged.`, status);
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
  if (reply.status === 400 && (!message || /^verification failed\.?$/i.test(message.trim()))) {
    // The provider's bare "Verification failed": the registry couldn't verify this number (wrong number or a registry hiccup).
    return refundCharge(c, `This ${c.type.toUpperCase()} couldn't be verified. Check the number and try again in a few minutes`, 400, provider);
  }
  if (reply.status === 400) return refundCharge(c, message, 400, provider);
  return refundCharge(c, "We couldn't complete the verification. Please try again.", 503, provider);
}

// What each provider actually charges us per verification (used to record the real cost of the one that delivered).
const PROVIDER_IDENTITY_COST: Record<string, Record<IdentityType, number>> = {
  checkmyninbvn: { nin: 150, bvn: 150 },
  ayglobal: { nin: 200, bvn: 200 },
};

/** Available verification providers, in the admin's order: configured (env key), env-enabled, and not admin-disabled. */
function identityChain(order: string[], disabled: string[]): ProviderName[] {
  const available = (p: string) =>
    p === "checkmyninbvn"
      ? Boolean(process.env.CHECKMYNINBVN_API_KEY) && process.env.CHECKMYNINBVN_ENABLED !== "false"
      : p === "ayglobal"
        ? Boolean(process.env.AYGLOBAL_API_KEY) && process.env.AYGLOBAL_ENABLED !== "false"
        : false;
  return order.filter((p) => !disabled.includes(p) && available(p)) as ProviderName[];
}

function callProvider(provider: ProviderName, type: IdentityType, number: string, ref: string): Promise<Reply> {
  return provider === "ayglobal" ? callAyGlobalVerify(type, number, LOOKUP_SLIP_TYPE, ref) : callCheckMyNinBvn(type, number);
}

type LookupClass =
  | { kind: "ok"; data: Obj; providerRef?: string }
  | { kind: "notfound" }
  | { kind: "techfail"; status: number; message: string };

/** Delivered result, a clean "no record", or a technical failure we should fail over from. */
function classifyLookup(reply: Reply): LookupClass {
  const j = reply.json;
  const isOk = reply.status === 200 && ["success", "successful"].includes(String(j?.status).toLowerCase());
  const data = isOk ? findPersonRecord(j) : null;
  if (isOk && data) {
    const providerRef = j?.reportID ? String(j.reportID) : j?.reference ? String(j.reference) : undefined;
    return { kind: "ok", data, providerRef };
  }
  if (isOk && !data) {
    // "Success" but no person details: treat as a technical failure (fail over). Log the key layout only, never values.
    console.error(`[identity] provider said success but no person data found. Response keys: ${keyLayout(j)}`);
    return { kind: "techfail", status: 502, message: "blank success" };
  }
  const message = String(j?.error ?? j?.message ?? j?.msg ?? "");
  if (reply.status === 400 && /no record|not found|does not exist/i.test(message)) return { kind: "notfound" };
  return { kind: "techfail", status: reply.status, message };
}

export async function lookupIdentity(input: {
  email: string;
  type: IdentityType;
  number: string;
  consent: boolean;
  expectedPrice?: unknown;
}): Promise<IdentityResult> {
  const c = await beginCharge({ ...input, kind: "lookup" });
  const settings = await getSettings();
  const chain = identityChain(settings.identityProviders.order, settings.identityProviders.disabled);
  if (chain.length === 0) {
    return refundCharge(c, "No identity verification provider is available right now.", 503, "checkmyninbvn");
  }

  // Try each provider in order. Deliver on the first success; STOP and refund on a clean "no record"; fail over to
  // the next provider on any technical failure (unreachable, error, blank "success", out of balance).
  let lastProvider: ProviderName = chain[0];
  for (const provider of chain) {
    lastProvider = provider;
    let reply: Reply;
    try {
      reply = await callProvider(provider, c.type, c.number, c.reference);
    } catch {
      console.error(`[identity] ${c.type} lookup: ${provider} unreachable; trying next provider`);
      continue;
    }
    const outcome = classifyLookup(reply);
    if (outcome.kind === "ok") return deliverLookup(c, provider, outcome.data, outcome.providerRef);
    if (outcome.kind === "notfound") {
      return refundCharge(c, `No matching record was found for this ${c.type.toUpperCase()}. You were not charged.`, 404, provider, true);
    }
    console.error(`[identity] ${c.type} lookup not delivered by ${provider} (HTTP ${outcome.status}); failing over if another provider remains`);
  }
  // Every available provider failed technically.
  return refundCharge(c, "Verification is temporarily unavailable. Please try again shortly.", 503, lastProvider);
}

async function deliverLookup(c: Charge, provider: ProviderName, data: Obj, providerRef?: string): Promise<IdentityResult> {
  const firstName = pick(data, "firstname", "first_name", "firstName", "given_name");
  const middleName = pick(data, "middlename", "middle_name", "middleName", "othername", "other_names");
  const lastName = pick(data, "surname", "lastname", "last_name", "lastName", "family_name");
  const fullName =
    [firstName, middleName, lastName].filter(Boolean).join(" ") || pick(data, "fullname", "full_name", "fullName", "name");
  const dob = pick(data, "birthdate", "dob", "birth_date", "dateOfBirth", "date_of_birth");
  const gender = pick(data, "gender", "sex");
  const phone = pick(data, "telephoneno", "phone", "phone_number", "phoneNumber", "mobile", "telephone");
  const rawPhoto = pick(data, "photo", "image", "picture", "photograph");
  const photo = rawPhoto.length > 0 ? rawPhoto : null;

  await settle(c.reference, "successful", { provider, providerRef });
  // Record what the delivering provider actually costs us (differs between providers).
  const cost = PROVIDER_IDENTITY_COST[provider]?.[c.type];
  if (cost !== undefined) {
    await pool.query(`update public.ledger_entries set cost_amount = $2 where reference = $1`, [c.reference, cost]).catch(() => {});
  }
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
      reply = await callAyGlobalVerify(c.type, c.number, input.tier, c.reference);
    } else {
      return refundCharge(c, "Slip generation is not configured.", 503, activeProvider);
    }
  } catch {
    return refundCharge(c, "We couldn't generate the slip. Please try again.", 503, activeProvider);
  }

  const j = reply.json;
  const isOk = reply.status === 200 && (String(j?.status).toLowerCase() === "success" || String(j?.status).toLowerCase() === "successful");
  const b64 = j?.pdf_base64 || j?.data?.pdf_base64 || j?.pdf;
  // AYGlobal returns the slip as a URL (pdf_link), not base64.
  const rawUrl = j?.pdf_link || j?.data?.pdf_link || j?.slip_url || j?.data?.slip_url;
  const pdfUrl = typeof rawUrl === "string" && /^https?:\/\//.test(rawUrl) ? rawUrl : undefined;
  const hasPdf = looksLikePdf(b64);

  if (isOk && (hasPdf || pdfUrl)) {
    const providerRef = j?.transaction_ref ? String(j.transaction_ref) : j?.reportID ? String(j.reportID) : j?.reference ? String(j.reference) : undefined;
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
      pdfBase64: hasPdf ? (b64 as string) : undefined,
      pdfUrl,
      costNaira: c.price,
    };
  }

  return failFromReply(c, reply, activeProvider);
}
