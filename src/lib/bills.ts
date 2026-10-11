import "server-only";
import { randomBytes } from "crypto";
import { pool } from "./pg";
import { getAccount } from "./db";
import { enabledProviders, getProvider, providerAllowed } from "./bill-providers";
import { getSettings } from "./settings";
import { chargeFor } from "./pricing";
import {
  ProviderUnavailableError,
  type BillKind,
  type BillProvider,
  type PayOutcome,
  type Plan,
  type ProviderName,
} from "./bill-providers/types";

export type { BillKind };

export class BillError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface BillResult {
  status: "successful" | "pending" | "failed";
  reference: string;
  message: string;
  /** Prepaid electricity token / PIN, when the provider returns one. */
  token?: string;
  units?: string;
  provider?: ProviderName;
  /** What the customer was charged (provider price plus any markup). */
  chargedNaira?: number;
  balance?: number;
}

/** 0803… from 0803… / +234803… / 234803…; null if it isn't a Nigerian mobile number. */
export function normalizeLocalMsisdn(input: string): string | null {
  const v = input.replace(/[\s-]/g, "");
  if (/^0\d{10}$/.test(v)) return v;
  if (/^\+234\d{10}$/.test(v)) return `0${v.slice(4)}`;
  if (/^234\d{10}$/.test(v)) return `0${v.slice(3)}`;
  return null;
}

const KIND_LABEL: Record<BillKind, string> = {
  airtime: "Airtime",
  data: "Data",
  electricity: "Electricity",
  cable: "Cable TV",
};

// Our own unique reference (max 20 chars, which also satisfies Interswitch).
function makeReference() {
  return `TD${Date.now().toString(36)}${randomBytes(4).toString("hex")}`.toUpperCase().slice(0, 20);
}

interface SettleDetails {
  provider?: ProviderName;
  providerRef?: string;
  result?: unknown;
}

/** Moves a pending ledger row to its final state, once. A failed payment is refunded in the same transaction. */
export async function settle(reference: string, outcome: "successful" | "failed", d: SettleDetails): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const row = (
      await client.query(
        `update public.ledger_entries
           set status = $2,
               provider = coalesce($3, provider),
               provider_ref = coalesce($4, provider_ref),
               result = coalesce($5::jsonb, result)
         where reference = $1 and status = 'pending'
         returning user_id, amount, label`,
        [reference, outcome, d.provider ?? null, d.providerRef ?? null, d.result === undefined ? null : JSON.stringify(d.result)]
      )
    ).rows[0];

    if (row && outcome === "failed") {
      await client.query(`update public.wallets set balance = balance + $2 where user_id = $1`, [row.user_id, row.amount]);
      await client.query(
        `insert into public.ledger_entries (user_id, label, detail, amount, direction, status)
         values ($1, $2, $3, $4, 'credit', 'successful')`,
        [row.user_id, `Refund: ${row.label}`, `Reference ${reference}`, row.amount]
      );
    }
    await client.query("commit");
    return Boolean(row);
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Records which provider holds a payment whose outcome is still unknown, so it can be re-checked later. */
async function markPending(reference: string, provider: ProviderName, providerRef: string | undefined, raw: unknown) {
  await pool.query(
    `update public.ledger_entries
        set provider = $2, provider_ref = coalesce($3, provider_ref), result = $4::jsonb
      where reference = $1 and status = 'pending'`,
    [reference, provider, providerRef ?? null, JSON.stringify({ raw })]
  );
}

async function currentBalance(userId: string) {
  const r = await pool.query(`select balance from public.wallets where user_id = $1`, [userId]);
  return Number(r.rows[0]?.balance ?? 0);
}

export interface PayRequest {
  email: string;
  kind: BillKind;
  network: string;
  variant?: string;
  /** Required for data and cable: plan codes only mean something to the provider that issued them. */
  provider?: string;
  planCode?: string;
  /** Phone to recharge, meter number, or smartcard number. */
  customerId: string;
  /** Contact phone (electricity / cable). */
  phone?: string;
  /** Airtime / electricity only: data and cable are priced by the plan. */
  amountNaira?: number;
  /** The total the customer saw on screen. If the price changed meanwhile, the purchase is refused, not charged. */
  expectedChargeNaira?: unknown;
}

