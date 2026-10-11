// iKonect adapter. Base URL https://ikonect.com.ng/api/v1/, Bearer API key, JSON bodies.
// Docs: https://ikonect.com.ng/api_docs.php
//
// Env:
//   IKONECT_API_KEY      The developer API key.
//   IKONECT_ENABLED=true REQUIRED to take part. iKonect has NO sandbox: every purchase spends real wallet money, so
//                        it is opt-in and never switches itself on just because a key is present.
//   IKONECT_BASE_URL     optional override.
//
// iKonect charges only on success, so a 4xx is a definite "not delivered". A 202 means pending (and charged).
import {
  ProviderUnavailableError,
  ProviderUnknownOutcomeError,
  type BillKind,
  type BillProvider,
  type NetworkOption,
  type PayInput,
  type PayOutcome,
  type Plan,
  type ProductRef,
  type StatusLookup,
  type StatusOutcome,
  type ValidateInput,
  type ValidateResult,
} from "./types";

interface Reply {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
}

const AIRTIME_NETWORKS: NetworkOption[] = [
  { network: "mtn", label: "MTN" },
  { network: "airtel", label: "Airtel" },
  { network: "glo", label: "GLO" },
  { network: "9mobile", label: "9mobile" },
];

// iKonect's disco serviceIDs → the shared slugs used across providers (so airtime/electricity can fail over).
const DISCO_SLUG: Record<string, string> = {
  "aba-electric": "aba",
  "abuja-electric": "aedc",
  "benin-electric": "benin",
  "eko-electric": "ekedc",
  "enugu-electric": "enugu",
  "ibadan-electric": "ibadan",
  "ikeja-electric": "ikedc",
  "jos-electric": "jos",
  "kaduna-electric": "kaduna",
  "kano-electric": "kedco",
  "portharcourt-electric": "portharcourt",
  "yola-electric": "yola",
};
const SLUG_DISCO = Object.fromEntries(Object.entries(DISCO_SLUG).map(([id, slug]) => [slug, id]));

function apiKey() {
  return process.env.IKONECT_API_KEY;
}

