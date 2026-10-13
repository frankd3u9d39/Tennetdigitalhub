// Provider-neutral model for bill payments. Each provider (AYGlobalData, VTUGate, …) is an adapter
// that translates these types to its own API, so the rest of the app never sees provider IDs.

export type BillKind = "airtime" | "data" | "electricity" | "cable";
export type BillProviderName = "ayglobal" | "vtugate";
export type ProviderName = BillProviderName | "checkmyninbvn" | "admin";

export interface Plan {
  /** Provider-scoped plan code: only valid with the provider that returned it. */
  code: string;
  name: string;
  priceNaira: number;
}

export interface NetworkOption {
  /** Lower-case slug, e.g. "mtn", "ibadan", "dstv". */
  network: string;
  label: string;
  /** Data only: the plan family, e.g. "sme", "gifting". */
  variants?: string[];
}

export interface ProductRef {
  kind: BillKind;
  network: string;
  variant?: string;
}

export interface ValidateInput extends ProductRef {
  customerId: string;
  /** Contact phone (required by some providers for electricity/cable). */
  phone: string;
}

export interface ValidateResult {
  valid: boolean;
  name?: string;
  /** Cable: the bouquets available for this smartcard. */
  plans?: Plan[];
}

export interface PayInput extends ProductRef {
  planCode?: string;
  planName?: string;
  /** Phone to recharge, meter number, or smartcard number. */
  customerId: string;
  phone: string;
  amountNaira: number;
  /** Our unique reference (max 20 chars). */
  reference: string;
}

/**
 * - success: the provider confirmed delivery.
 * - failed:  the provider definitely did NOT deliver, so it is safe to refund or try another provider.
 * - pending: the outcome is unknown. Never refund, never retry elsewhere: it may still go through.
 */
export type PayOutcome =
  | { state: "success"; providerRef?: string; token?: string; units?: string; raw: unknown }
  | { state: "failed"; reason: string; raw: unknown }
  | { state: "pending"; providerRef?: string; raw: unknown };

export type StatusOutcome = "success" | "failed" | "pending" | "unknown";

export interface StatusLookup {
  reference: string;
  providerRef?: string;
  createdAt: Date;
}

export interface BillProvider {
  name: ProviderName;
  /** Configured (keys present) and not switched off. */
  isEnabled(): boolean;
  supports(kind: BillKind): boolean;
  networks(kind: BillKind): Promise<NetworkOption[]>;
  /** Data bundles. */
  plans(product: ProductRef): Promise<Plan[]>;
  /** Electricity meters and cable smartcards. */
  validate(input: ValidateInput): Promise<ValidateResult>;
  pay(input: PayInput): Promise<PayOutcome>;
  status(lookup: StatusLookup): Promise<StatusOutcome>;
  /**
   * If the provider has no record of a payment this long after we sent it, it never arrived and the
   * payment can be refunded. Leave undefined to never auto-refund an unknown payment (manual review).
   */
  refundUnknownAfterMs?: number;
}

/** The provider could not be reached or answered with something unusable (catalogue / validation calls). */
export class ProviderUnavailableError extends Error {}

/** A payment request timed out or hit a network error: it may or may not have been processed. */
export class ProviderUnknownOutcomeError extends Error {}
