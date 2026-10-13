// Pricing model shared by the server (which charges) and the screens (which display). Pure functions, no server code,
// so both sides compute EXACTLY the same number. The server is always the authority.

export type BillKind = "airtime" | "data" | "electricity" | "cable";
export type IdentityType = "nin" | "bvn";
export type SlipTier = "standard" | "premium";

/** Added on top of the provider's price: a percentage of it and/or a flat fee, in naira. */
export interface Markup {
  percent: number;
  flat: number;
}

export interface SlipPrices {
  standard: number;
  premium: number;
}

export interface PricingSettings {
  /** What the customer pays per lookup. */
  identity: Record<IdentityType, number>;
  /** What the customer pays per PDF slip. */
  slips: Record<IdentityType, SlipPrices>;
  /** What the provider charges us (used to estimate margin). */
  identityCost: Record<IdentityType, number>;
  slipCost: Record<IdentityType, SlipPrices>;
  /** Markup per bill service. */
  markup: Record<BillKind, Markup>;
}

/** Which services customers can use right now. */
export interface ServiceFlags {
  airtime: boolean;
  data: boolean;
  electricity: boolean;
  cable: boolean;
  nin: boolean;
  bvn: boolean;
}

export interface ProviderSettings {
  /** Overrides the order from the environment; null = use the environment's order. */
  order: string[] | null;
  /** Providers switched off by an admin (the environment can still force one off too). */
  disabled: string[];
  /** Warn in the admin area when a provider's prepaid balance (what pays for orders) falls below this many naira. */
  lowBalanceAlert: number;
}

export interface AllSettings {
  pricing: PricingSettings;
  services: ServiceFlags;
  providers: ProviderSettings;
}

// Defaults reproduce today's behaviour exactly (no markup), so nothing changes until an admin edits something.
export const DEFAULT_PRICING: PricingSettings = {
  identity: { nin: 150, bvn: 170 },
  slips: { nin: { standard: 150, premium: 170 }, bvn: { standard: 170, premium: 180 } },
  identityCost: { nin: 130, bvn: 140 },
  slipCost: { nin: { standard: 130, premium: 150 }, bvn: { standard: 140, premium: 150 } },
  markup: {
    airtime: { percent: 0, flat: 0 },
    data: { percent: 0, flat: 0 },
    electricity: { percent: 0, flat: 0 },
    cable: { percent: 0, flat: 0 },
  },
};

export const DEFAULT_SERVICES: ServiceFlags = { airtime: true, data: true, electricity: true, cable: true, nin: true, bvn: true };
export const DEFAULT_PROVIDERS: ProviderSettings = { order: null, disabled: [], lowBalanceAlert: 2000 };

export const BILL_KINDS: BillKind[] = ["airtime", "data", "electricity", "cable"];

/** The fee added to a provider price, in whole naira (rounded UP so the margin is never lost to rounding). */
export function feeFor(base: number, markup: Markup): number {
  const raw = Math.round((base * markup.percent) / 100 * 100) / 100 + markup.flat; // cents-safe
  return Math.max(0, Math.ceil(raw - 1e-9));
}

/** What the customer is charged for a provider price. */
export function chargeFor(base: number, markup: Markup): number {
  return Math.round((base + feeFor(base, markup)) * 100) / 100;
}

// ---- validation (admin input) ------------------------------------------------------------------------------------

const isMoney = (n: unknown, max: number): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

