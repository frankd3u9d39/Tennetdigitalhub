import "server-only";
import {
  getBillers,
  getPaymentItems,
  queryStatus,
  submitPayment,
  IswConfigError,
  IswHttpError,
  IswUnknownOutcomeError,
} from "../interswitch";
import {
  ProviderUnavailableError,
  ProviderUnknownOutcomeError,
  type BillKind,
  type BillProvider,
  type NetworkOption,
  type PayInput,
  type PayOutcome,
  type StatusLookup,
  type StatusOutcome,
} from "./types";

// Interswitch adapter. It only does AIRTIME for now: data, electricity and cable need their own biller/product
// mapping, which can't be built or tested until Interswitch activates the project and issues a Terminal ID.
// Until INTERSWITCH_TERMINAL_ID is set, isEnabled() is false and this provider is skipped entirely.

const NETWORKS: NetworkOption[] = [
  { network: "mtn", label: "MTN" },
  { network: "airtel", label: "Airtel" },
  { network: "glo", label: "Glo" },
  { network: "9mobile", label: "9mobile" },
];

// Words that identify each network in Interswitch's biller names ("Mobile/Recharge" category, id 4 in their docs).
const MATCH: Record<string, RegExp> = {
  mtn: /mtn/i,
  airtel: /airtel/i,
  glo: /glo/i,
  "9mobile": /9mobile|etisalat|etilat/i,
};

const SUCCESS_CODES = new Set(["90000", "90010", "90011", "90016"]);

async function resolveAirtimeCode(network: string): Promise<string | null> {
  const billers = await getBillers("4");
  const biller = billers.find((b) => MATCH[network]?.test(`${b.name} ${b.shortName}`));
  if (!biller) return null;
  const items = await getPaymentItems(biller.id);
  const item = items.find((i) => /airtime/i.test(i.name)) ?? items.find((i) => !i.isAmountFixed);
  return item?.paymentCode ?? null;
}

const toMsisdn = (local: string) => `234${local.replace(/^0/, "")}`;

function fromStatus(s: Awaited<ReturnType<typeof queryStatus>>["status"]): StatusOutcome {
  if (s === "completed") return "success";
  if (s === "failed" || s === "reversed") return "failed";
  if (s === "pending") return "pending";
  return "unknown";
}

export const interswitch: BillProvider = {
  name: "interswitch",

  isEnabled: () =>
    Boolean(process.env.INTERSWITCH_CLIENT_ID && process.env.INTERSWITCH_CLIENT_SECRET && process.env.INTERSWITCH_TERMINAL_ID) &&
    process.env.INTERSWITCH_ENABLED !== "false",

  supports: (kind: BillKind) => kind === "airtime",

  async networks(kind) {
    return kind === "airtime" ? NETWORKS : [];
  },

  async plans() {
    return [];
  },

  async validate() {
    return { valid: false };
  },

  async pay(input: PayInput): Promise<PayOutcome> {
    try {
      const paymentCode = await resolveAirtimeCode(input.network);
      if (!paymentCode) return { state: "failed", reason: "Airtime for this network is not available.", raw: null };

      const msisdn = toMsisdn(input.customerId);
      const res = await submitPayment({
        paymentCode,
        customerId: msisdn,
        customerMobile: msisdn,
        amountNaira: input.amountNaira,
        requestReference: input.reference,
      });
      if (res.ResponseCode && SUCCESS_CODES.has(res.ResponseCode)) {
        return { state: "success", providerRef: res.TransactionRef, token: res.RechargePIN || undefined, raw: res };
      }
      // Any other answer is ambiguous (Interswitch documents many "in progress" codes): let the status query decide.
      const s = fromStatus((await queryStatus(input.reference)).status);
      if (s === "success") return { state: "success", providerRef: res.TransactionRef, raw: res };
      if (s === "failed") return { state: "failed", reason: res.ResponseDescription || "Payment failed", raw: res };
      return { state: "pending", providerRef: res.TransactionRef, raw: res };
    } catch (err) {
      if (err instanceof IswConfigError) return { state: "failed", reason: "Interswitch is not configured.", raw: null };
      if (err instanceof IswUnknownOutcomeError) throw new ProviderUnknownOutcomeError(err.message);
      if (err instanceof IswHttpError) {
        // A 4xx (except 408/429) means the request was refused. Confirm they have no record before calling it failed.
        const refused = err.status >= 400 && err.status < 500 && err.status !== 408 && err.status !== 429;
        if (refused) {
          const s = await queryStatus(input.reference).catch(() => null);
          if (s && s.status === "unknown") return { state: "failed", reason: "The provider rejected the request.", raw: err.body };
          if (s && s.status === "completed") return { state: "success", raw: s.raw };
          if (s && (s.status === "failed" || s.status === "reversed")) return { state: "failed", reason: "Payment failed", raw: s.raw };
        }
        return { state: "pending", raw: err.body };
      }
      throw new ProviderUnavailableError(err instanceof Error ? err.message : "Interswitch error");
    }
  },

  async status(lookup: StatusLookup): Promise<StatusOutcome> {
    try {
      return fromStatus((await queryStatus(lookup.reference)).status);
    } catch {
      return "unknown";
    }
  },

  // We sent the request ourselves with a unique reference; 30+ minutes with no record means it never arrived.
  refundUnknownAfterMs: 30 * 60_000,
};
