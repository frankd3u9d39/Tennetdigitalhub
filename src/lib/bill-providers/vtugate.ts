// VTUGate adapter. Base URL https://api.vtugate.com, Bearer API key, form-encoded bodies.
// Docs: https://vtugate.com/docs (endpoint details here were confirmed against the test key).
//
// Env:
//   VTUGATE_ENV            "sandbox" (default, uses VTUGATE_TEST_API_KEY, mocked) or "live" (VTUGATE_API_KEY).
//   VTUGATE_API_KEY / VTUGATE_TEST_API_KEY
//   VTUGATE_ENABLED=false  switches the provider off.
//   VTUGATE_BASE_URL       optional override.
//
// Sandbox rule from their docs: a phone / meter / smartcard number ending in 1111 simulates a failure.
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

interface Svc {
  service_id: number;
  service_type: string;
  network_name?: string;
  data_type?: string;
  disco?: string;
  tv_name?: string;
}

interface Reply {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
}

function apiKey(): string | undefined {
  return process.env.VTUGATE_ENV === "live" ? process.env.VTUGATE_API_KEY : process.env.VTUGATE_TEST_API_KEY;
}

async function post(path: string, fields: Record<string, string> = {}, timeoutMs = 20_000): Promise<Reply> {
  const key = apiKey();
  if (!key) throw new ProviderUnavailableError("VTUGate is not configured.");
  const res = await fetch(`${process.env.VTUGATE_BASE_URL || "https://api.vtugate.com"}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(fields).toString(),
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

/** For catalogue/validation calls: any failure just means "try again later". */
async function postSafe(path: string, fields: Record<string, string> = {}): Promise<Reply> {
  try {
    return await post(path, fields);
  } catch (err) {
    if (err instanceof ProviderUnavailableError) throw err;
    throw new ProviderUnavailableError(err instanceof Error ? err.message : "VTUGate unreachable");
  }
}

let cache: { at: number; list: Svc[] } | null = null;
async function services(): Promise<Svc[]> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.list;
  const r = await postSafe("/api/v1/fetchallservices");
  if (r.status !== 200 || !Array.isArray(r.json?.data)) throw new ProviderUnavailableError("VTUGate services unavailable.");
  cache = { at: Date.now(), list: r.json.data as Svc[] };
  return cache.list;
}

const lc = (s?: string) => (s ?? "").toLowerCase();

async function resolve(p: ProductRef): Promise<Svc | null> {
  const all = await services();
  switch (p.kind) {
    case "airtime":
      return all.find((s) => s.service_type === "airtime" && lc(s.network_name) === p.network) ?? null;
    case "data":
      return all.find((s) => s.service_type === "data" && lc(s.network_name) === p.network && lc(s.data_type) === lc(p.variant)) ?? null;
    case "electricity":
      return all.find((s) => s.service_type === "electricity" && lc(s.disco) === p.network) ?? null;
    case "cable":
      return all.find((s) => s.service_type === "tv" && lc(s.tv_name) === p.network) ?? null;
  }
}

const REJECTION = /insufficient|invalid|required|not found|unauthori[sz]ed|inactive|not active|kyc|disabled|not allowed|limit/i;

function classify(r: Reply): PayOutcome {
  const d = r.json?.data;
  if (r.status >= 500) return { state: "pending", raw: r.json };

  if (r.json?.status === true && d?.provider_status === true) {
    return {
      state: "success",
      providerRef: d.transaction_id != null ? String(d.transaction_id) : undefined,
      token: d.token ? String(d.token) : undefined,
      units: d.units ? String(d.units) : undefined,
      raw: r.json,
    };
  }
  // Accepted but not confirmed delivered: wait for the status check.
  if (r.json?.status === true) {
    return { state: "pending", providerRef: d?.transaction_id != null ? String(d.transaction_id) : undefined, raw: r.json };
  }
  // The provider processed it and said no.
  if (r.json?.status === false && d && d.provider_status === false) {
    return { state: "failed", reason: String(d.provider_message || r.json.message || "Purchase failed"), raw: r.json };
  }
  // Rejected before anything was processed (bad input, no wallet balance, account not approved…).
  if (r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429) {
    return { state: "failed", reason: String(r.json?.message || "Request rejected"), raw: r.json };
  }
  if (r.json?.status === false && REJECTION.test(String(r.json?.message ?? ""))) {
    return { state: "failed", reason: String(r.json.message), raw: r.json };
  }
  return { state: "pending", raw: r.json };
}

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const DISCO_ACRONYMS = new Set(["aedc", "ekedc", "ikedc", "ibedc", "eedc", "bedc", "phed", "kedco", "jed", "yedc", "kaedco"]);

export const vtugate: BillProvider = {
  name: "vtugate",

  isEnabled: () => Boolean(apiKey()) && process.env.VTUGATE_ENABLED !== "false",

  supports: () => true,

  async networks(kind: BillKind): Promise<NetworkOption[]> {
    const all = await services();
    const out = new Map<string, NetworkOption>();
    for (const s of all) {
      if (kind === "airtime" && s.service_type === "airtime") {
        const n = lc(s.network_name);
        out.set(n, { network: n, label: n === "mtn" || n === "glo" ? n.toUpperCase() : title(n) });
      } else if (kind === "data" && s.service_type === "data") {
        const n = lc(s.network_name);
        const cur = out.get(n) ?? { network: n, label: n === "mtn" || n === "glo" ? n.toUpperCase() : title(n), variants: [] };
        if (s.data_type) cur.variants = [...new Set([...(cur.variants ?? []), lc(s.data_type)])];
        out.set(n, cur);
      } else if (kind === "electricity" && s.service_type === "electricity") {
        const n = lc(s.disco);
        out.set(n, { network: n, label: DISCO_ACRONYMS.has(n) ? n.toUpperCase() : title(n) });
      } else if (kind === "cable" && s.service_type === "tv") {
        const n = lc(s.tv_name);
        out.set(n, { network: n, label: n === "dstv" || n === "gotv" ? n.toUpperCase() : title(n) });
      }
    }
    return [...out.values()];
  },

  async plans(product: ProductRef): Promise<Plan[]> {
    const svc = await resolve(product);
    if (!svc) return [];
    const r = await postSafe("/api/v1/fetchdataplans", { service_id: String(svc.service_id) });
    const plans = r.json?.data?.data_plans;
    if (r.status !== 200 || !Array.isArray(plans)) throw new ProviderUnavailableError("VTUGate plans unavailable.");
    return plans.map((p: { code: string; name: string; price: number | string }) => ({
      code: String(p.code),
      name: String(p.name),
      priceNaira: Number(p.price),
    }));
  },

  async validate(input: ValidateInput): Promise<ValidateResult> {
    const svc = await resolve(input);
    if (!svc) return { valid: false };

    if (input.kind === "electricity") {
      const r = await postSafe("/api/v1/verifyelectricity", {
        service_id: String(svc.service_id),
        meter_no: input.customerId,
        disco: svc.disco ?? input.network,
      });
      if (r.status >= 500) throw new ProviderUnavailableError("VTUGate validation unavailable.");
      const ok = r.json?.status === true && r.json?.data?.provider_status === true;
      return { valid: ok, name: ok ? String(r.json.data.meter_name ?? "") || undefined : undefined };
    }

    const r = await postSafe("/api/v1/verifycabletv", {
      service_id: String(svc.service_id),
      phone: input.phone,
      smartcard_number: input.customerId,
    });
    if (r.status >= 500) throw new ProviderUnavailableError("VTUGate validation unavailable.");
    const ok = r.json?.status === true && r.json?.data?.provider_status === true;
    const plans: Plan[] = ok
      ? (r.json.data.cable_plans ?? []).map((p: { code: string; name: string; price: number | string }) => ({
          code: String(p.code),
          name: String(p.name),
          priceNaira: Number(p.price),
        }))
      : [];
    return { valid: ok, name: ok ? String(r.json.data.smartcard_name ?? "") || undefined : undefined, plans };
  },

  async pay(input: PayInput): Promise<PayOutcome> {
    let svc: Svc | null;
    try {
      svc = await resolve(input);
    } catch {
      // Their service list is unreachable, so no purchase request has been sent: a definite failure.
      return { state: "failed", reason: "VTUGate services are unavailable.", raw: null };
    }
    if (!svc) return { state: "failed", reason: "This service is not available from VTUGate.", raw: null };
    const sid = String(svc.service_id);
    const amount = String(input.amountNaira);

    let path: string;
    let fields: Record<string, string>;
    switch (input.kind) {
      case "airtime":
        path = "/api/v1/buyairtime";
        fields = { service_id: sid, phone_number: input.customerId, amount };
        break;
      case "data":
        path = "/api/v1/buydata";
        fields = { service_id: sid, plan_code: input.planCode ?? "", phone_number: input.customerId, amount };
        break;
      case "electricity":
        path = "/api/v1/buyelectricity";
        fields = { service_id: sid, meter_no: input.customerId, disco: svc.disco ?? input.network, amount, phone_number: input.phone };
        break;
      case "cable":
        path = "/api/v1/buycabletv";
        fields = {
          service_id: sid,
          phone: input.phone,
          smartcard_number: input.customerId,
          amount,
          plan_code: input.planCode ?? "",
          plan_name: input.planName ?? input.planCode ?? "",
        };
        break;
    }

    let reply: Reply;
    try {
      reply = await post(path, fields, 60_000);
    } catch (err) {
      // Timeout / network error: it may have been processed.
      if (err instanceof ProviderUnavailableError) return { state: "failed", reason: "VTUGate is not configured.", raw: null };
      throw new ProviderUnknownOutcomeError(err instanceof Error ? err.message : "network error");
    }
    return classify(reply);
  },

  async status(lookup: StatusLookup): Promise<StatusOutcome> {
    if (!lookup.providerRef) return "unknown";
    let r: Reply;
    try {
      r = await post("/api/v1/transactionstatus", { transaction_id: lookup.providerRef });
    } catch {
      return "unknown";
    }
    if (r.status !== 200 || !r.json) return "unknown";
    const d = r.json.data ?? {};
    const text = lc(String(d.status ?? d.transaction_status ?? d.provider_status_text ?? ""));
    // Only explicit status text decides. A bare provider_status flag is NOT used to refund: a pending
    // payment could also carry `false`, and refunding a payment that later succeeds loses money.
    if (/success|complet|deliver/.test(text) || d.provider_status === true) return "success";
    if (/fail|revers|refund/.test(text)) return "failed";
    if (/pend|process|queue|progress/.test(text)) return "pending";
    // "Transaction not found" and anything unrecognised: do not guess.
    return "unknown";
  },

  // No auto-refund: their status response shape isn't verified yet, so unknown means "review manually".
};