export function validatePricing(input: unknown): { ok: true; value: PricingSettings } | { ok: false; error: string } {
  const p = input as PricingSettings;
  try {
    for (const t of ["nin", "bvn"] as const) {
      if (!isMoney(p.identity[t], 100_000)) return { ok: false, error: `${t.toUpperCase()} price must be between ₦0 and ₦100,000.` };
      if (!isMoney(p.identityCost[t], 100_000)) return { ok: false, error: `${t.toUpperCase()} cost must be between ₦0 and ₦100,000.` };
      for (const tier of ["standard", "premium"] as const) {
        if (!isMoney(p.slips[t][tier], 100_000)) return { ok: false, error: `${t.toUpperCase()} ${tier} slip price must be between ₦0 and ₦100,000.` };
        if (!isMoney(p.slipCost[t][tier], 100_000)) return { ok: false, error: `${t.toUpperCase()} ${tier} slip cost must be between ₦0 and ₦100,000.` };
      }
    }
    for (const k of BILL_KINDS) {
      const m = p.markup[k];
      if (!isMoney(m.percent, 50)) return { ok: false, error: `${k} markup percentage must be between 0 and 50.` };
      if (!isMoney(m.flat, 5_000)) return { ok: false, error: `${k} flat fee must be between ₦0 and ₦5,000.` };
    }
  } catch {
    return { ok: false, error: "Pricing is incomplete or malformed." };
  }
  // Rebuild from known fields only, so nothing unexpected is stored.
  const value: PricingSettings = {
    identity: { nin: p.identity.nin, bvn: p.identity.bvn },
    slips: {
      nin: { standard: p.slips.nin.standard, premium: p.slips.nin.premium },
      bvn: { standard: p.slips.bvn.standard, premium: p.slips.bvn.premium },
    },
    identityCost: { nin: p.identityCost.nin, bvn: p.identityCost.bvn },
    slipCost: {
      nin: { standard: p.slipCost.nin.standard, premium: p.slipCost.nin.premium },
      bvn: { standard: p.slipCost.bvn.standard, premium: p.slipCost.bvn.premium },
    },
    markup: Object.fromEntries(BILL_KINDS.map((k) => [k, { percent: p.markup[k].percent, flat: p.markup[k].flat }])) as PricingSettings["markup"],
  };
  return { ok: true, value };
}

export function validateServices(input: unknown): { ok: true; value: ServiceFlags } | { ok: false; error: string } {
  const s = input as Record<string, unknown>;
  const keys = Object.keys(DEFAULT_SERVICES) as (keyof ServiceFlags)[];
  for (const k of keys) if (typeof s?.[k] !== "boolean") return { ok: false, error: `Service "${k}" must be on or off.` };
  return { ok: true, value: Object.fromEntries(keys.map((k) => [k, s[k] as boolean])) as unknown as ServiceFlags };
}

const PROVIDER_NAMES = ["ayglobal", "vtugate"];

export function validateProviders(input: unknown): { ok: true; value: ProviderSettings } | { ok: false; error: string } {
  const p = input as ProviderSettings;
  const validList = (l: unknown): l is string[] => Array.isArray(l) && l.every((x) => typeof x === "string" && PROVIDER_NAMES.includes(x));
  if (!validList(p?.disabled)) return { ok: false, error: "Disabled providers must be a list of known providers." };
  if (p.order !== null && !(validList(p.order) && new Set(p.order).size === p.order.length)) return { ok: false, error: "Provider order must list each known provider at most once." };
  // Older saved settings (and callers that only change the order) don't carry the alert level: keep the default.
  const alert = p.lowBalanceAlert === undefined ? DEFAULT_PROVIDERS.lowBalanceAlert : p.lowBalanceAlert;
  if (!isMoney(alert, 10_000_000)) return { ok: false, error: "The low-balance alert must be between ₦0 and ₦10,000,000." };
  return { ok: true, value: { order: p.order, disabled: [...new Set(p.disabled)], lowBalanceAlert: alert } };
}

/** Deep-merges stored settings over the defaults, so a missing field never breaks pricing. */
export function withDefaults<T extends object>(defaults: T, stored: unknown): T {
  if (!stored || typeof stored !== "object") return defaults;
  const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
    const d = (defaults as Record<string, unknown>)[k];
    out[k] = d && typeof d === "object" && !Array.isArray(d) && v && typeof v === "object" ? withDefaults(d as object, v) : (v ?? d);
  }
  return out as T;
}
