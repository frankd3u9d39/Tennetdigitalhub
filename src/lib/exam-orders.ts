import "server-only";
import { randomBytes } from "crypto";
import { pool } from "./pg";
import { getAccount } from "./db";
import { settle } from "./bills";
import { buyExamPin, AyGlobalServiceError, type ExamPinInput } from "./ayglobal-cac";

export class ExamError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const EXAM_PRICES: Record<number, { name: string; price: number; cost: number }> = {
  1: { name: "WAEC Result Checker PIN", price: 3900, cost: 3600 },
  2: { name: "NECO Result Token", price: 1500, cost: 1200 },
  3: { name: "NABTEB Scratch Card", price: 1500, cost: 1200 },
};

function makeReference() {
  return `TDEX${Date.now().toString(36)}${randomBytes(4).toString("hex")}`.toUpperCase().slice(0, 20);
}

export async function orderExamPin(email: string, providerId: 1 | 2 | 3, quantity = 1) {
  const cfg = EXAM_PRICES[providerId];
  if (!cfg) throw new ExamError("Invalid exam body selected.");
  const totalAmount = cfg.price * quantity;
  const totalCost = cfg.cost * quantity;

  const account = await getAccount(email);
  const reference = makeReference();

  // 1. Atomic debit
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [`exam:${account.userId}`]);

    const debited = await client.query(
      `update public.wallets set balance = balance - $2 where id = $1 and balance >= $2 returning balance`,
      [account.walletId, totalAmount]
    );
    if (debited.rowCount === 0) {
      await client.query("rollback");
      throw new ExamError("Insufficient wallet balance.", 402);
    }

    await client.query(
      `insert into public.ledger_entries (user_id, label, detail, amount, direction, status, reference, cost_amount, provider)
       values ($1, $2, $3, $4, 'debit', 'pending', $5, $6, 'ayglobal')`,
      [account.userId, cfg.name, `Quantity: ${quantity}`, totalAmount, reference, totalCost]
    );

    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  // 2. Call AYGlobalData
  try {
    const res = await buyExamPin({
      provider: providerId,
      quantity,
      ref: reference,
    });

    const pin = res?.pin;
    await settle(reference, "successful", {
      provider: "ayglobal",
      providerRef: reference,
      result: res,
    });

    return {
      reference,
      pin,
      exam: cfg.name,
      amountPaid: totalAmount,
      status: "successful",
    };
  } catch (err) {
    await settle(reference, "failed", { provider: "ayglobal" }).catch(() => {});
    if (err instanceof AyGlobalServiceError) {
      throw new ExamError(err.message, err.status);
    }
    throw new ExamError("Exam PIN purchase failed. Your wallet was refunded.", 500);
  }
}