async function call(method: "GET" | "POST", path: string, body?: unknown, timeoutMs = 25_000): Promise<Reply> {
  const key = apiKey();
  if (!key) throw new ProviderUnavailableError("iKonect is not configured.");
  const res = await fetch(`${process.env.IKONECT_BASE_URL || "https://ikonect.com.ng/api/v1"}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
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

/** Catalogue/validation calls: any failure just means "try again later". */
async function callSafe(method: "GET" | "POST", path: string, body?: unknown): Promise<Reply> {
  try {
    return await call(method, path, body);
  } catch (err) {
    if (err instanceof ProviderUnavailableError) throw err;
    throw new ProviderUnavailableError(err instanceof Error ? err.message : "iKonect unreachable");
  }
}

interface DataPlanRow {
  serviceID: string;
  network: string;
  dataPlan: string;
  amount: string;
  dataType: string;
  validity: string;
}
interface TvPlanRow {
  plan_id: number | string;
  provider: string;
  planName: string;
  amount: string;
}

let dataCache: { at: number; rows: DataPlanRow[] } | null = null;
async function dataPlans(): Promise<DataPlanRow[]> {
  if (dataCache && Date.now() - dataCache.at < 10 * 60_000) return dataCache.rows;
  const r = await callSafe("GET", "/dataplans/");
  if (r.status !== 200 || !Array.isArray(r.json?.dataPlans)) throw new ProviderUnavailableError("iKonect data plans unavailable.");
  dataCache = { at: Date.now(), rows: r.json.dataPlans as DataPlanRow[] };
  return dataCache.rows;
}

let svcCache: { at: number; tv: TvPlanRow[]; electricity: { serviceID: string; name: string }[] } | null = null;
async function services() {
  if (svcCache && Date.now() - svcCache.at < 10 * 60_000) return svcCache;
  const r = await callSafe("GET", "/services/");
  if (r.status !== 200 || !r.json) throw new ProviderUnavailableError("iKonect services unavailable.");
  svcCache = { at: Date.now(), tv: r.json.tvPlans ?? [], electricity: r.json.electricity ?? [] };
  return svcCache;
}

const lc = (s?: string) => (s ?? "").toLowerCase();
const variantOf = (dataType: string) => lc(dataType).trim().replace(/\s+/g, "_");
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const TV_LABEL: Record<string, string> = { dstv: "DStv", gotv: "GOtv", startimes: "StarTimes", showmax: "Showmax" };

function classify(r: Reply): PayOutcome {
  const j = r.json;
  const ref = j?.reference ? String(j.reference) : undefined;

  if (r.status === 200 && (lc(j?.status) === "successful" || lc(j?.status) === "success")) {
    return { state: "success", providerRef: ref, token: j?.token ? String(j.token) : undefined, raw: j };
  }
  // 202 = accepted and still processing (the wallet IS charged): never refund, never retry elsewhere.
  if (r.status === 202 || lc(j?.status) === "pending") return { state: "pending", providerRef: ref, raw: j };

  const reason = String(j?.error ?? j?.message ?? "Request rejected");
  // A duplicate reference means a request with this reference already exists: it may well have succeeded.
  if (/duplicate/i.test(reason)) return { state: "pending", providerRef: ref, raw: j };

  // They charge only on success, so these were definitely not delivered:
  // 400 bad request / provider failure, 401 key, 402 no balance, 403 IP whitelist, 404, 405, 429 rate limit.
  if ([400, 401, 402, 403, 404, 405, 429].includes(r.status)) return { state: "failed", reason, raw: j };

  // 200 without "successful", 5xx, anything else: unknown, so leave it pending.
  return { state: "pending", providerRef: ref, raw: j };
}

export const ikonect: BillProvider = {
  name: "ikonect",

  // Opt-in: there is no sandbox, so a key alone must never make this provider spend real money.
  isEnabled: () => Boolean(apiKey()) && process.env.IKONECT_ENABLED === "true",

  supports: () => true,

  async networks(kind: BillKind): Promise<NetworkOption[]> {
    if (kind === "airtime") return AIRTIME_NETWORKS;

    if (kind === "data") {
      const out = new Map<string, NetworkOption>();
      for (const row of await dataPlans()) {
        const n = lc(row.network);
        const cur = out.get(n) ?? { network: n, label: n === "mtn" || n === "glo" ? n.toUpperCase() : title(n), variants: [] };
        cur.variants = [...new Set([...(cur.variants ?? []), variantOf(row.dataType)])];
        out.set(n, cur);
      }
      return [...out.values()];
    }

    const svc = await services();
    if (kind === "electricity") {
      return svc.electricity
        .filter((d) => DISCO_SLUG[d.serviceID])
        .map((d) => ({ network: DISCO_SLUG[d.serviceID], label: d.name }));
    }
    const providers = [...new Set(svc.tv.map((p) => lc(p.provider)))];
    return providers.map((p) => ({ network: p, label: TV_LABEL[p] ?? title(p) }));
  },

  async plans(product: ProductRef): Promise<Plan[]> {
    if (product.kind !== "data") return [];
    const rows = await dataPlans();
    return rows
      .filter((r) => lc(r.network) === product.network && (!product.variant || variantOf(r.dataType) === product.variant))
      .map((r) => ({ code: String(r.serviceID), name: `${r.dataPlan} · ${r.validity}`, priceNaira: Number(r.amount) }));
  },

  async validate(input: ValidateInput): Promise<ValidateResult> {
    if (input.kind === "electricity") {
      const disco = SLUG_DISCO[input.network];
      if (!disco) return { valid: false };
      const r = await callSafe("POST", "/electricity/verify", { disco, meter_number: input.customerId, meter_type: "prepaid" });
      if (r.status >= 500) throw new ProviderUnavailableError("iKonect validation unavailable.");
      const ok = r.status === 200 && r.json?.verified === true;
      return { valid: ok, name: ok ? String(r.json.customer_name ?? "") || undefined : undefined };
    }

    if (input.kind === "cable") {
      const r = await callSafe("POST", "/tv/verify", { provider: input.network, smartcard_number: input.customerId });
      if (r.status >= 500) throw new ProviderUnavailableError("iKonect validation unavailable.");
      const ok = r.status === 200 && r.json?.verified === true;
      if (!ok) return { valid: false };
      const plans: Plan[] = (await services()).tv
        .filter((p) => lc(p.provider) === input.network)
        .map((p) => ({ code: String(p.plan_id), name: p.planName, priceNaira: Number(p.amount) }));
      return { valid: true, name: String(r.json.customer_name ?? "") || undefined, plans };
    }

    return { valid: false };
  },

  async pay(input: PayInput): Promise<PayOutcome> {
    let path: string;
    let body: Record<string, unknown>;

    switch (input.kind) {
      case "airtime":
        path = "/airtime/";
        body = { network: input.network, phone: input.customerId, amount: input.amountNaira, airtime_type: "VTU", ref: input.reference };
        break;
      case "data":
        path = "/data/";
        // `ref` (our reference) is documented for data purchases and also sent on the others: it makes a timeout recoverable.
        body = { network: input.network, phone: input.customerId, data_plan: input.planCode, ref: input.reference };
        break;
      case "electricity": {
        const disco = SLUG_DISCO[input.network];
        if (!disco) return { state: "failed", reason: "This electricity company is not available from iKonect.", raw: null };
        path = "/electricity/";
        body = { disco, meter_number: input.customerId, amount: input.amountNaira, phone: input.phone, meter_type: "prepaid", ref: input.reference };
        break;
      }
      case "cable":
        path = "/tv/";
        body = { provider: input.network, smartcard_number: input.customerId, plan_id: Number(input.planCode), phone: input.phone, ref: input.reference };
        break;
    }

    let reply: Reply;
    try {
      reply = await call("POST", path, body, 120_000);
    } catch (err) {
      if (err instanceof ProviderUnavailableError) return { state: "failed", reason: "iKonect is not configured.", raw: null };
      // Timeout / network error: it may have been processed.
      throw new ProviderUnknownOutcomeError(err instanceof Error ? err.message : "network error");
    }
    return classify(reply);
  },

  async status(lookup: StatusLookup): Promise<StatusOutcome> {
    // Their reference when we have it; otherwise our own (only data purchases are created under our reference).
    const reference = lookup.providerRef ?? lookup.reference;
    let r: Reply;
    try {
      r = await call("POST", "/transaction/", { reference });
    } catch {
      return "unknown";
    }
    if (r.status !== 200 || !r.json?.transaction) return "unknown"; // includes 404 "not found": never guess
    const s = lc(String(r.json.transaction.status ?? ""));
    if (/success|complet|deliver/.test(s)) return "success";
    if (/fail|revers|refund/.test(s)) return "failed";
    if (/pend|process|queue|progress/.test(s)) return "pending";
    return "unknown";
  },

  // No auto-refund for unknown payments: for airtime/electricity/TV we only hold THEIR reference if the call returned.
};
