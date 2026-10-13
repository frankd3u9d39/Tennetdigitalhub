import "server-only";
import {
  ProviderUnavailableError,
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

// AYGlobalData adapter. Base URL https://ayglobaldata.com, Token API key, JSON bodies.
// Docs: https://ayglobaldata.com/api-docs/
//
// Env:
//   AYGLOBAL_API_KEY       The developer API key / token.
//   AYGLOBAL_ENABLED=true  Set to false to switch off (defaults to true if key is present).
//   AYGLOBAL_BASE_URL      Optional override (defaults to https://ayglobaldata.com).

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

const NETWORK_ID: Record<string, string> = {
  mtn: "1",
  airtel: "2",
  glo: "3",
  "9mobile": "4",
  smile: "5",
};

const CABLE_ID: Record<string, string> = {
  gotv: "1",
  dstv: "2",
  startimes: "3",
};

const DISCO_ID: Record<string, string> = {
  ikedc: "1",
  ikeja: "1",
  ekedc: "2",
  eko: "2",
  aedc: "3",
  abuja: "3",
  kedco: "4",
  kano: "4",
  eedc: "5",
  enugu: "5",
  phed: "6",
  portharcourt: "6",
  ibedc: "7",
  ibadan: "7",
  kaedco: "8",
  kaduna: "8",
  jed: "9",
  jos: "9",
  bedc: "10",
  benin: "10",
  yedc: "11",
  yola: "11",
  aba: "1",
};

const DISCO_OPTIONS: NetworkOption[] = [
  { network: "ikedc", label: "Ikeja Electric (IKEDC)" },
  { network: "ekedc", label: "Eko Electric (EKEDC)" },
  { network: "aedc", label: "Abuja Electricity (AEDC)" },
  { network: "ibedc", label: "Ibadan Electricity (IBEDC)" },
  { network: "eedc", label: "Enugu Electricity (EEDC)" },
  { network: "bedc", label: "Benin Electricity (BEDC)" },
  { network: "phed", label: "Port Harcourt Electric (PHED)" },
  { network: "kedco", label: "Kano Electricity (KEDCO)" },
  { network: "jed", label: "Jos Electricity (JED)" },
  { network: "kaedco", label: "Kaduna Electric (KAEDCO)" },
  { network: "aba", label: "Aba Power Electric" },
  { network: "yedc", label: "Yola Electricity (YEDC)" },
];

const CABLE_OPTIONS: NetworkOption[] = [
  { network: "dstv", label: "DStv" },
  { network: "gotv", label: "GOtv" },
  { network: "startimes", label: "Startimes" },
];

function apiKey(): string | undefined {
  return process.env.AYGLOBAL_API_KEY;
}

function baseUrl(): string {
  return (process.env.AYGLOBAL_BASE_URL || "https://ayglobaldata.com").replace(/\/+$/, "");
}

async function call(method: "GET" | "POST", path: string, body?: unknown, timeoutMs = 30_000): Promise<Reply> {
  const key = apiKey();
  if (!key) throw new ProviderUnavailableError("AYGlobalData is not configured.");

  const url = `${baseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
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

async function callSafe(method: "GET" | "POST", path: string, body?: unknown): Promise<Reply> {
  try {
    return await call(method, path, body);
  } catch (err) {
    if (err instanceof ProviderUnavailableError) throw err;
    throw new ProviderUnavailableError(err instanceof Error ? err.message : "AYGlobalData unreachable");
  }
}

// Data plans cache (10 mins)
let dataPlansCache: { at: number; data: any } | null = null;
async function getDataPlansList() {
  if (dataPlansCache && Date.now() - dataPlansCache.at < 10 * 60_000) {
    return dataPlansCache.data;
  }
  const r = await callSafe("GET", "/api/app/list/data.php");
  if (r.status === 200 && r.json?.network) {
    dataPlansCache = { at: Date.now(), data: r.json.network };
    return r.json.network;
  }
  return [];
}

// Cable plans cache (10 mins)
let cablePlansCache: { at: number; data: any } | null = null;
async function getCablePlansList() {
  if (cablePlansCache && Date.now() - cablePlansCache.at < 10 * 60_000) {
    return cablePlansCache.data;
  }
  const r = await callSafe("GET", "/api/app/list/cable.php");
  const providers = r.json?.cableProviders || r.json?.data || (Array.isArray(r.json) ? r.json : []);
  if (r.status === 200 && Array.isArray(providers)) {
    cablePlansCache = { at: Date.now(), data: providers };
    return providers;
  }
  return [];
}

const REJECTION = /insufficient|invalid|required|not found|unauthori[sz]ed|inactive|not active|kyc|disabled|not allowed|limit|fail/i;

function classify(r: Reply): PayOutcome {
  if (r.status >= 500) return { state: "pending", raw: r.json };
  const j = r.json;
  const isSuccess = String(j?.status).toLowerCase() === "success" || j?.status === true;

  if (isSuccess) {
    // Extract token if electricity
    let token: string | undefined;
    if (j?.plan_description && typeof j.plan_description === "string") {
      const match = j.plan_description.match(/Token:\s*([0-9-]+)/i);
      if (match) token = match[1];
    } else if (j?.token) {
      token = String(j.token);
    }

    return {
      state: "success",
      providerRef: j?.transaction_ref ? String(j.transaction_ref) : undefined,
      token,
      units: j?.units ? String(j.units) : undefined,
      raw: j,
    };
  }

  const msg = String(j?.msg || j?.message || j?.error || "Transaction failed");
  if (r.status >= 400 && r.status < 500) {
    return { state: "failed", reason: msg, raw: j };
  }
  if (REJECTION.test(msg)) {
    return { state: "failed", reason: msg, raw: j };
  }
  return { state: "pending", raw: j };
}

export const ayglobal: BillProvider = {
  name: "ayglobal",

  isEnabled: () => Boolean(apiKey()) && process.env.AYGLOBAL_ENABLED !== "false",

  supports: () => true,

  async networks(kind: BillKind): Promise<NetworkOption[]> {
    if (kind === "airtime") return AIRTIME_NETWORKS;
    if (kind === "electricity") return DISCO_OPTIONS;
    if (kind === "cable") return CABLE_OPTIONS;
    if (kind === "data") {
      const plans = await getDataPlansList().catch(() => []);
      if (Array.isArray(plans) && plans.length > 0) {
        return plans.map((n: { id: number; name: string }) => {
          const slug = n.name.toLowerCase();
          return {
            network: slug,
            label: n.name.toUpperCase(),
            variants: ["sme", "gifting", "corporate"],
          };
        });
      }
      return [
        { network: "mtn", label: "MTN", variants: ["sme", "gifting", "corporate"] },
        { network: "airtel", label: "Airtel", variants: ["gifting", "corporate"] },
        { network: "glo", label: "GLO", variants: ["corporate", "gifting"] },
        { network: "9mobile", label: "9mobile", variants: ["corporate"] },
      ];
    }
    return [];
  },

  async plans(product: ProductRef): Promise<Plan[]> {
    if (product.kind === "data") {
      const netId = NETWORK_ID[product.network.toLowerCase()] || "1";
      const list = await getDataPlansList().catch(() => []);
      if (Array.isArray(list)) {
        const netObj = list.find((n: any) => String(n.id) === netId || n.name?.toLowerCase() === product.network.toLowerCase());
        if (netObj) {
          let rawPlans: any[] = [];
          if (Array.isArray(netObj.type)) {
            for (const t of netObj.type) {
              if (Array.isArray(t.plans)) rawPlans.push(...t.plans);
            }
          }
          if (Array.isArray(netObj.plans)) {
            rawPlans.push(...netObj.plans);
          }

          let plans: Plan[] = rawPlans.map((p: any) => ({
            code: String(p.pId || p.id),
            name: String(p.name),
            priceNaira: Number(p.price || 0),
          }));
          if (product.variant) {
            const v = product.variant.toLowerCase();
            const filtered = plans.filter((p) => p.name.toLowerCase().includes(v));
            if (filtered.length > 0) plans = filtered;
          }
          return plans;
        }
      }
      return [];
    }

    if (product.kind === "cable") {
      const cableId = CABLE_ID[product.network.toLowerCase()] || "1";
      const list = await getCablePlansList().catch(() => []);
      if (Array.isArray(list)) {
        const netObj = list.find((c: any) =>
          String(c.cId || c.cableid || c.id) === cableId ||
          String(c.provider || c.name || "").toLowerCase().includes(product.network.toLowerCase())
        );
        if (netObj && Array.isArray(netObj.plans)) {
          return netObj.plans.map((p: any) => ({
            code: String(p.planid || p.cpId || p.pId || p.id),
            name: String(p.name),
            priceNaira: Number(p.price || 0),
          }));
        }
      }
      return [];
    }

    return [];
  },

  async validate(input: ValidateInput): Promise<ValidateResult> {
    if (input.kind === "electricity") {
      const discoId = DISCO_ID[input.network.toLowerCase()] || "1";
      const mtype = input.variant === "postpaid" ? "postpaid" : "prepaid";
      const query = new URLSearchParams({
        provider: discoId,
        meternumber: input.customerId,
        metertype: mtype,
      });

      const r = await callSafe("GET", `/api/electricity/verify/?${query.toString()}`);
      if (r.status === 200 && r.json?.status === "success" && r.json?.Customer_Name) {
        return { valid: true, name: String(r.json.Customer_Name).trim() };
      }
      return { valid: false };
    }

    if (input.kind === "cable") {
      const cableId = CABLE_ID[input.network.toLowerCase()] || "1";
      const query = new URLSearchParams({
        provider: cableId,
        iucnumber: input.customerId,
      });

      const r = await callSafe("GET", `/api/cabletv/verify/?${query.toString()}`);
      if (r.status === 200 && r.json?.status === "success" && r.json?.Customer_Name) {
        return { valid: true, name: String(r.json.Customer_Name).trim() };
      }
      return { valid: false };
    }

    return { valid: true };
  },

  async pay(input: PayInput): Promise<PayOutcome> {
    try {
      if (input.kind === "airtime") {
        const netId = NETWORK_ID[input.network.toLowerCase()] || "1";
        const r = await call("POST", "/api/airtime/", {
          network: netId,
          phone: input.customerId,
          amount: input.amountNaira,
          ref: input.reference,
        });
        return classify(r);
      }

      if (input.kind === "data") {
        const netId = NETWORK_ID[input.network.toLowerCase()] || "1";
        const r = await call("POST", "/api/data/", {
          network: netId,
          phone: input.customerId,
          data_plan: input.planCode,
          ref: input.reference,
        });
        return classify(r);
      }

      if (input.kind === "electricity") {
        const discoId = DISCO_ID[input.network.toLowerCase()] || "1";
        const mtype = input.variant === "postpaid" ? "postpaid" : "prepaid";
        const r = await call("POST", "/api/electricity/", {
          provider: discoId,
          meternumber: input.customerId,
          metertype: mtype,
          amount: input.amountNaira,
          ref: input.reference,
        });
        return classify(r);
      }

      if (input.kind === "cable") {
        const cableId = CABLE_ID[input.network.toLowerCase()] || "1";
        const r = await call("POST", "/api/cabletv/", {
          provider: cableId,
          iucnumber: input.customerId,
          plan: input.planCode,
          ref: input.reference,
        });
        return classify(r);
      }

      return { state: "failed", reason: `Unsupported bill kind ${input.kind}`, raw: null };
    } catch (err) {
      if (err instanceof ProviderUnavailableError) {
        return { state: "failed", reason: "AYGlobalData is not configured.", raw: null };
      }
      return { state: "pending", raw: null };
    }
  },

  async status(lookup: StatusLookup): Promise<StatusOutcome> {
    try {
      const r = await callSafe("GET", "/api/app/other/transactions.php");
      if (r.status === 200 && Array.isArray(r.json?.transactions)) {
        const match = r.json.transactions.find(
          (t: any) => t.transref === lookup.reference || (lookup.providerRef && t.transref === lookup.providerRef)
        );
        if (match) {
          const s = String(match.status).toLowerCase();
          if (s === "success") return "success";
          if (s === "failed" || s === "cancelled" || s === "refunded") return "failed";
          return "pending";
        }
      }
    } catch {
      // If status lookup fails, return unknown
    }
    return "unknown";
  },

  refundUnknownAfterMs: 40 * 60_000,
};
