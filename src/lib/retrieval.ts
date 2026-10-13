import "server-only";
import { randomBytes } from "crypto";
import { pool } from "./pg";
import { getAccount } from "./db";
import { settle } from "./bills";
import { searchBvnByPhone, searchNinByPhone, searchNinByTracking, CheckMyNinBvnError } from "./checkmyninbvn";

export class RetrievalError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export type RetrievalType = "bvn_phone" | "nin_phone" | "nin_tracking";

const RETRIEVAL_CONFIG: Record<RetrievalType, { label: string; price: number; cost: number }> = {
  bvn_phone: { label: "BVN phone search", price: 300, cost: 150 },
  nin_phone: { label: "NIN phone search", price: 350, cost: 200 },
  nin_tracking: { label: "NIN tracking search", price: 350, cost: 200 },
};

function makeReference() {
  return `TDR${Date.now().toString(36)}${randomBytes(4).toString("hex")}`.toUpperCase().slice(0, 20);
}

const mask = (n: string) => `•••••••${n.slice(-4)}`;

export async function retrieveIdentity(input: {
  email: string;
  type: RetrievalType;
  query: string;
  consent: boolean;
}) {
  const cfg = RETRIEVAL_CONFIG[input.type];
  if (!cfg) throw new RetrievalError("Invalid retrieval type.");
  if (input.consent !== true) throw new RetrievalError("You must confirm the customer's consent.");

  const cleanQuery = input.query.trim();
  if (!cleanQuery) throw new RetrievalError("Please provide a phone number or tracking ID.");

  const account = await getAccount(input.email);
  const reference = makeReference();
  const maskedQuery = mask(cleanQuery);

  // 1. Debit wallet atomically
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [`retrieval:${account.userId}`]);

    const debited = await client.query(
      `update public.wallets set balance = balance - $2 where id = $1 and balance >= $2 returning balance`,
      [account.walletId, cfg.price]
    );
    if (debited.rowCount === 0) {
      await client.query("rollback");
      throw new RetrievalError("Insufficient wallet balance.", 402);
    }

    await client.query(
      `insert into public.ledger_entries (user_id, label, detail, amount, direction, status, reference, cost_amount, provider)
       values ($1, $2, $3, $4, 'debit', 'pending', $5, $6, 'checkmyninbvn')`,
      [account.userId, cfg.label, maskedQuery, cfg.price, reference, cfg.cost]
    );

    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  // 2. Call CheckMyNINBVN provider
  try {
    let result: any;
    if (input.type === "bvn_phone") {
      result = await searchBvnByPhone(cleanQuery);
    } else if (input.type === "nin_phone") {
      result = await searchNinByPhone(cleanQuery);
    } else {
      result = await searchNinByTracking(cleanQuery);
    }

    const data = result?.data;
    if (!data) {
      await settle(reference, "failed", { provider: "checkmyninbvn" });
      throw new RetrievalError("No record found. You were not charged.", 404);
    }

    const providerRef = result?.reportID ? String(result.reportID) : undefined;
    await settle(reference, "successful", { provider: "checkmyninbvn", providerRef, result: { found: true } });

    // Also record in verification_records for auditing
    const subjectName = [data.firstname, data.middlename, data.surname || data.lastname].filter(Boolean).join(" ");
    await pool.query(
      `insert into public.verification_records (user_id, type, queried, subject_name, status, cost, consent, reference, kind)
       values ($1, $2, $3, $4, 'successful', $5, true, $6, 'retrieval')`,
      [account.userId, input.type.includes("bvn") ? "BVN" : "NIN", maskedQuery, subjectName || null, cfg.price, reference]
    ).catch(() => {});

    return {
      reference,
      type: input.type,
      data,
      costNaira: cfg.price,
    };
  } catch (err) {
    await settle(reference, "failed", { provider: "checkmyninbvn" }).catch(() => {});
    if (err instanceof CheckMyNinBvnError) {
      throw new RetrievalError(err.message, err.status);
    }
    if (err instanceof RetrievalError) {
      throw err;
    }
    throw new RetrievalError("Retrieval failed. You were refunded in full.", 500);
  }
}
