import "server-only";
import { randomBytes } from "crypto";
import { pool } from "./pg";
import { getAccount } from "./db";
import { settle } from "./bills";
import { submitCacRegistration, AyGlobalServiceError, type CacSubmitInput } from "./ayglobal-cac";

export class CacError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const CAC_PRICING: Record<CacSubmitInput["type"], { label: string; price: number; cost: number }> = {
  business_name: { label: "CAC Business Name Registration", price: 18000, cost: 15000 },
  company_1m: { label: "CAC Company Registration (1M Share)", price: 45000, cost: 40000 },
  ngo: { label: "CAC NGO / Incorporated Trustees", price: 85000, cost: 75000 },
};

function makeReference() {
  return `TDCAC${Date.now().toString(36)}${randomBytes(4).toString("hex")}`.toUpperCase().slice(0, 20);
}

export async function orderCacRegistration(email: string, input: CacSubmitInput) {
  const cfg = CAC_PRICING[input.type];
  if (!cfg) throw new CacError("Invalid CAC registration category.");

  if (!input.ownerFullname.trim()) {
    throw new CacError("Owner / Director full name is required.");
  }
  if (!input.passportBlob || input.passportBlob.size === 0) {
    throw new CacError("A valid passport photograph file is required.");
  }

  const account = await getAccount(email);
  const reference = makeReference();

  // 1. Atomic wallet debit
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [`cac:${account.userId}`]);

    const debited = await client.query(
      `update public.wallets set balance = balance - $2 where id = $1 and balance >= $2 returning balance`,
      [account.walletId, cfg.price]
    );
    if (debited.rowCount === 0) {
      await client.query("rollback");
      throw new CacError("Insufficient wallet balance for CAC registration.", 402);
    }

    await client.query(
      `insert into public.ledger_entries (user_id, label, detail, amount, direction, status, reference, cost_amount, provider)
       values ($1, $2, $3, $4, 'debit', 'pending', $5, $6, 'ayglobal')`,
      [account.userId, cfg.label, input.ownerFullname, cfg.price, reference, cfg.cost]
    );

    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  // 2. Submit to AYGlobalData
  try {
    const res = await submitCacRegistration(input);
    const providerRef = res?.transaction_ref || res?.ref;

    await settle(reference, "successful", {
      provider: "ayglobal",
      providerRef: providerRef ? String(providerRef) : undefined,
      result: res,
    });

    return {
      reference,
      status: "successful",
      message: res?.message || "CAC registration order submitted successfully.",
      costNaira: cfg.price,
    };
  } catch (err) {
    await settle(reference, "failed", { provider: "ayglobal" }).catch(() => {});
    if (err instanceof AyGlobalServiceError) {
      throw new CacError(err.message, err.status);
    }
    throw new CacError("CAC submission failed. Your wallet was refunded.", 500);
  }
}