export async function payBill(req: PayRequest): Promise<BillResult> {
  const { kind } = req;
  const settings = await getSettings();
  if (!settings.services[kind]) throw new BillError("This service is temporarily unavailable.", 503);
  const network = String(req.network ?? "").toLowerCase();
  const variant = req.variant ? String(req.variant).toLowerCase() : undefined;

  if (!/^[a-z0-9]{2,20}$/.test(network)) throw new BillError("Invalid network or provider.");
  if (variant && !/^[a-z0-9_]{1,20}$/.test(variant)) throw new BillError("Invalid plan type.");
  if (req.planCode && !/^[A-Za-z0-9._-]{1,60}$/.test(req.planCode)) throw new BillError("Invalid plan.");

  // --- who to pay -----------------------------------------------------------------------------
  let customerId: string;
  let phone: string;
  if (kind === "airtime" || kind === "data") {
    const p = normalizeLocalMsisdn(req.customerId ?? "");
    if (!p) throw new BillError("Enter a valid Nigerian phone number (e.g. 0803 123 4567).");
    customerId = phone = p;
  } else {
    customerId = String(req.customerId ?? "").replace(/[\s-]/g, "");
    if (!/^\d{6,20}$/.test(customerId)) {
      throw new BillError(kind === "electricity" ? "Enter a valid meter number." : "Enter a valid smartcard number.");
    }
    const p = normalizeLocalMsisdn(req.phone ?? "");
    if (!p) throw new BillError("Enter a valid contact phone number.");
    phone = p;
  }

  // --- which providers -------------------------------------------------------------------------
  let candidates: BillProvider[];
  if (kind === "data" || kind === "cable") {
    const only = getProvider(req.provider);
    if (!only) throw new BillError("Choose a provider for this purchase.");
    if (!(await providerAllowed(only)) || !only.supports(kind)) throw new BillError("That provider isn't available right now.", 503);
    candidates = [only];
  } else {
    candidates = await enabledProviders(kind);
    if (req.provider) candidates = candidates.filter((p) => p.name === req.provider);
  }
  if (candidates.length === 0) throw new BillError("Bill payments are not available yet.", 503);

  // --- price and validation (before any money moves) -------------------------------------------
  let amountNaira: number;
  let planName: string | undefined;
  const product = { kind, network, variant };

  if (kind === "data") {
    if (!req.planCode) throw new BillError("Choose a data plan.");
    const plans: Plan[] = await candidates[0].plans(product);
    const plan = plans.find((p) => p.code === req.planCode);
    if (!plan) throw new BillError("That data plan is not available.");
    amountNaira = plan.priceNaira;
    planName = plan.name;
  } else if (kind === "cable") {
    if (!req.planCode) throw new BillError("Choose a package.");
    const v = await candidates[0].validate({ ...product, customerId, phone });
    if (!v.valid) throw new BillError("We couldn't verify that smartcard number. Check it and try again.");
    const plan = v.plans?.find((p) => p.code === req.planCode);
    if (!plan) throw new BillError("That package is not available for this smartcard.");
    amountNaira = plan.priceNaira;
    planName = plan.name;
  } else {
    amountNaira = Number(req.amountNaira);
    if (!Number.isFinite(amountNaira) || amountNaira < 50 || amountNaira > 1_000_000) {
      throw new BillError("Enter an amount between ₦50 and ₦1,000,000.");
    }
    if (Math.abs(amountNaira * 100 - Math.round(amountNaira * 100)) > 1e-6) {
      throw new BillError("Amount can have at most two decimal places.");
    }
    if (kind === "electricity") {
      let checked = false;
      let unavailable: unknown = null;
      for (const p of candidates) {
        try {
          const v = await p.validate({ ...product, customerId, phone });
          if (v.valid) {
            checked = true;
            break;
          }
        } catch (err) {
          if (err instanceof ProviderUnavailableError) unavailable = err;
          else throw err;
        }
      }
      if (!checked) {
        if (unavailable) throw unavailable;
        throw new BillError("We couldn't verify that meter number. Check it and try again.");
      }
    }
  }
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) throw new BillError("Invalid amount.");

  // What the customer pays: the provider price plus the admin-set markup. The provider is paid the provider price.
  const chargeNaira = chargeFor(amountNaira, settings.pricing.markup[kind]);
  if (req.expectedChargeNaira !== undefined && Number(req.expectedChargeNaira) !== chargeNaira) {
    throw new BillError("The price has changed. Please review the new total and try again.", 409);
  }

  // --- take the money, atomically --------------------------------------------------------------
  const account = await getAccount(req.email);
  const reference = makeReference();
  const label = `${KIND_LABEL[kind]} – ${network.toUpperCase()}${planName ? ` ${planName}` : ""}`.slice(0, 120);

  const client = await pool.connect();
  try {
    await client.query("begin");
    const debited = await client.query(
      `update public.wallets set balance = balance - $2 where id = $1 and balance >= $2 returning balance`,
      [account.walletId, chargeNaira]
    );
    if (debited.rowCount === 0) {
      await client.query("rollback");
      throw new BillError("Insufficient wallet balance.");
    }
    await client.query(
      `insert into public.ledger_entries (user_id, label, detail, amount, direction, status, reference, cost_amount)
       values ($1, $2, $3, $4, 'debit', 'pending', $5, $6)`,
      [account.userId, label, `${KIND_LABEL[kind]} · ${customerId}`, chargeNaira, reference, amountNaira]
    );
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  // --- deliver: try providers in order, but only move on after a DEFINITE failure ---------------
  let lastReason = "The payment could not be completed.";
  for (const provider of candidates) {
    let outcome: PayOutcome;
    try {
      outcome = await provider.pay({
        ...product,
        planCode: req.planCode,
        planName,
        customerId,
        phone,
        amountNaira,
        reference,
      });
    } catch (err) {
      // Timeout or an unexpected error: it may have been processed. Keep it pending and stop here,
      // because trying another provider could deliver twice.
      const raw = { error: err instanceof Error ? err.message : String(err) };
      console.error(`[bills] ${provider.name} outcome unknown for ${reference}:`, raw.error);
      await markPending(reference, provider.name, undefined, raw);
      return {
        status: "pending",
        reference,
        provider: provider.name,
        message: "Your payment is being processed. We'll update it shortly.",
        chargedNaira: chargeNaira,
        balance: await currentBalance(account.userId),
      };
    }

    if (outcome.state === "success") {
      await settle(reference, "successful", {
        provider: provider.name,
        providerRef: outcome.providerRef,
        result: { token: outcome.token, units: outcome.units, raw: outcome.raw },
      });
      return {
        status: "successful",
        reference,
        provider: provider.name,
        message: "Payment successful.",
        token: outcome.token,
        units: outcome.units,
        chargedNaira: chargeNaira,
        balance: await currentBalance(account.userId),
      };
    }

    if (outcome.state === "pending") {
      await markPending(reference, provider.name, outcome.providerRef, outcome.raw);
      return {
        status: "pending",
        reference,
        provider: provider.name,
        message: "Your payment is being processed. We'll update it shortly.",
        chargedNaira: chargeNaira,
        balance: await currentBalance(account.userId),
      };
    }

    lastReason = outcome.reason;
    console.error(`[bills] ${provider.name} declined ${reference}: ${outcome.reason}`);
  }

  // Every provider definitely failed: refund.
  await settle(reference, "failed", { result: { reason: lastReason } });
  return {
    status: "failed",
    reference,
    message: "The payment could not be completed. Your wallet has been refunded.",
    chargedNaira: chargeNaira,
    balance: await currentBalance(account.userId),
  };
}

