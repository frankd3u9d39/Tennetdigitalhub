import "server-only";
import { randomBytes } from "crypto";
import { pool } from "./pg";
import { getAccount } from "./db";
import { settle } from "./bills";
import {
  submitNinModificationOrder,
  checkNinModificationOrderStatus,
  CheckMyNinBvnError,
  type NinModificationType,
  type NinModificationInput,
} from "./checkmyninbvn";

export class ModificationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const MODIFICATION_PRICING: Record<NinModificationType, { label: string; price: number; cost: number }> = {
  nin_validation: { label: "NIN validation", price: 6500, cost: 6000 },
  nin_name_modification: { label: "NIN name correction", price: 17500, cost: 16000 },
  nin_phone_modification: { label: "NIN phone update", price: 17500, cost: 16000 },
  nin_address_modification: { label: "NIN address update", price: 17500, cost: 16000 },
};

function makeReference() {
  return `TDM${Date.now().toString(36)}${randomBytes(4).toString("hex")}`.toUpperCase().slice(0, 20);
}

const mask = (n: string) => (n.length > 4 ? `•••••••${n.slice(-4)}` : n);

export async function orderNinModification(email: string, input: NinModificationInput & { consent: boolean }) {
  const cfg = MODIFICATION_PRICING[input.service_type];
  if (!cfg) throw new ModificationError("Invalid modification service type.");
  if (input.consent !== true) throw new ModificationError("You must confirm the customer's consent.");

  const ninTarget = (input.nin || input.nin_digits || "").trim();
  if (!ninTarget) throw new ModificationError("NIN is required.");

  const account = await getAccount(email);
  const reference = makeReference();
  const maskedNin = mask(ninTarget);

  // 1. Atomic wallet debit
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [`modification:${account.userId}`]);

    const debited = await client.query(
      `update public.wallets set balance = balance - $2 where id = $1 and balance >= $2 returning balance`,
      [account.walletId, cfg.price]
    );
    if (debited.rowCount === 0) {
      await client.query("rollback");
      throw new ModificationError("Insufficient wallet balance.", 402);
    }

    await client.query(
      `insert into public.ledger_entries (user_id, label, detail, amount, direction, status, reference, cost_amount, provider)
       values ($1, $2, $3, $4, 'debit', 'pending', $5, $6, 'checkmyninbvn')`,
      [account.userId, cfg.label, maskedNin, cfg.price, reference, cfg.cost]
    );

    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  // 2. Submit order to CheckMyNINBVN
  try {
    const res = await submitNinModificationOrder(input);
    const orderData = res?.data;
    const providerRef = orderData?.reference_id || res?.reportID;

    // Successful order submission -> move ledger to successful (order is placed with provider)
    await settle(reference, "successful", {
      provider: "checkmyninbvn",
      providerRef: String(providerRef),
      result: orderData,
    });

    // Save audit record
    await pool.query(
      `insert into public.verification_records (user_id, type, queried, subject_name, status, cost, consent, reference, kind)
       values ($1, 'NIN', $2, $3, 'successful', $4, true, $5, 'modification')`,
      [account.userId, maskedNin, [input.surname, input.firstname].filter(Boolean).join(" ") || null, cfg.price, reference]
    ).catch(() => {});

    return {
      reference,
      providerRef: String(providerRef),
      orderId: orderData?.order_id,
      status: orderData?.status || "pending",
      message: res?.message || "Order submitted successfully.",
      costNaira: cfg.price,
    };
  } catch (err) {
    await settle(reference, "failed", { provider: "checkmyninbvn" }).catch(() => {});
    if (err instanceof CheckMyNinBvnError) {
      throw new ModificationError(err.message, err.status);
    }
    throw new ModificationError("Order submission failed. Your wallet was refunded.", 500);
  }
}

export async function pollModificationStatus(referenceId: string) {
  try {
    const res = await checkNinModificationOrderStatus(referenceId);
    return res?.data || res;
  } catch (err) {
    if (err instanceof CheckMyNinBvnError) {
      throw new ModificationError(err.message, err.status);
    }
    throw new ModificationError("Unable to retrieve order status.", 500);
  }
}