/** Re-checks a pending payment with the provider that holds it, and settles/refunds it if there is an answer. */
export async function refreshPayment(email: string, reference: string): Promise<BillResult> {
  const account = await getAccount(email);
  const row = (
    await pool.query(
      `select status, created_at, provider, provider_ref, result
         from public.ledger_entries where reference = $1 and user_id = $2`,
      [reference, account.userId]
    )
  ).rows[0];
  if (!row) throw new BillError("Payment not found.", 404);

  let status: BillResult["status"] = row.status;

  if (row.status === "pending") {
    const provider = getProvider(row.provider);
    if (provider && provider.isEnabled()) {
      const s = await provider.status({
        reference,
        providerRef: row.provider_ref ?? undefined,
        createdAt: new Date(row.created_at),
      });
      if (s === "success") {
        await settle(reference, "successful", { provider: provider.name });
        status = "successful";
      } else if (s === "failed") {
        await settle(reference, "failed", { provider: provider.name });
        status = "failed";
      } else if (
        s === "unknown" &&
        provider.refundUnknownAfterMs &&
        Date.now() - new Date(row.created_at).getTime() > provider.refundUnknownAfterMs
      ) {
        await settle(reference, "failed", { provider: provider.name, result: { reason: "No record at provider" } });
        status = "failed";
      }
    }
  }

  const stored = (await pool.query(`select result from public.ledger_entries where reference = $1`, [reference])).rows[0]?.result;
  return {
    status,
    reference,
    provider: (row.provider as ProviderName) ?? undefined,
    message:
      status === "successful"
        ? "Payment successful."
        : status === "failed"
          ? "The payment could not be completed. Your wallet has been refunded."
          : "Your payment is still being processed.",
    token: stored?.token || undefined,
    units: stored?.units || undefined,
    balance: await currentBalance(account.userId),
  };
}
